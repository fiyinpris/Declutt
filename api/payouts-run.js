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
 *     With payoutMethod "manual" (Paystack Starter Business) no money is sent here — the admin
 *     pays each seller by bank transfer and records it (/api/payout-manual).
 */
import {
  DAY,
  FieldValue,
  HttpError,
  Timestamp,
  getDb,
  handle,
  historyEntry,
  isAdmin,
  commitUpdates,
  kobo,
  loadSettings,
  markCheckoutPaid,
  ms,
  newPayoutId,
  paystack,
  recordPayout,
  requireUser,
  sellerBalances,
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
  const report = { expired: 0, autoDelivered: 0, completed: 0, paid: 0, onHold: 0, failed: 0, manualDue: 0, payoutDue: false };

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
    await commitUpdates(db, [
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
  await commitUpdates(
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
  await commitUpdates(
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
  const automatic = settings.payoutMethod === "paystack";
  if (due) {
    // the monthly run pays orders completed before this month began; "pay now" pays everything
    const balances = await sellerBalances(db, payNow ? Infinity : cycle.monthStart);
    for (const [sellerUid, b] of balances) {
      if (!b.sales.length && !b.settled.length) continue;
      const [acctSnap, userSnap] = await Promise.all([
        db.doc(`sellerPayoutAccounts/${sellerUid}`).get(),
        db.doc(`users/${sellerUid}`).get(),
      ]);
      const acct = acctSnap.data();
      const sellerName = userSnap.data()?.name || b.sales[0]?.data().sellerName || "Seller";
      const holdRef = db.doc(`payouts/hold_${sellerUid}`);
      const hold =
        userSnap.data()?.suspended
          ? "Your account is under review, so payouts are paused."
          : b.amount > 0 && !acct
            ? "Add your bank account in Payments to receive this payout."
            : b.amount > 0 && !acct.nameMatches && !acct.nameOverride
              ? `The name on your bank account (${acct.accountName}) doesn't match your Declutt name. Declutt is checking it.`
              : b.amount > 0 && automatic && !acct.recipientCode
                ? "Please add your bank account again in Payments so Declutt can pay you."
                : null;
      if (hold) {
        await holdRef.set({
          sellerUid,
          sellerName,
          status: "on_hold",
          reason: hold,
          amount: b.amount,
          orderCount: b.sales.length,
          createdAt: now,
        });
        report.onHold++;
        continue;
      }
      await holdRef.delete().catch(() => {});
      if (!automatic && b.amount > 0) {
        // Paid by an admin with a bank transfer ("Mark as paid" in Admin → Payouts)
        report.manualDue++;
        continue;
      }

      const payoutId = newPayoutId();
      await recordPayout(db, payoutId, sellerUid, b, acct, {
        sellerName,
        cycle: payNow ? "early" : cycle.key,
        method: "paystack",
        createdBy: by,
      });
      if (b.amount <= 0) {
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
            amount: kobo(b.amount),
            recipient: acct.recipientCode,
            reference: payoutId,
            reason: `Declutt payout ${payNow ? "" : cycle.key}`.trim(),
          },
        });
        if (transfer.status === "success") await settlePayout(db, payoutId, true);
        else if (transfer.status === "otp")
          await settlePayout(db, payoutId, false, "Paystack is asking for an OTP — turn off OTP for transfers in Paystack settings.");
        else await db.doc(`payouts/${payoutId}`).update({ transferCode: transfer.transfer_code || null });
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
