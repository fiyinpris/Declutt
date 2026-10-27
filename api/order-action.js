/*
 * POST /api/order-action { orderId, action, reason?, outcome?, penalty? }
 * Every change to an order goes through here, so buyers and sellers can only make the moves
 * they're allowed to (the database refuses order edits from the browser).
 *
 *   placed ─confirm→ confirmed ─ship→ shipped ─deliver→ delivered ─(return window)→ completed
 *                                                          └dispute→ disputed ─resolve→ completed | refunded
 *   cancel: buyer before the seller accepts · seller before shipping · admin any time before delivery
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
  loadSettings,
  ms,
  notify,
  refundOrder,
  requireUser,
  restoreListings,
} from "./_lib/server.js";

const OPEN = ["pending_payment", "placed", "confirmed", "shipped"];
const shortId = (id) => `#${id.slice(0, 6).toUpperCase()}`;

export default handle(["POST"], async (req, res) => {
  const user = await requireUser(req);
  const db = getDb();
  const body = req.body || {};
  const orderId = typeof body.orderId === "string" ? body.orderId.slice(0, 100) : "";
  const action = String(body.action || "");
  const reason = String(body.reason || "").trim().slice(0, 500);
  if (!orderId) throw new HttpError(400, "Missing order.");

  const admin = await isAdmin(user);
  const settings = await loadSettings(db);
  const ref = db.doc(`orders/${orderId}`);
  let after = null; // refunds / restocking happen once the order is saved
  let newStatus = null;

  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new HttpError(404, "Order not found.");
    const o = snap.data();
    const isBuyer = o.buyerUid === user.uid;
    const isSeller = o.sellerUid === user.uid;
    if (!isBuyer && !isSeller && !admin) throw new HttpError(403, "This isn't your order.");
    const as = isSeller ? "seller" : isBuyer ? "buyer" : "admin";
    const now = Timestamp.now();
    const forbid = (msg = "You can't do that on this order.") => {
      throw new HttpError(403, msg);
    };
    const conflict = (msg) => {
      throw new HttpError(409, msg);
    };
    const step = (status, extra = {}, note) => {
      newStatus = status;
      t.update(ref, {
        ...extra,
        status,
        updatedAt: now,
        history: FieldValue.arrayUnion(historyEntry(status, as, note)),
      });
    };
    const tellSeller = (text) =>
      notify(t, db, { type: "order_update", sellerUid: o.sellerUid, buyerName: o.buyerName, orderId, text });
    const tellBuyer = (text) =>
      notify(t, db, { type: "order_update", recipientUid: o.buyerUid, orderId, text });
    const adminPenalty = admin
      ? Math.max(0, Math.min(Math.floor(Number(body.penalty) || 0), 1_000_000))
      : 0;
    const penaltyFields = (n) => (n > 0 ? { penalty: n, penaltyStatus: "owed" } : {});

    switch (action) {
      case "confirm":
        if (!isSeller && !admin) forbid();
        if (o.status !== "placed") conflict("This order can't be accepted now.");
        step("confirmed", { confirmedAt: now });
        tellBuyer(`${o.sellerName} accepted your order ${shortId(orderId)}.`);
        break;

      case "ship":
        if (!isSeller && !admin) forbid();
        if (o.status !== "confirmed") conflict("Accept the order before sending it.");
        step("shipped", { shippedAt: now, ...(reason ? { shippingNote: reason } : {}) }, reason);
        tellBuyer(
          o.delivery?.method === "pickup"
            ? `Your order ${shortId(orderId)} is ready for pickup.`
            : `Your order ${shortId(orderId)} is on the way.`,
        );
        break;

      case "deliver": {
        // Online orders: the buyer confirms (or it happens automatically after a few days).
        // Pay on delivery: the seller can also mark it, since they collected the money.
        const sellerMay = isSeller && o.paymentMethod === "pay_on_delivery";
        if (!isBuyer && !sellerMay && !admin)
          forbid("Only the buyer can confirm they've received this order.");
        if (o.status !== "shipped") conflict("This order hasn't been sent yet.");
        step("delivered", { deliveredAt: now });
        if (isBuyer) tellSeller(`${o.buyerName} received order ${shortId(orderId)}.`);
        else tellBuyer(`Order ${shortId(orderId)} was marked as delivered.`);
        break;
      }

      case "dispute":
        if (!isBuyer) forbid("Only the buyer can report a problem with an order.");
        if (o.status !== "delivered") conflict("You can report a problem once the order is delivered.");
        if (ms(o.deliveredAt) + settings.returnWindowDays * DAY < Date.now())
          conflict("The return window for this order has closed.");
        if (reason.length < 10) throw new HttpError(400, "Tell us what's wrong (at least a sentence).");
        step("disputed", { disputedAt: now, disputeReason: reason }, reason);
        tellSeller(`${o.buyerName} reported a problem with order ${shortId(orderId)}. Declutt will review it.`);
        break;

      case "cancel": {
        const allowed = admin
          ? OPEN
          : isBuyer
            ? ["pending_payment", "placed"]
            : ["placed", "confirmed"];
        if (!allowed.includes(o.status))
          conflict(
            isBuyer
              ? "The seller has already accepted this order. Message them or contact Declutt to cancel."
              : "This order can't be cancelled now.",
          );
        if (isSeller && !admin && reason.length < 3)
          throw new HttpError(400, "Tell the buyer why you're cancelling.");
        // Jumia-style penalty when a seller cancels something the buyer already paid for
        const penalty =
          isSeller && !admin && o.paymentStatus === "paid"
            ? Math.max(0, Number(settings.sellerCancelPenalty) || 0)
            : adminPenalty;
        step(
          "cancelled",
          {
            cancelledAt: now,
            cancelledBy: as,
            cancelReason: reason || "Cancelled",
            payoutStatus: "cancelled",
            ...penaltyFields(penalty),
          },
          reason,
        );
        after = { refund: o.paymentStatus === "paid", restore: true, order: o };
        if (as === "buyer") tellSeller(`${o.buyerName} cancelled order ${shortId(orderId)}.`);
        else tellBuyer(`Order ${shortId(orderId)} was cancelled${reason ? `: ${reason}` : "."}`);
        if (as === "admin") tellSeller(`Declutt cancelled order ${shortId(orderId)}.`);
        break;
      }

      case "resolve": {
        if (!admin) forbid("Only Declutt can resolve a dispute.");
        if (o.status !== "disputed") conflict("This order isn't in dispute.");
        if (body.outcome === "release") {
          step(
            "completed",
            {
              completedAt: now,
              resolution: "release",
              resolutionNote: reason,
              payoutStatus: o.paymentMethod === "online" ? "eligible" : "commission_owed",
            },
            reason || "Resolved in the seller's favour",
          );
          tellBuyer(`Declutt reviewed order ${shortId(orderId)} and closed the dispute.`);
          tellSeller(`The dispute on order ${shortId(orderId)} was closed in your favour.`);
        } else if (body.outcome === "refund") {
          step(
            "refunded",
            {
              refundDecidedAt: now,
              resolution: "refund",
              resolutionNote: reason,
              payoutStatus: "cancelled",
              ...penaltyFields(adminPenalty),
            },
            reason || "Refunded to the buyer",
          );
          after = { refund: o.paymentStatus === "paid", restore: false, order: o };
          tellBuyer(
            o.paymentStatus === "paid"
              ? `Declutt is refunding order ${shortId(orderId)} to your payment method.`
              : `Declutt resolved order ${shortId(orderId)} in your favour.`,
          );
          tellSeller(`The dispute on order ${shortId(orderId)} was resolved for the buyer.`);
        } else throw new HttpError(400, "Choose an outcome.");
        break;
      }

      case "retry_refund":
        if (!admin) forbid();
        if (o.paymentStatus !== "paid" || !["cancelled", "refunded"].includes(o.status))
          conflict("There's nothing to refund on this order.");
        after = { refund: true, restore: false, order: o };
        newStatus = o.status;
        break;

      default:
        throw new HttpError(400, "Unknown action.");
    }
  });

  if (after?.restore) await restoreListings(db, after.order).catch((e) => console.error("Restock", e));
  if (after?.refund) {
    try {
      await refundOrder(db, orderId);
    } catch (e) {
      return res.status(200).json({
        ok: true,
        status: newStatus,
        warning: `The order was updated, but the refund didn't go through yet (${e.message}). Declutt will retry it.`,
      });
    }
  }
  res.status(200).json({ ok: true, status: newStatus });
});
