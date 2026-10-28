/*
 * Shared server code for the Vercel functions in /api (files starting with "_" aren't routes).
 *
 * Secrets come ONLY from environment variables set in Vercel → Settings → Environment Variables:
 *   FIREBASE_SERVICE_ACCOUNT  service-account key JSON (or the same base64-encoded)
 *   PAYSTACK_SECRET_KEY       sk_test_… while testing, sk_live_… when live
 *   CRON_SECRET               any long random string (Vercel sends it to the daily payout job)
 *   APP_URL                   optional, e.g. https://declutt.vercel.app (payment return address)
 */
import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

export { FieldValue, Timestamp };

export const OWNER_EMAIL = "fiyinolaleke@gmail.com"; // same as src/utils/admin.js

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/* ── Firebase Admin (lazy, so a missing key gives a clear error instead of a crash) ── */
let cached;
const firebase = () => {
  if (cached) return cached;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError(503, "Checkout isn't set up yet (server key missing).");
  let app;
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    app = getApps()[0] || initializeApp({ credential: cert(JSON.parse(json)) });
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT", e.message);
    throw new HttpError(503, "Checkout isn't set up correctly yet (the Firebase server key isn't valid).");
  }
  cached = { db: getFirestore(app), auth: getAuth(app) };
  return cached;
};
export const getDb = () => firebase().db;

/* ── Requests ── */
export const handle = (methods, fn) => async (req, res) => {
  if (!methods.includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });
  try {
    await fn(req, res);
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    res.status(status).json({
      error: status >= 500 && !e.status ? "Something went wrong. Please try again." : e.message,
      ...(e.extra || {}),
    });
  }
};

/** The signed-in Firebase user (from "Authorization: Bearer <ID token>"). */
export const requireUser = async (req) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) throw new HttpError(401, "Please sign in first.");
  try {
    return await firebase().auth.verifyIdToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
};

export const isAdmin = async (decoded) => {
  if (decoded.email_verified && decoded.email?.toLowerCase() === OWNER_EMAIL) return true;
  const u = await getDb().doc(`users/${decoded.uid}`).get();
  return u.data()?.role === "admin";
};

export const appUrl = (req) =>
  (process.env.APP_URL ||
    `https://${req.headers["x-forwarded-host"] || req.headers.host}`).replace(/\/$/, "");

/* ── Paystack ── */
// Pasted keys sometimes pick up spaces, line breaks or quotes — ignore those
export const paystackKey = () =>
  (process.env.PAYSTACK_SECRET_KEY || "").trim().replace(/^["']+|["']+$/g, "").trim();

export const paystack = async (path, { method = "GET", body } = {}) => {
  const key = paystackKey();
  if (!key) throw new HttpError(503, "Online payments aren't set up yet.");
  const r = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 || /invalid key/i.test(data.message || ""))
    throw new HttpError(503, "Online payments aren't set up correctly yet (Paystack rejected the secret key).");
  if (!r.ok || data.status === false)
    throw new HttpError(r.status >= 500 ? 502 : 400, data.message || "The payment provider returned an error.");
  return data.data;
};

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export const validPaystackSignature = (rawBody, signature) => {
  const key = paystackKey();
  if (!key || !signature) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const readRawBody = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
};

/* ── Fees & policies (admin-editable in settings/fees; these are the defaults) ── */
export const DEFAULT_SETTINGS = {
  commission: { Furniture: 10, Appliances: 10, Electronics: 10 }, // % of item price
  deliveryFee: 0, // ₦, charged when the buyer chooses delivery (passed to the seller)
  fulfilmentFee: 0, // ₦ per order, the seller's shipping/fulfilment contribution to Declutt
  sellerCancelPenalty: 0, // ₦, when a seller cancels an order the buyer already paid for
  returnWindowDays: 7, // after delivery, before the seller's money is released
  autoConfirmDays: 7, // a shipped order counts as delivered after this many days
  payOnDelivery: true,
};
export const loadSettings = async (db) => {
  const s = (await db.doc("settings/fees").get()).data() || {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    commission: { ...DEFAULT_SETTINGS.commission, ...(s.commission || {}) },
  };
};

export const DAY = 24 * 3600 * 1000;
export const ms = (t) => (t?.toMillis ? t.toMillis() : 0);

/* ── Listings ── */
export const ALLOWED_CATEGORIES = ["Furniture", "Appliances", "Electronics"];
const ALIASES = {
  furniture: "Furniture", furnitures: "Furniture",
  appliance: "Appliances", appliances: "Appliances", "home appliances": "Appliances",
  electronic: "Electronics", electronics: "Electronics",
};
export const normalizeCategory = (c) => ALIASES[(c || "").trim().toLowerCase()] || null;
export const stockOf = (l) => (Number(l?.maxQuantity) > 0 ? Number(l.maxQuantity) : 1);
export const isBuyable = (l) =>
  !!l &&
  l.available !== false &&
  !!normalizeCategory(l.category) &&
  l.status !== "hidden" &&
  l.status !== "rejected";

/** Takes `qty` off a listing inside a transaction (sold out → no longer available). */
export const reserveListing = (t, listingSnap, qty) => {
  const l = listingSnap.data();
  const left = stockOf(l) - qty;
  t.update(listingSnap.ref, {
    ...(left > 0 ? { maxQuantity: left } : { available: false }),
    soldCount: FieldValue.increment(qty),
  });
};

/** Puts an order's items back on sale (after a cancellation). */
export const restoreListings = async (db, order) => {
  if (!order.reserved) return;
  await Promise.all(
    order.items.map(async (i) => {
      const ref = db.doc(`listings/${i.listingId}`);
      const s = await ref.get();
      if (!s.exists) return;
      const l = s.data();
      await ref.update(
        l.available === false
          ? { available: true, soldCount: FieldValue.increment(-i.qty) }
          : { maxQuantity: stockOf(l) + i.qty, soldCount: FieldValue.increment(-i.qty) },
      );
    }),
  );
};

/* ── Money ── */
export const kobo = (naira) => Math.round(Number(naira) * 100);

/** Refunds an online-paid order back to the buyer's payment method (Paystack). */
export const refundOrder = async (db, orderId) => {
  const ref = db.doc(`orders/${orderId}`);
  const o = (await ref.get()).data();
  if (!o || o.paymentStatus !== "paid") return false;
  try {
    await paystack("/refund", {
      method: "POST",
      body: { transaction: o.checkoutId, amount: kobo(o.total) },
    });
    await ref.update({
      paymentStatus: "refunded",
      refundStatus: "processing",
      refundedAt: Timestamp.now(),
      payoutStatus: "cancelled",
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (e) {
    await ref.update({ refundStatus: "failed", refundError: e.message, updatedAt: Timestamp.now() });
    throw e;
  }
};

/** One step in an order's timeline. */
export const historyEntry = (status, by, note) => ({
  status,
  by,
  at: Timestamp.now(),
  ...(note ? { note: String(note).slice(0, 300) } : {}),
});

/** Seller alert (shows in their bell / Notifications tab). `t` is a transaction or batch. */
export const notify = (t, db, data) =>
  t.set(db.collection("notifications").doc(), { ...data, read: false, createdAt: Timestamp.now() });

/** New-order alert for the seller. */
export const notifySeller = (t, db, order, orderId) =>
  notify(t, db, {
    type: "order",
    sellerUid: order.sellerUid,
    buyerName: order.buyerName,
    listingName: order.items.map((i) => i.name).join(", ").slice(0, 120),
    orderId,
  });

/**
 * Confirms an online payment with Paystack and moves its orders to "placed".
 * Safe to call more than once (the verify page and the webhook both call it).
 */
export const markCheckoutPaid = async (db, reference) => {
  const ref = db.doc(`checkouts/${reference}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "We couldn't find that payment.");
  const co = snap.data();
  if (co.status === "paid") return { status: "paid", orderIds: co.orderIds };

  const tx = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (tx.status !== "success") {
    if (["failed", "abandoned", "reversed"].includes(tx.status))
      await ref.update({ status: tx.status });
    return { status: tx.status || "pending", orderIds: co.orderIds };
  }
  if (tx.currency !== "NGN" || Number(tx.amount) !== co.amountKobo) {
    await ref.update({ status: "amount_mismatch", paidKobo: Number(tx.amount) });
    throw new HttpError(400, "The amount paid didn't match your order. Please contact Declutt.");
  }

  const soldOut = [];
  await db.runTransaction(async (t) => {
    const c = await t.get(ref);
    if (c.data().status === "paid") return;
    const orderSnaps = await Promise.all(co.orderIds.map((id) => t.get(db.doc(`orders/${id}`))));
    const ids = [...new Set(orderSnaps.flatMap((s) => s.data().items.map((i) => i.listingId)))];
    const listingSnaps = await Promise.all(ids.map((id) => t.get(db.doc(`listings/${id}`))));
    const listings = Object.fromEntries(listingSnaps.map((s) => [s.id, s]));
    const now = Timestamp.now();
    for (const os of orderSnaps) {
      const o = os.data();
      if (o.status !== "pending_payment") {
        // cancelled (or expired) before the payment landed → give that money back
        if (o.paymentStatus === "unpaid") {
          t.update(os.ref, { paymentStatus: "paid", paidAt: now, updatedAt: now });
          soldOut.push(os.id);
        }
        continue;
      }
      const ok = o.items.every((i) => {
        const l = listings[i.listingId];
        return l?.exists && isBuyable(l.data()) && stockOf(l.data()) >= i.qty;
      });
      if (ok) {
        t.update(os.ref, {
          status: "placed",
          paymentStatus: "paid",
          paidAt: now,
          payoutStatus: "held",
          reserved: true,
          updatedAt: now,
          history: FieldValue.arrayUnion(historyEntry("placed", "system", "Payment received")),
        });
        o.items.forEach((i) => reserveListing(t, listings[i.listingId], i.qty));
        notifySeller(t, db, o, os.id);
      } else {
        // someone else bought it first → cancel and refund this part of the payment
        t.update(os.ref, {
          status: "cancelled",
          paymentStatus: "paid",
          cancelledAt: now,
          cancelledBy: "system",
          cancelReason: "Sold out before your payment went through — you're being refunded.",
          payoutStatus: "cancelled",
          updatedAt: now,
          history: FieldValue.arrayUnion(historyEntry("cancelled", "system", "Sold out")),
        });
        soldOut.push(os.id);
      }
    }
    t.update(ref, { status: "paid", paidAt: now, paystackId: tx.id ?? null });
  });
  for (const id of soldOut) await refundOrder(db, id).catch((e) => console.error("Refund failed", id, e));
  return { status: "paid", orderIds: co.orderIds };
};

/** Finishes a seller payout once Paystack reports the transfer as paid or failed/reversed. */
export const settlePayout = async (db, payoutId, ok, error) => {
  const ref = db.doc(`payouts/${payoutId}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const p = snap.data();
  if (ok ? p.status === "paid" : p.status === "failed") return; // already done
  const now = Timestamp.now();
  const batch = db.batch();
  batch.update(
    ref,
    ok
      ? { status: "paid", paidAt: now }
      : { status: "failed", error: String(error || "Transfer failed").slice(0, 300), failedAt: now },
  );
  // money didn't arrive → the orders go back into the next payout run
  (p.orderIds || []).forEach((id) =>
    batch.update(
      db.doc(`orders/${id}`),
      ok
        ? { payoutStatus: "paid", paidOutAt: now }
        : { payoutStatus: p.podOrderIds?.includes(id) ? "commission_owed" : "eligible", payoutId: null },
    ),
  );
  (p.penaltyOrderIds || []).forEach((id) =>
    batch.update(
      db.doc(`orders/${id}`),
      ok ? { penaltyStatus: "paid" } : { penaltyStatus: "owed", penaltyPayoutId: null },
    ),
  );
  await batch.commit();
};

/** Bank name check: at least two words of the seller's name (or the only word) appear on the account. */
export const namesMatch = (profileName, accountName) => {
  const words = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);
  const mine = words(profileName);
  const bank = new Set(words(accountName));
  if (!mine.length || !bank.size) return false;
  const hits = mine.filter((w) => bank.has(w)).length;
  return hits >= Math.min(2, mine.length);
};
