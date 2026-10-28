import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { apiPost } from "../utils/api";
import {
  DAY,
  ORDER_FILTERS,
  fmtDate,
  naira,
  orderStatus,
  payoutStatus,
  shortOrderId,
  tsMs,
  useFeeSettings,
} from "../utils/orders";
import { Ico, Spin } from "./Ico";

/*
 * Orders for the buyer and seller dashboards. Reading is live from Firestore; every change
 * (accept, send, received, cancel, report a problem) goes through /api/order-action, which
 * checks who's asking and what the order allows.
 */

const HISTORY_LABEL = {
  pending_payment: "Order created — waiting for payment",
  placed: "Order placed",
  confirmed: "Seller accepted",
  shipped: "Sent / ready for pickup",
  delivered: "Delivered",
  completed: "Completed",
  disputed: "Problem reported",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
const BY = { buyer: "buyer", seller: "seller", admin: "Declutt", system: "Declutt" };

/** Live orders where the user is the buyer or the seller. */
const useOrders = (uid, as) => {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "orders"), where(as === "seller" ? "sellerUid" : "buyerUid", "==", uid)),
      (snap) =>
        setOrders(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)),
        ),
      (e) => {
        console.error("Orders:", e);
        setOrders([]);
      },
    );
  }, [uid, as]);
  return orders;
};

/* Product photo for an order line. Listing photos are stored on the listing itself (orders only
   keep web links), so load it from there once per listing. */
const imageCache = new Map(); // listingId → Promise<string | null>
const listingImage = (id) => {
  if (!imageCache.has(id))
    imageCache.set(
      id,
      getDoc(doc(db, "listings", id))
        .then((s) => s.data()?.imageUrl || null)
        .catch(() => null),
    );
  return imageCache.get(id);
};
const ItemThumb = ({ item }) => {
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (item.imageUrl) return;
    let alive = true;
    listingImage(item.listingId).then((u) => alive && setLoaded(u));
    return () => {
      alive = false;
    };
  }, [item.imageUrl, item.listingId]);
  const src = item.imageUrl || loaded;
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-border/30 shrink-0">
      {src && <img src={src} alt="" className="w-full h-full object-cover" />}
    </div>
  );
};

/* Asks for a reason before cancelling / reporting a problem */
const ReasonDialog = ({ title, text, label, placeholder, required, confirm, danger, penalty, onClose, onSubmit }) => {
  const [value, setValue] = useState("");
  const [fine, setFine] = useState("");
  const min = required || 0;
  return (
    <div className="fixed inset-0 z-80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim().length >= min) onSubmit(value.trim(), Number(fine) || 0);
        }}
        className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl p-5 space-y-3 text-left"
      >
        <p className="text-base font-black text-foreground">{title}</p>
        {text && <p className="text-sm text-foreground/60 leading-relaxed">{text}</p>}
        <label className="block text-xs font-bold text-foreground/70">
          {label}
          <textarea
            autoFocus
            rows={3}
            maxLength={500}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-normal text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/60 resize-none"
          />
        </label>
        {penalty && (
          <label className="block text-xs font-bold text-foreground/70">
            Penalty for the seller (₦, optional)
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={fine}
              onChange={(e) => setFine(e.target.value)}
              placeholder="0"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-normal text-foreground focus:outline-none focus:border-primary/60"
            />
          </label>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground/60 hover:bg-border/40"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={value.trim().length < min}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${danger ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
          >
            {confirm}
          </button>
        </div>
      </form>
    </div>
  );
};

const Pill = ({ cls, children }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>
    {children}
  </span>
);

const Row = ({ label, value, strong, minus }) => (
  <div className="flex justify-between gap-3 text-xs">
    <span className="text-foreground/55">{label}</span>
    <span className={strong ? "font-black text-foreground" : "font-semibold text-foreground/80"}>
      {minus ? "− " : ""}
      {value}
    </span>
  </div>
);

export const OrderCard = ({ order: o, viewer, fees, admin = false }) => {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [open, setOpen] = useState(false);
  const status = orderStatus(o, viewer);
  const isSeller = viewer === "seller";
  const pod = o.paymentMethod === "pay_on_delivery";
  const pickup = o.delivery?.method === "pickup";
  const voided = ["cancelled", "refunded"].includes(o.status);
  const windowEnds = tsMs(o.deliveredAt) + (fees?.returnWindowDays ?? 7) * DAY;
  const [now] = useState(Date.now); // when the card opened (good enough for a day-long window)

  const run = async (action, extra = {}) => {
    setDialog(null);
    setBusy(action);
    setMsg(null);
    try {
      const r = await apiPost("order-action", { orderId: o.id, action, ...extra });
      if (r.warning) setMsg({ tone: "warn", text: r.warning });
    } catch (e) {
      setMsg({ tone: "bad", text: e.message });
    }
    setBusy(null);
  };

  const btn = (action, label, { primary, danger, onClick } = {}) => (
    <button
      key={action}
      type="button"
      disabled={!!busy}
      onClick={onClick || (() => run(action))}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-60 ${primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : danger ? "border border-red-500/30 text-red-500 hover:bg-red-500/8" : "border border-border text-foreground/70 hover:border-primary/40 hover:text-primary"}`}
    >
      {busy === action && <Spin s={12} />}
      {label}
    </button>
  );

  const cancelDialog = () =>
    setDialog({
      title: "Cancel this order?",
      text:
        viewer === "buyer"
          ? o.paymentStatus === "paid"
            ? "You'll get a full refund."
            : null
          : o.paymentStatus === "paid"
            ? `The buyer gets a full refund.${fees?.sellerCancelPenalty > 0 ? ` Cancelling a paid order costs ${naira(fees.sellerCancelPenalty)}, taken from your next payout.` : ""}`
            : "The buyer will be told the order is cancelled.",
      label: viewer === "buyer" ? "Reason (optional)" : "Tell the buyer why",
      placeholder: viewer === "buyer" ? "e.g. I ordered by mistake" : "e.g. The item got damaged",
      required: viewer === "seller" && !admin ? 3 : 0,
      confirm: "Cancel order",
      danger: true,
      onSubmit: (reason) => run("cancel", { reason }),
    });

  const actions = [];
  if (isSeller || admin) {
    if (o.status === "placed") actions.push(btn("confirm", "Accept order", { primary: true }));
    if (o.status === "confirmed")
      actions.push(btn("ship", pickup ? "Ready for pickup" : "Mark as sent", { primary: true }));
    if (o.status === "shipped" && (pod || admin))
      actions.push(btn("deliver", pod ? "Delivered & paid" : "Mark delivered", { primary: true }));
    if (["placed", "confirmed"].includes(o.status) || (admin && ["pending_payment", "shipped"].includes(o.status)))
      actions.push(btn("cancel", "Cancel", { danger: true, onClick: cancelDialog }));
  }
  if (admin && o.status === "disputed") {
    actions.unshift(
      btn("refund", "Refund buyer", {
        danger: true,
        onClick: () =>
          setDialog({
            title: "Refund the buyer?",
            text:
              o.paymentStatus === "paid"
                ? `${naira(o.total)} goes back to the buyer's card or account through Paystack. The seller isn't paid for this order.`
                : "Pay on delivery — the buyer paid the seller directly, so ask the seller to refund them. Declutt won't charge fees on this order.",
            label: "Note for both sides",
            placeholder: "e.g. Item not as described",
            confirm: "Refund buyer",
            danger: true,
            penalty: true,
            onSubmit: (reason, fine) => run("resolve", { outcome: "refund", reason, penalty: fine }),
          }),
      }),
      btn("release", "Release to seller", {
        primary: true,
        onClick: () =>
          setDialog({
            title: "Close the dispute for the seller?",
            text: "The order completes and the seller's money goes into their next payout.",
            label: "Note for both sides",
            placeholder: "e.g. Photos show the item matched the listing",
            confirm: "Release",
            onSubmit: (reason) => run("resolve", { outcome: "release", reason }),
          }),
      }),
    );
  }
  if (admin && o.paymentStatus === "paid" && ["cancelled", "refunded"].includes(o.status))
    actions.push(btn("retry_refund", "Retry refund", { primary: true }));
  if (viewer === "buyer" && !admin) {
    if (o.status === "shipped") actions.push(btn("deliver", "I've received it", { primary: true }));
    if (o.status === "delivered" && now < windowEnds)
      actions.push(
        btn("dispute", "Report a problem", {
          danger: true,
          onClick: () =>
            setDialog({
              title: "Report a problem",
              label: "What's wrong?",
              placeholder: "e.g. The fridge doesn't cool, and the listing said it works",
              required: 10,
              confirm: "Send report",
              danger: true,
              onSubmit: (reason) => run("dispute", { reason }),
            }),
        }),
        <span key="until" className="text-[11px] text-foreground/45">
          until {fmtDate(windowEnds)}
        </span>,
      );
    if (["pending_payment", "placed"].includes(o.status))
      actions.push(btn("cancel", "Cancel order", { danger: true, onClick: cancelDialog }));
  }

  const paymentLine =
    o.paymentStatus === "paid"
      ? o.status === "cancelled" || o.status === "refunded"
        ? "Paid — refund pending"
        : "Paid online"
      : o.paymentStatus === "refunded"
        ? o.refundStatus === "refunded" ? "Refunded" : "Refund on its way (3–10 business days)"
        : pod
          ? "Pay on delivery"
          : "Not paid";

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3 text-left">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-foreground">
            Order {shortOrderId(o.id)}
          </p>
          <p className="text-[11px] text-foreground/45 mt-0.5">
            {fmtDate(o.createdAt, true)} ·{" "}
            {admin
              ? `${o.buyerName} → ${o.sellerName}`
              : isSeller
                ? `from ${o.buyerName}`
                : `sold by ${o.sellerName}`}
          </p>
        </div>
        <Pill cls={status.cls}>{status.label}</Pill>
      </div>

      <div className="space-y-2">
        {o.items?.map((i) => (
          <Link key={i.listingId} to={`/product/${i.listingId}`} className="flex items-center gap-3 group">
            <ItemThumb item={i} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary">{i.name}</p>
              <p className="text-xs text-foreground/45">
                {i.qty} × {naira(i.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {o.status === "disputed" && (
        <p className="text-xs text-red-500 bg-red-500/8 rounded-xl px-3 py-2">
          <span className="font-bold">Problem reported:</span> {o.disputeReason}
        </p>
      )}
      {["cancelled", "refunded"].includes(o.status) && (o.cancelReason || o.resolutionNote) && (
        <p className="text-xs text-foreground/55 bg-border/25 rounded-xl px-3 py-2">
          {o.cancelReason || o.resolutionNote}
        </p>
      )}

      {/* Delivery details — the seller needs them to deliver */}
      {(isSeller || admin) && o.delivery && (
        <div className="text-xs bg-background border border-border/70 rounded-xl px-3 py-2.5 space-y-1">
          <p className="font-bold text-foreground/80">
            {pickup ? "Buyer will pick up" : "Deliver to"}
          </p>
          <p className="text-foreground/70">
            {o.delivery.name} ·{" "}
            <a href={`tel:${o.delivery.phone}`} className="text-primary font-semibold">
              {o.delivery.phone}
            </a>
          </p>
          {!pickup && (
            <p className="text-foreground/60">
              {o.delivery.address}, {o.delivery.state}
            </p>
          )}
          {o.delivery.note && <p className="text-foreground/50 italic">“{o.delivery.note}”</p>}
        </div>
      )}

      {/* Money */}
      <div className="border-t border-border/70 pt-3 space-y-1.5">
        {isSeller ? (
          <>
            <Row label="Order total" value={naira(o.total)} />
            {o.commission > 0 && !voided && <Row label="Declutt commission" value={naira(o.commission)} minus />}
            {o.fulfilmentFee > 0 && !voided && <Row label="Fulfilment fee" value={naira(o.fulfilmentFee)} minus />}
            {o.penalty > 0 && <Row label="Cancellation penalty" value={naira(o.penalty)} minus />}
            <Row
              label={admin ? "Seller gets" : pod ? "Yours after fees" : "You receive"}
              value={voided ? (o.penalty ? `− ${naira(o.penalty)}` : naira(0)) : naira(o.sellerNet)}
              strong
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-foreground/45">
                {voided
                  ? o.paymentStatus === "refunded"
                    ? "Refunded to the buyer"
                    : o.paymentStatus === "paid"
                      ? "Buyer refund pending"
                      : "Nothing was paid"
                  : pod
                    ? `Collect ${naira(o.total)} from the buyer`
                    : "Paid online"}
              </span>
              <Pill cls={payoutStatus(o).cls}>{payoutStatus(o).label}</Pill>
            </div>
          </>
        ) : (
          <>
            <Row label="Items" value={naira(o.subtotal)} />
            {o.deliveryFee > 0 && <Row label="Delivery" value={naira(o.deliveryFee)} />}
            <Row label="Total" value={naira(o.total)} strong />
            <p className="text-[11px] text-foreground/45 pt-0.5">{paymentLine}</p>
          </>
        )}
      </div>

      {msg && (
        <p className={`text-xs font-semibold rounded-xl px-3 py-2 ${msg.tone === "bad" ? "text-red-500 bg-red-500/8" : "text-amber-600 bg-amber-500/10"}`}>
          {msg.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto text-xs font-semibold text-foreground/50 hover:text-primary flex items-center gap-1"
        >
          {open ? "Hide" : "Timeline"}
          <Ico s={12} r className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6" />
          </Ico>
        </button>
      </div>

      {open && (
        <ol className="border-l-2 border-border ml-1.5 pl-4 space-y-2.5">
          {(o.history || []).map((h, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
              <p className="text-xs font-semibold text-foreground">
                {HISTORY_LABEL[h.status] || h.status}
                {h.by && h.status !== "pending_payment" && (
                  <span className="font-normal text-foreground/45"> · by {BY[h.by] || h.by}</span>
                )}
              </p>
              {h.note && <p className="text-[11px] text-foreground/55">{h.note}</p>}
              <p className="text-[10px] text-foreground/40">{fmtDate(h.at, true)}</p>
            </li>
          ))}
        </ol>
      )}

      {dialog && <ReasonDialog {...dialog} onClose={() => setDialog(null)} />}
    </div>
  );
};

/** Filter chips + list. viewer: "buyer" (my purchases) or "seller" (my sales). */
export const OrdersList = ({ uid, viewer, empty }) => {
  const all = useOrders(uid, viewer);
  const fees = useFeeSettings();
  const [filter, setFilter] = useState("all");
  if (!all)
    return (
      <div className="flex justify-center py-16 text-foreground/30">
        <Spin s={24} />
      </div>
    );
  // Checkouts that were never paid (abandoned or failed) aren't orders yet — hide them
  const orders = all.filter((o) => o.paymentStatus !== "unpaid");
  const filters = ORDER_FILTERS.filter(
    (f) => f.id === "all" || orders.some(f.match),
  );
  const shown = orders.filter((ORDER_FILTERS.find((f) => f.id === filter) || ORDER_FILTERS[0]).match);

  if (!orders.length) return empty;
  return (
    <div className="space-y-4">
      {filters.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-border/40 text-foreground/55 hover:bg-border/70"}`}
            >
              {f.label} ({orders.filter(f.match).length})
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-foreground/45 text-center py-10">No orders here.</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 items-start">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} viewer={viewer} fees={fees} />
          ))}
        </div>
      )}
    </div>
  );
};
