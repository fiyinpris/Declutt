/*
 * GET /api/checkout-verify?reference=… — called by the "payment complete" page after Paystack
 * sends the buyer back. Confirms the payment with Paystack (never trusts the browser).
 */
import { HttpError, getDb, handle, markCheckoutPaid } from "./_lib/server.js";

export default handle(["GET"], async (req, res) => {
  const reference = String(req.query.reference || req.query.trxref || "").slice(0, 100);
  if (!reference) throw new HttpError(400, "Missing payment reference.");
  const result = await markCheckoutPaid(getDb(), reference);
  res.status(200).json(result);
});
