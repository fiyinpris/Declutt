/*
 * /api/payouts-run — the daily money job.
 *   GET  from Vercel Cron every morning (sends "Authorization: Bearer <CRON_SECRET>")
 *   POST from the admin dashboard { payNow?: boolean }
 *
 *  1. Drops online orders whose payment never came through (after checking with Paystack)
 *  2. Counts shipped orders as delivered after `autoConfirmDays`
 *  3. Completes delivered orders once the return window has passed → the seller's money is "eligible"
 *  4. Pays sellers on the 5th business day after each calendar month closes (or now, if an admin
 *     asks): online sales − commission − fulfilment fee − fees owed on pay-on-delivery orders −
 *     penalties. A payout stays ON HOLD while the seller has no bank account, or the account
 *     name doesn't match their Declutt name and an admin hasn't approved it.
 */
import crypto from "node:crypto";
import {
  DAY,
  FieldValue,
  HttpError,
  Timestamp,
  getDb,
  handle,
  historyEntry,
  isAdmin,
  kobo,
  loadSettings,
  markCheckoutPaid,
  ms,
  paystack,
  requireUser,
  settlePayout,
} from "./_lib/server.js";

const HOUR = 3600 * 1000;
const STILL_PAYING = ["ongoing", "pending", "processing", "queued"];

/** Where we are in the Lagos calendar (WAT = UTC+1 all year). */
const cycleInfo = () => {
  const d = new Date(Date.now() + HOUR);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  let businessDay = 0;
  for (let day = 1; day <= d.getUTCDate(); day++) {
    const wd = new Date(Date.UTC(y, m, day)).getUTCDay();
    if (wd !== 0 && wd !== 6) businessDay++;
  }
  const prev = new Date(Date.UTC(y, m - 1, 1));
  return {
    // the calendar month being paid out
    key: `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`,
    businessDay,
    monthStart: Date.UTC(y, m, 1) - HOUR, // 00:00 Lagos on the 1st
  };
};

/** Writes [ref, data] updates in batches of 400. */
const commitAll = async (db, updates) => {
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    updates.slice(i, i + 400).forEach(([ref, data]) => batch.update(ref, data));
    await batch.commit();
  }
};

export default handle(["GET", "POST"], async (req, res) => {
  let payNow = false;
  let by = "cron";
  if (req.method === "GET") {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`)
      throw new HttpError(401, "Not allowed.");
  } else {
    const user = await requireUser(req);
    if (!(await isAdmin(user))) throw new HttpError(403, "Admins only.");
    payNow = req.body?.payNow === true;
    by = "admin";
  }

  const db = getDb();
  const settings = await loadSettings(db);
  const now = Timestamp.now();
  const report = { expired: 0, autoDelivered: 0, completed: 0, paid: 0, onHold: 0, failed: 0, payoutDue: false };

  /* 1 ── online checkouts that were never paid ── */
  const unpaid = await db.collection("checkouts").where("status", "in", ["pending", "abandoned", "failed"]).get();
  for (const c of unpaid.docs) {
    const age = Date.now() - ms(c.data().createdAt);
    if (c.data().paymentMethod !== "online" || age < HOUR) continue;
    let result;
    try {
      result = await markCheckoutPaid(db, c.id);
    } catch {
      continue; // Paystack unreachable — try again tomorrow
    }
    if (result.status === "paid") continue;
    if (STILL_PAYING.includes(result.status) && age < DAY) continue;
    const orders = await Promise.all((c.data().orderIds || []).map((id) => db.doc(`orders/${id}`).get()));
    await commitAll(db, [
      [c.ref, { status: "expired" }],
      ...orders
        .filter((o) => o.data()?.status === "pending_payment")
        .map((o) => [
          o.ref,
          {
            status: "cancelled",
            cancelledBy: "system",
            cancelReason: "Payment wasn't completed",
            cancelledAt: now,
            payoutStatus: "cancelled",
            updatedAt: now,
            history: FieldValue.arrayUnion(historyEntry("cancelled", "system", "Payment wasn't completed")),
          },
        ]),
    ]);
    report.expired++;
  }

  /* 2 ── shipped long enough ago → delivered ── */
  const shipped = await db.collection("orders").where("status", "==", "shipped").get();
  const delivering = shipped.docs.filter(
    (d) => ms(d.data().shippedAt) + settings.autoConfirmDays * DAY < Date.now(),
  );
  await commitAll(
    db,
    delivering.map((d) => [
      d.ref,
      {
        status: "delivered",
        deliveredAt: now,
        autoDelivered: true,
        updatedAt: now,
        history: FieldValue.arrayUnion(historyEntry("delivered", "system", "Confirmed automatically")),
      },
    ]),
  );
  report.autoDelivered = delivering.length;

  /* 3 ── return window over → completed (money released to the seller's balance) ── */
  const delivered = await db.collection("orders").where("status", "==", "delivered").get();
  const completing = delivered.docs.filter(
    (d) => ms(d.data().deliveredAt) + settings.returnWindowDays * DAY < Date.now(),
  );
  await commitAll(
    db,
    completing.map((d) => [
      d.ref,
      {
        status: "completed",
        completedAt: now,
        payoutStatus: d.data().paymentMethod === "online" ? "eligible" : "commission_owed",
        updatedAt: now,
        history: FieldValue.arrayUnion(historyEntry("completed", "system", "Return window closed")),
      },
    ]),
  );
  report.completed = completing.length;

  /* 4 ── payouts ── */
  const cycle = cycleInfo();
  const runRef = db.doc(`payoutRuns/${cycle.key}`);
  const due = payNow || (cycle.businessDay >= 5 && !(await runRef.get()).exists);
  report.payoutDue = due;
  if (due) {
    // the monthly run pays orders completed before this month began; "pay now" pays everything
    const inCycle = (d) => payNow || ms(d.data().completedAt) < cycle.monthStart;
    const [eligible, owed, penalties] = await Promise.all([
      db.collection("orders").where("payoutStatus", "==", "eligible").get(),
      db.collection("orders").where("payoutStatus", "==", "commission_owed").get(),
      db.collection("orders").where("penaltyStatus", "==", "owed").get(),
    ]);
    const sellers = new Map();
    const bucket = (uid) => {
      if (!sellers.has(uid)) sellers.set(uid, { sales: [], deductions: [] });
      return sellers.get(uid);
    };
    eligible.docs.filter(inCycle).forEach((d) => bucket(d.data().sellerUid).sales.push(d));
    owed.docs.filter(inCycle).forEach((d) =>
      bucket(d.data().sellerUid).deductions.push({
        kind: "pod",
        doc: d,
        amount: (Number(d.data().commission) || 0) + (Number(d.data().fulfilmentFee) || 0),
        at: ms(d.data().completedAt),
      }),
    );
    penalties.docs.forEach((d) =>
      bucket(d.data().sellerUid).deductions.push({
        kind: "penalty",
        doc: d,
        amount: Number(d.data().penalty) || 0,
        at: ms(d.data().updatedAt),
      }),
    );

    for (const [sellerUid, { sales, deductions }] of sellers) {
      const gross = sales.reduce((n, d) => n + (Number(d.data().total) || 0), 0);
      const commission = sales.reduce((n, d) => n + (Number(d.data().commission) || 0), 0);
      const fulfilment = sales.reduce((n, d) => n + (Number(d.data().fulfilmentFee) || 0), 0);
      let amount = sales.reduce((n, d) => n + (Number(d.data().sellerNet) || 0), 0);
      // take what's owed (oldest first) as far as this payout covers it; the rest waits
      const settled = [];
      deductions
        .sort((a, b) => a.at - b.at)
        .forEach((x) => {
          if (amount - x.amount >= 0) {
            amount -= x.amount;
            settled.push(x);
          }
        });
      if (!sales.length && !settled.length) continue;

      const [acctSnap, userSnap] = await Promise.all([
        db.doc(`sellerPayoutAccounts/${sellerUid}`).get(),
        db.doc(`users/${sellerUid}`).get(),
      ]);
      const acct = acctSnap.data();
      const sellerName = userSnap.data()?.name || sales[0]?.data().sellerName || "Seller";
      const holdRef = db.doc(`payouts/hold_${sellerUid}`);
      const hold =
        userSnap.data()?.suspended
          ? "Your account is under review, so payouts are paused."
          : amount > 0 && !acct?.recipientCode
            ? "Add your bank account in Payments to receive this payout."
            : amount > 0 && !acct.nameMatches && !acct.nameOverride
              ? `The name on your bank account (${acct.accountName}) doesn't match your Declutt name. Declutt is checking it.`
              : null;
      if (hold) {
        await holdRef.set({
          sellerUid,
          sellerName,
          status: "on_hold",
          reason: hold,
          amount,
          orderCount: sales.length,
          createdAt: now,
        });
        report.onHold++;
        continue;
      }

      const payoutId = `payout_${crypto.randomUUID().replace(/-/g, "")}`;
      const payoutRef = db.doc(`payouts/${payoutId}`);
      const podIds = settled.filter((x) => x.kind === "pod").map((x) => x.doc.id);
      const penaltyIds = settled.filter((x) => x.kind === "penalty").map((x) => x.doc.id);
      const deductionTotal = settled.reduce((n, x) => n + x.amount, 0);
      await commitAll(db, [
        ...sales.map((d) => [d.ref, { payoutStatus: "processing", payoutId }]),
        ...podIds.map((id) => [db.doc(`orders/${id}`), { payoutStatus: "processing", payoutId }]),
        ...penaltyIds.map((id) => [db.doc(`orders/${id}`), { penaltyStatus: "processing", penaltyPayoutId: payoutId }]),
      ]);
      await payoutRef.set({
        sellerUid,
        sellerName,
        cycle: payNow ? "manual" : cycle.key,
        gross,
        commission,
        fulfilmentFee: fulfilment,
        otherDeductions: deductionTotal, // fees on pay-on-delivery orders + penalties
        amount,
        orderIds: [...sales.map((d) => d.id), ...podIds],
        podOrderIds: podIds,
        penaltyOrderIds: penaltyIds,
        bankName: acct?.bankName || "",
        accountName: acct?.accountName || "",
        accountLast4: acct?.accountLast4 || "",
        status: "processing",
        createdBy: by,
        createdAt: now,
      });
      await holdRef.delete().catch(() => {});

      if (amount <= 0) {
        // fully offset by what the seller owed — nothing to send
        await settlePayout(db, payoutId, true);
        report.paid++;
        continue;
      }
      try {
        const transfer = await paystack("/transfer", {
          method: "POST",
          body: {
            source: "balance",
            amount: kobo(amount),
            recipient: acct.recipientCode,
            reference: payoutId,
            reason: `Declutt payout ${payNow ? "" : cycle.key}`.trim(),
          },
        });
        if (transfer.status === "success") await settlePayout(db, payoutId, true);
        else if (transfer.status === "otp")
          await settlePayout(db, payoutId, false, "Paystack is asking for an OTP — turn off OTP for transfers in Paystack settings.");
        else await payoutRef.update({ transferCode: transfer.transfer_code || null });
        report.paid++;
      } catch (e) {
        await settlePayout(db, payoutId, false, e.message);
        report.failed++;
      }
    }
    if (!payNow) await runRef.set({ ranAt: now, by, ...report });
  }

  res.status(200).json(report);
});
