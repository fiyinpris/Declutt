import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { api, apiPost } from "../utils/api";
import {
  fmtDate,
  naira,
  nextPayoutDate,
  payoutStatus,
  shortOrderId,
  tsMs,
  useFeeSettings,
} from "../utils/orders";
import { Ico, Spin } from "./Ico";

/*
 * Seller → Payments (Jumia-style): money held by Declutt, what's in the next payout, the bank
 * account payouts go to, a downloadable statement of every deduction, and payout history.
 */

/** Live query (list) or document. undefined/null while loading. */
const useLive = (ref, isList) => {
  const [v, setV] = useState(isList ? null : undefined);
  useEffect(() => {
    if (!ref) return;
    return onSnapshot(
      ref,
      (s) => setV(isList ? s.docs.map((d) => ({ id: d.id, ...d.data() })) : s.exists() ? s.data() : null),
      (e) => {
        console.error("Payments:", e);
        setV(isList ? [] : null);
      },
    );
  }, [ref, isList]);
  return v;
};

const Card = ({ label, value, sub, accent }) => (
  <div
    className={`rounded-2xl p-4 text-left ${accent ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
  >
    <p className={`text-[11px] font-bold uppercase tracking-wide ${accent ? "text-primary-foreground/70" : "text-foreground/45"}`}>
      {label}
    </p>
    <p className={`text-xl sm:text-2xl font-black mt-1 ${accent ? "" : "text-foreground"}`}>{value}</p>
    {sub && <p className={`text-[11px] mt-0.5 ${accent ? "text-primary-foreground/70" : "text-foreground/45"}`}>{sub}</p>}
  </div>
);

/* ── Bank account ── */
const BankAccount = ({ account, profileName }) => {
  const [editing, setEditing] = useState(false);
  const [banks, setBanks] = useState(null);
  const [bankCode, setBankCode] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const showForm = editing || account === null;

  useEffect(() => {
    if (!showForm || banks) return;
    api("banks")
      .then((r) => setBanks(r.banks))
      .catch((e) => {
        setBanks([]);
        setError(e.message);
      });
  }, [showForm, banks]);

  const save = async (e) => {
    e.preventDefault();
    if (!bankCode) return setError("Choose your bank.");
    if (!/^\d{10}$/.test(number)) return setError("Account numbers are 10 digits.");
    setBusy(true);
    setError("");
    try {
      await apiPost("payout-account", {
        bankCode,
        bankName: banks.find((b) => b.code === bankCode)?.name || "",
        accountNumber: number,
      });
      setEditing(false);
      setNumber("");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const status = !account
    ? null
    : account.nameMatches
      ? { cls: "text-emerald-600", text: "Verified — name matches" }
      : account.nameOverride
        ? { cls: "text-emerald-600", text: "Approved by Declutt" }
        : { cls: "text-amber-600", text: "Name doesn't match — payouts on hold until Declutt checks it" };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-foreground">Payout bank account</p>
        {account && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-bold text-primary hover:underline underline-offset-4"
          >
            Change
          </button>
        )}
      </div>

      {account === undefined ? (
        <Spin />
      ) : !showForm ? (
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Ico s={18} r>
              <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
            </Ico>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {account.accountName}
            </p>
            <p className="text-xs text-foreground/55">
              {account.bankName} ·••••{account.accountLast4}
            </p>
            <p className={`text-[11px] font-semibold mt-0.5 ${status.cls}`}>{status.text}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <p className="text-xs text-foreground/55 leading-relaxed">
            The account name must match your name on Declutt
            {profileName ? ` (${profileName})` : ""}, or your payouts are put on hold until we check it.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              aria-label="Bank"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/60"
            >
              <option value="">{banks ? "Choose your bank" : "Loading banks…"}</option>
              {(banks || []).map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="10-digit account number"
              aria-label="Account number"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/60"
            />
          </div>
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="main-button text-xs px-4 py-2.5 font-bold flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy && <Spin s={12} />}
              Verify & save
            </button>
            {account && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-foreground/60 hover:bg-border/40"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="text-[11px] text-foreground/40">
            We check the account with your bank through Paystack. Declutt only keeps the last 4 digits.
          </p>
        </form>
      )}
    </div>
  );
};

/* ── Statement ── */
const monthKey = (t) => {
  const d = new Date(tsMs(t));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthName = (k) =>
  new Date(`${k}-01T12:00:00`).toLocaleString("en-NG", { month: "long", year: "numeric" });

const toCsv = (rows) =>
  rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

const Statement = ({ orders }) => {
  const months = useMemo(
    () => [...new Set(orders.map((o) => monthKey(o.createdAt)))].sort().reverse(),
    [orders],
  );
  const [month, setMonth] = useState("all");
  const rows = orders.filter((o) => month === "all" || monthKey(o.createdAt) === month);
  const sum = (k) => rows.reduce((n, o) => n + (Number(o[k]) || 0), 0);
  const counted = rows.filter((o) => !["cancelled", "refunded"].includes(o.status));
  const net = counted.reduce((n, o) => n + (Number(o.sellerNet) || 0), 0) - sum("penalty");

  const download = () => {
    const csv = toCsv([
      ["Date", "Order", "Items", "Payment", "Status", "Total (NGN)", "Commission", "Fulfilment fee", "Penalty", "Net to you", "Payout status"],
      ...rows.map((o) => [
        fmtDate(o.createdAt),
        shortOrderId(o.id),
        o.items?.map((i) => `${i.qty}x ${i.name}`).join("; "),
        o.paymentMethod === "online" ? "Online" : "Pay on delivery",
        o.status,
        o.total,
        o.commission || 0,
        o.fulfilmentFee || 0,
        o.penalty || 0,
        ["cancelled", "refunded"].includes(o.status) ? 0 : o.sellerNet,
        payoutStatus(o).label,
      ]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `declutt-statement-${month}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-foreground">Account statement</p>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Statement month"
            className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">All time</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={download}
            disabled={!rows.length}
            className="px-3 py-2 rounded-xl border border-border text-xs font-bold text-foreground/70 hover:text-primary hover:border-primary/40 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Ico s={13} r>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </Ico>
            CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[
          ["Sales", naira(counted.reduce((n, o) => n + (Number(o.total) || 0), 0))],
          ["Commission", `− ${naira(counted.reduce((n, o) => n + (Number(o.commission) || 0), 0))}`],
          ["Fees & penalties", `− ${naira(counted.reduce((n, o) => n + (Number(o.fulfilmentFee) || 0), 0) + sum("penalty"))}`],
          ["Net to you", naira(net)],
        ].map(([k, v]) => (
          <div key={k} className="bg-background border border-border/70 rounded-xl px-3 py-2">
            <p className="text-foreground/45 font-semibold">{k}</p>
            <p className="text-sm font-black text-foreground mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-foreground/45 text-center py-6">No sales in this period yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-left text-foreground/45 border-b border-border">
                <th className="font-semibold py-2 px-4 sm:px-2">Date</th>
                <th className="font-semibold py-2 px-2">Order</th>
                <th className="font-semibold py-2 px-2 text-right">Total</th>
                <th className="font-semibold py-2 px-2 text-right">Commission</th>
                <th className="font-semibold py-2 px-2 text-right">Fees</th>
                <th className="font-semibold py-2 px-2 text-right">Net</th>
                <th className="font-semibold py-2 px-4 sm:px-2">Payout</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const void_ = ["cancelled", "refunded"].includes(o.status);
                return (
                  <tr key={o.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-4 sm:px-2 whitespace-nowrap text-foreground/60">{fmtDate(o.createdAt)}</td>
                    <td className="py-2.5 px-2">
                      <p className="font-bold text-foreground">{shortOrderId(o.id)}</p>
                      <p className="text-foreground/45 truncate max-w-[180px]">
                        {o.paymentMethod === "online" ? "Online" : "Pay on delivery"} · {o.status}
                      </p>
                    </td>
                    <td className={`py-2.5 px-2 text-right font-semibold ${void_ ? "line-through text-foreground/35" : ""}`}>
                      {naira(o.total)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-foreground/60">{void_ ? "—" : `−${naira(o.commission)}`}</td>
                    <td className="py-2.5 px-2 text-right text-foreground/60">
                      {(o.fulfilmentFee && !void_) || o.penalty
                        ? `−${naira((void_ ? 0 : o.fulfilmentFee || 0) + (o.penalty || 0))}`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-black text-foreground">
                      {void_ ? (o.penalty ? `−${naira(o.penalty)}` : "₦0") : naira(o.sellerNet)}
                    </td>
                    <td className="py-2.5 px-4 sm:px-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${payoutStatus(o).cls}`}>
                        {payoutStatus(o).label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const PAYOUT_TONE = {
  paid: "bg-emerald-500/12 text-emerald-600",
  processing: "bg-violet-500/12 text-violet-500",
  failed: "bg-red-500/12 text-red-500",
  on_hold: "bg-amber-500/12 text-amber-600",
};

const SellerPayments = ({ uid, profile }) => {
  const fees = useFeeSettings();
  const ordersQ = useMemo(() => uid && query(collection(db, "orders"), where("sellerUid", "==", uid)), [uid]);
  const payoutsQ = useMemo(() => uid && query(collection(db, "payouts"), where("sellerUid", "==", uid)), [uid]);
  const accountRef = useMemo(() => uid && doc(db, "sellerPayoutAccounts", uid), [uid]);
  const orderDocs = useLive(ordersQ, true);
  const payoutDocs = useLive(payoutsQ, true);
  const account = useLive(accountRef, false);

  if (!orderDocs || !payoutDocs)
    return (
      <div className="flex justify-center py-20 text-foreground/30">
        <Spin s={24} />
      </div>
    );

  const orders = orderDocs
    .filter((o) => o.status !== "pending_payment" && !(o.status === "cancelled" && o.paymentStatus === "unpaid"))
    .sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  const total = (list, k = "sellerNet") => list.reduce((n, o) => n + (Number(o[k]) || 0), 0);
  const held = total(orders.filter((o) => o.payoutStatus === "held"));
  const owed =
    orders
      .filter((o) => o.payoutStatus === "commission_owed")
      .reduce((n, o) => n + (Number(o.commission) || 0) + (Number(o.fulfilmentFee) || 0), 0) +
    total(orders.filter((o) => o.penaltyStatus === "owed"), "penalty");
  const ready = total(orders.filter((o) => o.payoutStatus === "eligible")) - owed;
  const hold = payoutDocs.find((p) => p.status === "on_hold");
  const history = payoutDocs
    .filter((p) => p.status !== "on_hold")
    .sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  const paidOut = history.filter((p) => p.status === "paid").reduce((n, p) => n + (p.amount || 0), 0);
  const rates = Object.entries(fees.commission)
    .map(([c, r]) => `${c} ${r}%`)
    .join(" · ");

  return (
    <div className="space-y-5">
      <div className="text-left">
        <p className="text-2xl font-black text-foreground">Payments</p>
        <p className="text-xs text-foreground/45 mt-0.5">
          Next payout: {fmtDate(nextPayoutDate().getTime())}
        </p>
      </div>

      {hold && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-left">
          <span className="text-amber-600 shrink-0 mt-0.5">
            <Ico s={18} r>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </Ico>
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Your payout of {naira(hold.amount)} is on hold</p>
            <p className="text-xs text-foreground/60 mt-0.5">{hold.reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Ready for payout" value={naira(Math.max(0, ready))} sub={`Paid ${fmtDate(nextPayoutDate().getTime())}`} accent />
        <Card label="Held by Declutt" value={naira(held)} sub="Until delivery + return window" />
        <Card label="Fees owed" value={naira(owed)} sub="From pay-on-delivery orders" />
        <Card label="Paid out" value={naira(paidOut)} sub={`${history.filter((p) => p.status === "paid").length} payouts`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <BankAccount account={account} profileName={profile?.name} />

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 text-left space-y-3">
          <p className="text-sm font-black text-foreground">How you get paid</p>
          <ol className="space-y-2.5 text-xs text-foreground/65 leading-relaxed">
            {[
              "The buyer pays Declutt when they order (or pays you on delivery).",
              `You accept and deliver. The buyer confirms they got it — or it's confirmed automatically ${fees.autoConfirmDays} days after you send it.`,
              `The buyer has ${fees.returnWindowDays} days after delivery to report a problem. Then the money is released.`,
              "Every month closes on its last day. You're paid by the 5th business day after, straight to your bank account.",
              `Declutt takes a commission (${rates})${fees.fulfilmentFee > 0 ? ` and a ${naira(fees.fulfilmentFee)} fulfilment fee per order` : ""}. Fees on pay-on-delivery orders and any penalties come off your next payout.`,
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/12 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Statement orders={orders} />

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 text-left space-y-3">
        <p className="text-sm font-black text-foreground">Payout history</p>
        {history.length === 0 ? (
          <p className="text-sm text-foreground/45 text-center py-6">No payouts yet.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {history.map((p) => (
              <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">{naira(p.amount)}</p>
                  <p className="text-[11px] text-foreground/45">
                    {fmtDate(p.paidAt || p.createdAt)} · {p.bankName} ••••{p.accountLast4} ·{" "}
                    {p.orderIds?.length || 0} orders
                  </p>
                  <p className="text-[11px] text-foreground/45">
                    Sales {naira(p.gross)} − commission {naira(p.commission)}
                    {p.fulfilmentFee ? ` − fulfilment ${naira(p.fulfilmentFee)}` : ""}
                    {p.otherDeductions ? ` − other ${naira(p.otherDeductions)}` : ""}
                  </p>
                  {p.status === "failed" && p.error && (
                    <p className="text-[11px] text-red-500 mt-0.5">{p.error} — it'll be retried.</p>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${PAYOUT_TONE[p.status] || PAYOUT_TONE.processing}`}>
                  {p.status === "processing" ? "On its way" : p.status === "paid" ? "Paid" : p.status === "failed" ? "Failed" : p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerPayments;
