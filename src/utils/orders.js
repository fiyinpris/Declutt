import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/* Shared order / payment helpers for checkout, the dashboards and the admin pages. */

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT – Abuja", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara",
];

export const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
export const shortOrderId = (id = "") => `#${id.slice(0, 6).toUpperCase()}`;
export const tsMs = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0);
export const fmtDate = (t, withTime = false) => {
  const v = typeof t === "number" ? t : tsMs(t);
  if (!v) return "";
  return new Date(v).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};
export const DAY = 24 * 3600 * 1000;

/* Fees & policies — the admin edits settings/fees; the server uses the same defaults */
export const DEFAULT_FEES = {
  commission: { Furniture: 10, Appliances: 10, Electronics: 10 },
  deliveryFee: 0,
  fulfilmentFee: 0,
  sellerCancelPenalty: 0,
  returnWindowDays: 7,
  autoConfirmDays: 7,
  payOnDelivery: true,
};
const withDefaults = (s = {}) => ({
  ...DEFAULT_FEES,
  ...s,
  commission: { ...DEFAULT_FEES.commission, ...(s.commission || {}) },
});

export const useFeeSettings = () => {
  const [fees, setFees] = useState(() => withDefaults());
  useEffect(
    () =>
      onSnapshot(
        doc(db, "settings", "fees"),
        (s) => setFees(withDefaults(s.data())),
        (e) => console.error("Fees:", e),
      ),
    [],
  );
  return fees;
};

/* Order status → label + colour. Tones read well on light and dark backgrounds. */
export const TONES = {
  amber: "bg-amber-500/12 text-amber-600",
  blue: "bg-sky-500/12 text-sky-600",
  violet: "bg-violet-500/12 text-violet-500",
  green: "bg-emerald-500/12 text-emerald-600",
  red: "bg-red-500/12 text-red-500",
  gray: "bg-foreground/8 text-foreground/55",
};

const STATUS = {
  pending_payment: { label: "Awaiting payment", tone: "amber" },
  placed: { label: "New order", buyer: "Waiting for seller", tone: "amber" },
  confirmed: { label: "Accepted", tone: "blue" },
  shipped: { label: "On the way", pickup: "Ready for pickup", tone: "violet" },
  delivered: { label: "Delivered", tone: "green" },
  completed: { label: "Completed", tone: "green" },
  disputed: { label: "Problem reported", tone: "red" },
  cancelled: { label: "Cancelled", tone: "gray" },
  refunded: { label: "Refunded", tone: "gray" },
};
export const orderStatus = (o, viewer = "seller") => {
  const s = STATUS[o.status] || { label: o.status, tone: "gray" };
  const label =
    (o.status === "shipped" && o.delivery?.method === "pickup" && s.pickup) ||
    (viewer === "buyer" && s.buyer) ||
    s.label;
  return { label, cls: TONES[s.tone] };
};

/* Order filter tabs shared by the buyer and seller dashboards */
export const ORDER_FILTERS = [
  { id: "all", label: "All", match: () => true },
  { id: "active", label: "Active", match: (o) => ["placed", "confirmed", "shipped"].includes(o.status) },
  { id: "delivered", label: "Delivered", match: (o) => ["delivered", "completed"].includes(o.status) },
  { id: "problems", label: "Problems", match: (o) => o.status === "disputed" },
  { id: "cancelled", label: "Cancelled", match: (o) => ["cancelled", "refunded"].includes(o.status) },
  { id: "unpaid", label: "Unpaid", match: (o) => o.status === "pending_payment" },
];

/* Where the seller's money for an order is */
const PAYOUT = {
  unpaid: { label: "Not paid yet", tone: "gray" },
  held: { label: "Held by Declutt", tone: "amber" },
  eligible: { label: "In next payout", tone: "blue" },
  processing: { label: "Paying out", tone: "violet" },
  paid: { label: "Paid out", tone: "green" },
  pod: { label: "Buyer pays you on delivery", tone: "gray" },
  commission_owed: { label: "Fees due next payout", tone: "amber" },
  cancelled: { label: "Not payable", tone: "gray" },
};
export const payoutStatus = (o) => {
  const p = PAYOUT[o.payoutStatus] || PAYOUT.unpaid;
  return { label: p.label, cls: TONES[p.tone] };
};

/** The 5th business day (Mon–Fri) of a month, Lagos time. */
const fifthBusinessDay = (y, m) => {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(y, m, day);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    if (count === 5) return d;
  }
  return new Date(y, m, 7);
};
/** Next monthly payout date (sellers get paid ~5 business days after each month closes). */
export const nextPayoutDate = (now = new Date()) => {
  const thisMonth = fifthBusinessDay(now.getFullYear(), now.getMonth());
  return now.getDate() <= thisMonth.getDate()
    ? thisMonth
    : fifthBusinessDay(now.getFullYear(), now.getMonth() + 1);
};

/* Checkout hand-off between the checkout page and the "payment complete" page */
export const PENDING_CHECKOUT_KEY = "declutt_checkout_pending";
export const savedDeliveryKey = (uid) => `declutt_delivery_${uid}`;
export const stockOf = (l) => (Number(l?.maxQuantity) > 0 ? Number(l.maxQuantity) : 1);

/* Order alerts in the notifications collection: "order" (new order → seller) and
   "order_update" (status changes → seller via sellerUid, buyer via recipientUid) */
export const isOrderAlert = (n) => n?.type === "order" || n?.type === "order_update";
export const orderAlertText = (n) =>
  n.type === "order"
    ? `${n.buyerName || "A buyer"} ordered ${n.listingName || "your item"}`
    : n.text || "Order update";
