/*
 * POST /api/payout-account { bankCode, bankName, accountNumber } — a seller adds the bank
 * account their payouts go to. Paystack confirms the account and returns the account holder's
 * name; if it doesn't match the seller's name on Declutt, payouts stay ON HOLD until an admin
 * reviews it (like Jumia). Only the last 4 digits are stored on Declutt.
 */
import {
  HttpError,
  Timestamp,
  getDb,
  handle,
  namesMatch,
  paystack,
  requireUser,
} from "./_lib/server.js";

export default handle(["POST"], async (req, res) => {
  const user = await requireUser(req);
  const db = getDb();
  const profile = (await db.doc(`users/${user.uid}`).get()).data() || {};
  if (profile.role !== "seller" && profile.role !== "admin")
    throw new HttpError(403, "Only sellers can add a payout account.");

  const bankCode = String(req.body?.bankCode || "").trim();
  const bankName = String(req.body?.bankName || "").trim().slice(0, 80);
  const accountNumber = String(req.body?.accountNumber || "").replace(/\D/g, "");
  if (!bankCode) throw new HttpError(400, "Choose your bank.");
  if (accountNumber.length !== 10) throw new HttpError(400, "Account numbers are 10 digits.");

  let resolved;
  try {
    resolved = await paystack(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
    );
  } catch {
    throw new HttpError(400, "We couldn't find that account. Check the bank and account number.");
  }
  const accountName = resolved.account_name;
  const recipient = await paystack("/transferrecipient", {
    method: "POST",
    body: { type: "nuban", name: accountName, account_number: accountNumber, bank_code: bankCode, currency: "NGN" },
  });

  const record = {
    bankCode,
    bankName,
    accountLast4: accountNumber.slice(-4),
    accountName,
    sellerName: profile.name || "",
    nameMatches: namesMatch(profile.name, accountName),
    nameOverride: false, // an admin can approve a mismatch after checking
    recipientCode: recipient.recipient_code,
    verifiedAt: Timestamp.now(),
  };
  await db.doc(`sellerPayoutAccounts/${user.uid}`).set(record);
  const { recipientCode: _hidden, ...safe } = record;
  res.status(200).json(safe);
});
