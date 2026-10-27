import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { cartHelpers, useCartItems } from "../utils/Cart";
import { apiPost } from "../utils/api";
import { isPublicListing } from "../utils/categories";
import {
  NIGERIAN_STATES,
  PENDING_CHECKOUT_KEY,
  naira,
  savedDeliveryKey,
  stockOf,
  useFeeSettings,
} from "../utils/orders";
import { Ico, Spin } from "./Ico";

/*
 * Checkout (Jumia-style): the buyer pays Declutt (Paystack) or chooses pay on delivery.
 * Online payments are held by Declutt until the order is delivered and the return window has
 * passed, then paid out to the seller. Everything here is a preview — the server re-checks
 * every price, fee and item before taking any money.
 *
 * /checkout            → the cart
 * /checkout?buy=ID&qty=N → "Buy now" on one item
 */
const PHONE = /^(\+?234|0)[789][01]\d{8}$/;
const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all";

const readSaved = (uid) => {
  try {
    return JSON.parse(localStorage.getItem(savedDeliveryKey(uid)) || "null");
  } catch {
    return null;
  }
};

const Field = ({ label, error, hint, htmlFor, children }) => (
  <div className="flex flex-col gap-1.5 text-left">
    <label htmlFor={htmlFor} className="text-xs font-bold text-foreground/70">
      {label}
    </label>
    {children}
    {error ? (
      <p className="text-xs text-red-500 font-medium">{error}</p>
    ) : hint ? (
      <p className="text-[11px] text-foreground/40">{hint}</p>
    ) : null}
  </div>
);

const Section = ({ n, title, action, children }) => (
  <section className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-sm font-black text-foreground">
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
          {n}
        </span>
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const Choice = ({ checked, onChange, title, sub, badge, icon, name, value }) => (
  <label
    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all text-left ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${checked ? "bg-primary text-primary-foreground" : "bg-border/40 text-foreground/50"}`}
    >
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-foreground">{title}</span>
        {badge && (
          <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-600">
            {badge}
          </span>
        )}
      </span>
      <span className="block text-xs text-foreground/50 mt-0.5 leading-relaxed">{sub}</span>
    </span>
    <span
      className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 ${checked ? "border-primary bg-primary shadow-[inset_0_0_0_3px_hsl(var(--card))]" : "border-border"}`}
    />
  </label>
);

const Checkout = () => {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const buyId = params.get("buy");
  const buyQty = Math.max(1, Math.min(99, parseInt(params.get("qty") || "1", 10) || 1));
  const cart = useCartItems(uid);
  const fees = useFeeSettings();

  const lines = useMemo(
    () =>
      buyId
        ? [{ id: buyId, quantity: buyQty }]
        : cart.map((i) => ({
            id: i.id,
            quantity: i.quantity || 1,
            name: i.name,
            price: i.price,
            imageUrl: i.imageUrl,
          })),
    [buyId, buyQty, cart],
  );

  // Fresh listing data for every line (price, stock, seller) — the cart copy may be old
  const [live, setLive] = useState({}); // id → listing | null (deleted)
  const ids = lines.map((l) => l.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let alive = true;
    Promise.all(
      ids.split(",").map((id) =>
        getDoc(doc(db, "listings", id))
          .then((s) => [id, s.exists() ? { id, ...s.data() } : null])
          .catch(() => [id, null]),
      ),
    ).then((pairs) => alive && setLive((prev) => ({ ...prev, ...Object.fromEntries(pairs) })));
    return () => {
      alive = false;
    };
  }, [ids]);

  const [serverProblems, setServerProblems] = useState({});
  const items = lines.map((line) => {
    const l = live[line.id];
    const loaded = l !== undefined;
    const problem = !loaded
      ? null
      : !l || !isPublicListing(l) || l.available === false
        ? "No longer available"
        : l.sellerUid === uid
          ? "This is your own item"
          : line.quantity > stockOf(l)
            ? `Only ${stockOf(l)} available`
            : serverProblems[line.id] || null;
    return {
      ...line,
      loaded,
      problem,
      name: l?.name ?? line.name ?? "Item",
      price: Number(l?.price ?? line.price) || 0,
      imageUrl: l?.imageUrl || line.imageUrl || null,
      sellerUid: l?.sellerUid,
      sellerName: l?.sellerName || "Seller",
      location: l?.location || l?.state || "",
    };
  });
  const loading = items.some((i) => !i.loaded);
  const buyable = items.filter((i) => i.loaded && !i.problem);
  const groups = new Map(); // one order per seller
  items.forEach((i) => {
    const k = i.sellerUid || `x_${i.id}`;
    if (!groups.has(k)) groups.set(k, { name: i.sellerName, items: [] });
    groups.get(k).items.push(i);
  });
  const bySeller = [...groups.values()];
  const sellerCount = new Set(buyable.map((i) => i.sellerUid)).size;

  /* ── form ── */
  const [method, setMethod] = useState("delivery");
  const [payment, setPayment] = useState("online");
  const [form, setForm] = useState({ name: "", phone: "", address: "", state: "", note: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const payOnDelivery = payment === "pay_on_delivery" && fees.payOnDelivery;

  // "Use my saved details" (only when the buyer asks — nothing is filled in automatically)
  const saved = useMemo(() => {
    const s = readSaved(uid) || {};
    const d = {
      name: s.name || profile?.name || "",
      phone: s.phone || profile?.phone || "",
      address: s.address || profile?.address || "",
      state: s.state || profile?.state || "",
    };
    return d.phone || d.address ? d : null;
  }, [uid, profile]);

  const subtotal = buyable.reduce((n, i) => n + i.price * i.quantity, 0);
  const deliveryFees = method === "delivery" ? sellerCount * (Number(fees.deliveryFee) || 0) : 0;
  const total = subtotal + deliveryFees;

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Enter the receiver's name";
    if (!PHONE.test(form.phone.replace(/\s+/g, ""))) e.phone = "Enter a valid Nigerian phone number";
    if (method === "delivery") {
      if (form.address.trim().length < 8) e.address = "Enter the full delivery address";
      if (!form.state) e.state = "Choose a state";
    }
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || !buyable.length || busy) return;
    setBusy(true);
    setServerError("");
    try {
      localStorage.setItem(
        savedDeliveryKey(uid),
        JSON.stringify({ name: form.name, phone: form.phone, address: form.address, state: form.state }),
      );
    } catch {
      /* storage blocked — fine */
    }
    try {
      const res = await apiPost("checkout", {
        items: buyable.map((i) => ({ id: i.id, qty: i.quantity })),
        delivery: { method, ...form },
        payment: payOnDelivery ? "pay_on_delivery" : "online",
      });
      const bought = buyable.map((i) => i.id);
      if (!payOnDelivery) {
        try {
          sessionStorage.setItem(
            PENDING_CHECKOUT_KEY,
            JSON.stringify({ checkoutId: res.checkoutId, ids: bought, fromCart: !buyId }),
          );
        } catch {
          /* the cart just won't clear itself */
        }
        window.location.assign(res.authorizationUrl);
        return;
      }
      if (!buyId) bought.forEach((id) => cartHelpers.remove(uid, id));
      navigate(`/checkout/complete?placed=${res.checkoutId}`, { replace: true });
    } catch (err) {
      if (err.data?.problems)
        setServerProblems(Object.fromEntries(err.data.problems.map((p) => [p.id, p.reason])));
      setServerError(err.message);
      setBusy(false);
    }
  };

  if (!lines.length)
    return (
      <div className="max-w-md mx-auto px-4 pt-28 pb-20 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/8 text-primary/40 flex items-center justify-center">
          <Ico s={28} w={1.5} r>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </Ico>
        </div>
        <p className="text-lg font-black text-foreground">Your cart is empty</p>
        <p className="text-sm text-foreground/50">Add something you like, then come back to check out.</p>
        <Link to="/listings" className="main-button inline-flex text-sm px-5 py-2.5 font-semibold">
          Browse listings
        </Link>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-20 sm:pt-24">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5 sm:mb-7 text-left">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Checkout</h1>
          <p className="text-sm text-foreground/50 mt-1">
            {buyId ? "Buying one item" : `${lines.length} item${lines.length > 1 ? "s" : ""} from your cart`}
          </p>
        </div>
        <Link to="/listings" className="text-sm font-semibold text-primary hover:underline underline-offset-4">
          Continue shopping
        </Link>
      </div>

      <form onSubmit={submit} noValidate className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5 lg:gap-7 items-start">
        <div className="space-y-5 min-w-0">
          <Section n={1} title="How do you want to get it?">
            <div className="grid sm:grid-cols-2 gap-3">
              <Choice
                name="method"
                value="delivery"
                checked={method === "delivery"}
                onChange={() => setMethod("delivery")}
                title="Delivery"
                sub={
                  Number(fees.deliveryFee) > 0
                    ? `${naira(fees.deliveryFee)} per seller. The seller sends it to your address.`
                    : "The seller sends it to your address."
                }
                icon={
                  <Ico s={18} r>
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </Ico>
                }
              />
              <Choice
                name="method"
                value="pickup"
                checked={method === "pickup"}
                onChange={() => setMethod("pickup")}
                title="Pick up"
                sub="Collect it from the seller. They'll message you where and when."
                icon={
                  <Ico s={18} r>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </Ico>
                }
              />
            </div>
          </Section>

          <Section
            n={2}
            title={method === "delivery" ? "Delivery details" : "Your contact details"}
            action={
              saved && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, ...saved }));
                    setErrors({});
                  }}
                  className="text-xs font-bold text-primary hover:underline underline-offset-4"
                >
                  Use my saved details
                </button>
              )
            }
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Receiver's name" error={errors.name} htmlFor="co-name">
                <input
                  id="co-name"
                  autoComplete="off"
                  className={`${inputCls} ${errors.name ? "border-red-500/60" : "border-border"}`}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Full name"
                  maxLength={100}
                />
              </Field>
              <Field label="Phone number" error={errors.phone} htmlFor="co-phone" hint="The seller uses this to reach you">
                <input
                  id="co-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  className={`${inputCls} ${errors.phone ? "border-red-500/60" : "border-border"}`}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="0801 234 5678"
                  maxLength={20}
                />
              </Field>
              {method === "delivery" && (
                <>
                  <div className="sm:col-span-2">
                    <Field label="Delivery address" error={errors.address} htmlFor="co-address">
                      <textarea
                        id="co-address"
                        rows={2}
                        autoComplete="off"
                        className={`${inputCls} resize-none ${errors.address ? "border-red-500/60" : "border-border"}`}
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="House number, street, area, city"
                        maxLength={300}
                      />
                    </Field>
                  </div>
                  <Field label="State" error={errors.state} htmlFor="co-state">
                    <select
                      id="co-state"
                      className={`${inputCls} ${errors.state ? "border-red-500/60" : "border-border"}`}
                      value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                    >
                      <option value="">Choose a state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              <div className={method === "delivery" ? "" : "sm:col-span-2"}>
                <Field label="Note for the seller (optional)" htmlFor="co-note">
                  <input
                    id="co-note"
                    autoComplete="off"
                    className={`${inputCls} border-border`}
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                    placeholder={method === "delivery" ? "e.g. Call when you're at the gate" : "e.g. I can pick up on Saturday"}
                    maxLength={300}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section n={3} title="Payment">
            <div className="grid gap-3">
              <Choice
                name="payment"
                value="online"
                checked={!payOnDelivery}
                onChange={() => setPayment("online")}
                title="Pay now"
                badge="Buyer protection"
                sub="Card, bank transfer or USSD on Paystack's secure page. Declutt holds your money until you receive your order."
                icon={
                  <Ico s={18} r>
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </Ico>
                }
              />
              {fees.payOnDelivery && (
                <Choice
                  name="payment"
                  value="pay_on_delivery"
                  checked={payOnDelivery}
                  onChange={() => setPayment("pay_on_delivery")}
                  title={method === "pickup" ? "Pay at pickup" : "Pay on delivery"}
                  sub="Pay the seller (cash or transfer) when you get the item. Check it before you pay."
                  icon={
                    <Ico s={18} r>
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <circle cx="12" cy="12" r="2.5" />
                      <path d="M6 12h.01M18 12h.01" />
                    </Ico>
                  }
                />
              )}
            </div>
          </Section>
        </div>

        {/* ── Summary ── */}
        <aside className="lg:sticky lg:top-24 bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 text-left min-w-0">
          <h2 className="text-sm font-black text-foreground">Order summary</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-foreground/40 py-6 justify-center">
              <Spin s={18} /> Checking items…
            </div>
          ) : (
            <div className="space-y-4">
              {bySeller.map((group, gi) => (
                <div key={gi} className="space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/40 truncate">
                    From {group.name}
                  </p>
                  {group.items.map((i) => (
                    <div key={i.id} className={`flex items-center gap-3 ${i.problem ? "opacity-70" : ""}`}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-border/30 shrink-0">
                        {i.imageUrl && <img src={i.imageUrl} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{i.name}</p>
                        {i.problem ? (
                          <p className="text-xs font-semibold text-red-500">
                            {i.problem}
                            {!buyId && (
                              <button
                                type="button"
                                onClick={() => cartHelpers.remove(uid, i.id)}
                                className="ml-2 underline underline-offset-2"
                              >
                                Remove
                              </button>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-foreground/45">
                            {i.quantity} × {naira(i.price)}
                          </p>
                        )}
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${i.problem ? "line-through text-foreground/40" : "text-foreground"}`}>
                        {naira(i.price * i.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-foreground/60">
              <span>Items</span>
              <span className="font-semibold text-foreground">{naira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-foreground/60">
              <span>
                {method === "delivery" ? "Delivery" : "Pickup"}
                {method === "delivery" && sellerCount > 1 && Number(fees.deliveryFee) > 0 && (
                  <span className="text-foreground/40"> ({sellerCount} sellers)</span>
                )}
              </span>
              <span className="font-semibold text-foreground">
                {deliveryFees ? naira(deliveryFees) : "Free"}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-foreground">Total</span>
              <span className="text-xl font-black text-primary">{naira(total)}</span>
            </div>
          </div>

          {sellerCount > 1 && (
            <p className="text-xs text-foreground/50 bg-border/25 rounded-xl px-3 py-2">
              Items from {sellerCount} sellers come as {sellerCount} separate orders.
            </p>
          )}

          {serverError && (
            <p role="alert" className="text-xs font-semibold text-red-500 bg-red-500/8 rounded-xl px-3 py-2">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || loading || !buyable.length}
            className="main-button w-full py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy && <Spin />}
            {busy
              ? payOnDelivery
                ? "Placing order…"
                : "Opening Paystack…"
              : payOnDelivery
                ? `Place order · ${naira(total)}`
                : `Pay ${naira(total)} securely`}
          </button>

          <div className="flex items-start gap-2.5 text-xs text-foreground/55 leading-relaxed">
            <span className="text-emerald-600 shrink-0 mt-0.5">
              <Ico s={16} r>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </Ico>
            </span>
            {payOnDelivery ? (
              <span>
                You pay the seller when the item arrives. After delivery you have{" "}
                {fees.returnWindowDays} days to report a problem to Declutt.
              </span>
            ) : (
              <span>
                Declutt keeps your payment safe until you confirm delivery. If something's wrong,
                report it within {fees.returnWindowDays} days of delivery and we'll sort it out or
                refund you. Declutt never sees your card details.
              </span>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
