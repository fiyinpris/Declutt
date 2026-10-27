/*
 * POST /api/paystack-webhook — Paystack calls this for payments, transfers (seller payouts)
 * and refunds. Set it in Paystack → Settings → API Keys & Webhooks:
 *   https://<your-site>/api/paystack-webhook
 * Every call is checked against Paystack's signature before anything is changed.
 */
import {
  getDb,
  handle,
  markCheckoutPaid,
  readRawBody,
  settlePayout,
  validPaystackSignature,
} from "./_lib/server.js";

// We need the exact bytes Paystack signed
export const config = { api: { bodyParser: false } };

export default handle(["POST"], async (req, res) => {
  const raw = await readRawBody(req);
  if (!validPaystackSignature(raw, req.headers["x-paystack-signature"]))
    return res.status(401).json({ error: "Bad signature" });
  const event = JSON.parse(raw.toString("utf8"));
  const db = getDb();
  const data = event.data || {};

  if (event.event === "charge.success" && data.reference) {
    await markCheckoutPaid(db, data.reference).catch((e) => console.error("charge.success", e));
  }

  // Seller payouts: reference = payouts/{id}
  if (event.event === "transfer.success" && data.reference)
    await settlePayout(db, String(data.reference), true);
  if ((event.event === "transfer.failed" || event.event === "transfer.reversed") && data.reference)
    await settlePayout(db, String(data.reference), false, data.reason || event.event);

  // Refund finished
  if (event.event === "refund.processed" && data.transaction_reference) {
    const snap = await db
      .collection("orders")
      .where("checkoutId", "==", data.transaction_reference)
      .where("refundStatus", "==", "processing")
      .get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { refundStatus: "refunded" }));
    await batch.commit();
  }

  res.status(200).json({ received: true });
});
