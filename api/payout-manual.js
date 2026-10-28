/*
 * POST /api/payout-manual { sellerUid, preview?, amount?, reference? } — admin only.
 * For a Paystack Starter Business (no automatic Transfers): the admin pays a seller by bank
 * transfer, then records it here so the seller's orders and statement show it as paid.
 *   preview: true → the exact amount to send and the seller's bank details (nothing changes)
 *   amount        → must equal the current balance, so a balance that changed meanwhile is never
 *                   marked paid by mistake
 */
import {
  HttpError,
  getDb,
  handle,
  isAdmin,
  newPayoutId,
  recordPayout,
  requireUser,
  sellerBalances,
  settlePayout,
} from "./_lib/server.js";

export default handle(["POST"], async (req, res) => {
  const user = await requireUser(req);
  if (!(await isAdmin(user))) throw new HttpError(403, "Admins only.");
  const db = getDb();
  const body = req.body || {};
  const sellerUid = typeof body.sellerUid === "string" ? body.sellerUid.slice(0, 128) : "";
  if (!sellerUid) throw new HttpError(400, "Choose a seller.");

  const [balances, acctSnap, userSnap] = await Promise.all([
    sellerBalances(db),
    db.doc(`sellerPayoutAccounts/${sellerUid}`).get(),
    db.doc(`users/${sellerUid}`).get(),
  ]);
  const b = balances.get(sellerUid);
  if (!b || (b.amount <= 0 && !b.settled.length))
    throw new HttpError(409, "This seller has nothing to be paid right now.");
  const acct = acctSnap.data();
  const sellerName = userSnap.data()?.name || b.sales[0]?.data().sellerName || "Seller";
  const summary = {
    sellerName,
    amount: b.amount,
    gross: b.gross,
    commission: b.commission,
    fulfilmentFee: b.fulfilment,
    otherDeductions: b.deductionTotal,
    orderCount: b.sales.length,
    bank: acct
      ? {
          bankName: acct.bankName,
          accountName: acct.accountName,
          accountNumber: acct.accountNumber || null,
          accountLast4: acct.accountLast4,
          nameOk: !!(acct.nameMatches || acct.nameOverride),
        }
      : null,
  };
  if (body.preview === true) return res.status(200).json(summary);

  if (Number(body.amount) !== b.amount)
    throw new HttpError(409, "The seller's balance changed. Check the new amount before marking it paid.", { summary });
  if (b.amount > 0 && !acct) throw new HttpError(409, "This seller hasn't added a bank account yet.");
  if (b.amount > 0 && !summary.bank.nameOk)
    throw new HttpError(409, "Approve the seller's bank account name first (it doesn't match their Declutt name).");
  if (userSnap.data()?.suspended) throw new HttpError(409, "This seller is suspended, so payouts are paused.");

  const payoutId = newPayoutId();
  await recordPayout(db, payoutId, sellerUid, b, acct, {
    sellerName,
    cycle: "manual",
    method: "manual",
    reference: String(body.reference || "").trim().slice(0, 100),
    createdBy: user.uid,
  });
  await settlePayout(db, payoutId, true);
  await db.doc(`payouts/hold_${sellerUid}`).delete().catch(() => {});
  res.status(200).json({ ok: true, payoutId, amount: b.amount });
});
