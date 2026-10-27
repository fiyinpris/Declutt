/*
 * POST /api/checkout — turns the buyer's cart into orders (one per seller).
 * Prices, fees and totals are worked out HERE from the database, never trusted from the browser.
 *  - online: creates the orders as "pending_payment" and starts a Paystack payment
 *  - pay_on_delivery: places the orders straight away and reserves the items
 */
import {
  HttpError,
  Timestamp,
  appUrl,
  getDb,
  handle,
  historyEntry,
  isBuyable,
  kobo,
  loadSettings,
  normalizeCategory,
  notifySeller,
  paystack,
  requireUser,
  reserveListing,
  stockOf,
} from "./_lib/server.js";

const PHONE = /^(\+?234|0)[789][01]\d{8}$/;
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
// only real web links go on orders (base64 photos are too big)
const webImage = (u) => (typeof u === "string" && /^https?:\/\//.test(u) ? u : null);

export default handle(["POST"], async (req, res) => {
  const user = await requireUser(req);
  const db = getDb();
  const body = req.body || {};

  /* ── validate the request ── */
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.length > 50) throw new HttpError(400, "Your cart is empty.");
  const wanted = new Map();
  for (const i of items) {
    const id = str(i?.id, 100);
    const qty = Math.floor(Number(i?.qty));
    if (!id || !(qty >= 1 && qty <= 99)) throw new HttpError(400, "Something in your cart isn't valid.");
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }
  const d = body.delivery || {};
  const delivery = {
    method: d.method === "delivery" ? "delivery" : "pickup",
    name: str(d.name, 100),
    phone: str(d.phone, 20).replace(/\s+/g, ""),
    address: str(d.address, 300),
    state: str(d.state, 50),
    note: str(d.note, 300),
  };
  if (delivery.name.length < 2) throw new HttpError(400, "Enter the receiver's name.");
  if (!PHONE.test(delivery.phone)) throw new HttpError(400, "Enter a valid Nigerian phone number.");
  if (delivery.method === "delivery" && (delivery.address.length < 8 || !delivery.state))
    throw new HttpError(400, "Enter the delivery address and state.");
  const payment = body.payment === "pay_on_delivery" ? "pay_on_delivery" : "online";

  const settings = await loadSettings(db);
  if (payment === "pay_on_delivery" && !settings.payOnDelivery)
    throw new HttpError(400, "Pay on delivery isn't available right now.");
  if (payment === "online" && !user.email)
    throw new HttpError(400, "Your account needs an email address to pay online.");

  const buyer = (await db.doc(`users/${user.uid}`).get()).data() || {};
  if (buyer.suspended) throw new HttpError(403, "Your account is restricted. Contact Declutt.");

  const checkoutRef = db.collection("checkouts").doc();
  const orderIds = [];
  let amount = 0;

  /* ── create the orders atomically (re-checking every item) ── */
  await db.runTransaction(async (t) => {
    const ids = [...wanted.keys()];
    const snaps = await Promise.all(ids.map((id) => t.get(db.doc(`listings/${id}`))));
    const problems = [];
    const bySeller = new Map();
    snaps.forEach((s, idx) => {
      const id = ids[idx];
      const l = s.data();
      const qty = wanted.get(id);
      if (!s.exists || !isBuyable(l)) return problems.push({ id, reason: "No longer available" });
      if (l.sellerUid === user.uid) return problems.push({ id, reason: "This is your own item" });
      if (qty > stockOf(l)) return problems.push({ id, reason: `Only ${stockOf(l)} available` });
      if (!bySeller.has(l.sellerUid)) bySeller.set(l.sellerUid, []);
      bySeller.get(l.sellerUid).push({ snap: s, l, qty });
    });
    if (problems.length)
      throw new HttpError(409, "Some items in your cart can't be bought right now.", { problems });

    const now = Timestamp.now();
    for (const [sellerUid, lines] of bySeller) {
      const orderRef = db.collection("orders").doc();
      const orderItems = lines.map(({ snap, l, qty }) => ({
        listingId: snap.id,
        name: l.name || "Item",
        price: Number(l.price) || 0,
        qty,
        category: normalizeCategory(l.category),
        imageUrl: webImage(l.imageUrl),
      }));
      const subtotal = orderItems.reduce((n, i) => n + i.price * i.qty, 0);
      const commission = Math.round(
        orderItems.reduce(
          (n, i) => n + (i.price * i.qty * (Number(settings.commission[i.category]) || 0)) / 100,
          0,
        ),
      );
      const deliveryFee = delivery.method === "delivery" ? Number(settings.deliveryFee) || 0 : 0;
      const fulfilmentFee = Number(settings.fulfilmentFee) || 0;
      const total = subtotal + deliveryFee;
      const order = {
        checkoutId: checkoutRef.id,
        buyerUid: user.uid,
        buyerName: buyer.name || user.name || "Buyer",
        buyerEmail: user.email || "",
        sellerUid,
        sellerName: lines[0].l.sellerName || "Seller",
        items: orderItems,
        subtotal,
        deliveryFee,
        commission,
        fulfilmentFee,
        total,
        sellerNet: total - commission - fulfilmentFee,
        paymentMethod: payment,
        paymentStatus: payment === "online" ? "unpaid" : "pay_on_delivery",
        status: payment === "online" ? "pending_payment" : "placed",
        // online: money held until delivery + return window; POD: the buyer pays the seller,
        // and once the order completes Declutt's fees come off the seller's next payout
        payoutStatus: payment === "online" ? "unpaid" : "pod",
        delivery,
        reserved: payment !== "online",
        history: [historyEntry(payment === "online" ? "pending_payment" : "placed", "buyer")],
        createdAt: now,
        updatedAt: now,
      };
      t.set(orderRef, order);
      orderIds.push(orderRef.id);
      amount += total;
      if (payment !== "online") {
        lines.forEach(({ snap, qty }) => reserveListing(t, snap, qty));
        notifySeller(t, db, order, orderRef.id);
      }
    }
    t.set(checkoutRef, {
      buyerUid: user.uid,
      orderIds,
      amount,
      amountKobo: kobo(amount),
      paymentMethod: payment,
      status: payment === "online" ? "pending" : "pay_on_delivery",
      createdAt: now,
    });
  });

  if (payment === "pay_on_delivery")
    return res.status(200).json({ checkoutId: checkoutRef.id, orderIds });

  /* ── start the Paystack payment ── */
  try {
    const init = await paystack("/transaction/initialize", {
      method: "POST",
      body: {
        email: user.email,
        amount: kobo(amount),
        currency: "NGN",
        reference: checkoutRef.id,
        callback_url: `${appUrl(req)}/checkout/complete`,
        metadata: { checkoutId: checkoutRef.id, orderIds, buyerUid: user.uid },
      },
    });
    res.status(200).json({ checkoutId: checkoutRef.id, orderIds, authorizationUrl: init.authorization_url });
  } catch (e) {
    // couldn't start the payment → don't leave half-made orders behind
    const now = Timestamp.now();
    const batch = db.batch();
    orderIds.forEach((id) =>
      batch.update(db.doc(`orders/${id}`), {
        status: "cancelled",
        cancelledBy: "system",
        cancelReason: "Payment couldn't be started",
        cancelledAt: now,
        payoutStatus: "cancelled",
      }),
    );
    batch.update(checkoutRef, { status: "failed" });
    await batch.commit();
    throw e;
  }
});
