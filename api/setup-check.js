/*
 * GET /api/setup-check — admin only. Confirms the Vercel settings actually work: the Firebase
 * server key (reads the database) and the Paystack secret key (a call Paystack only answers
 * for a valid key). Never returns the keys themselves.
 */
import { HttpError, handle, isAdmin, paystack, paystackKey, requireUser } from "./_lib/server.js";

export default handle(["GET"], async (req, res) => {
  const user = await requireUser(req);
  let admin = false;
  try {
    admin = await isAdmin(user);
  } catch (e) {
    console.error("setup-check firebase", e);
    return res.status(200).json({
      firebase: "the server key in FIREBASE_SERVICE_ACCOUNT doesn't work — paste the whole new key file again and redeploy.",
      paystack: "not checked",
      cron: !!process.env.CRON_SECRET,
    });
  }
  if (!admin) throw new HttpError(403, "Admins only.");

  const key = paystackKey();
  let status = "ok";
  if (key.startsWith("pk_")) {
    status = "that is the Public key — copy the Secret key (starts with sk_test_ or sk_live_) instead.";
  } else {
    try {
      await paystack("/balance");
    } catch (e) {
      status = e.message;
    }
  }
  res.status(200).json({
    firebase: "ok",
    paystack: status,
    mode: key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown",
    cron: !!process.env.CRON_SECRET,
  });
});
