import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { api, apiPost } from "../utils/api";
import { CATEGORIES } from "../utils/categories";
import {
  DEFAULT_FEES,
  fmtDate,
  naira,
  nextPayoutDate,
  shortOrderId,
  useFeeSettings,
} from "../utils/orders";
import { OrderCard } from "./Orders";
import { Spin } from "./Ico";

/*
 * Admin: every order (disputes, refunds, cancellations), seller payouts, and the fees/policies
 * the server uses. Reads and writes here are admin-only in firestore.rules; order changes and
 * payouts go through the server (/api), which checks admin rights again.
 */

const Card = ({ title, right, children, pad = true }) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden text-left">
    <div className="px-4 sm:px-5 py-3.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-bold text-foreground">{title}</p>
      {right}
    </div>
    <div className={pad ? "p-4 sm:p-5" : ""}>{children}</div>
  </div>
);

const Stat = ({ label, value, sub, alert }) => (
  <div className={`bg-card border rounded-2xl px-4 py-3.5 text-left ${alert ? "border-primary/40" : "border-border"}`}>
    <p className={`text-xl sm:text-2xl font-black ${alert ? "text-primary" : "text-foreground"}`}>{value}</p>
    <p className="text-xs font-semibold text-foreground/55 mt-0.5">{label}</p>
    {sub && <p className="text-[11px] text-foreground/40 mt-0.5">{sub}</p>}
  </div>
);

const useCollection = (q) => {
  const [rows, setRows] = useState(null);
  useEffect(
    () =>
      onSnapshot(
        q,
        (s) => setRows(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => {
          console.error("Admin:", e);
          setRows([]);
        },
      ),
    [q],
  );
  return rows;
};

const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(300));
const payoutsQuery = query(collection(db, "payouts"), orderBy("createdAt", "desc"), limit(150));
const accountsQuery = collection(db, "sellerPayoutAccounts");

/* ───────────── Orders ───────────── */
const FILTERS = [
  ["attention", "Needs attention", (o) => o.status === "disputed" || (o.paymentStatus === "paid" && ["cancelled", "refunded"].includes(o.status))],
  ["active", "Active", (o) => ["placed", "confirmed", "shipped", "delivered"].includes(o.status)],
  ["completed", "Completed", (o) => o.status === "completed"],
  ["cancelled", "Cancelled / refunded", (o) => ["cancelled", "refunded"].includes(o.status)],
  ["unpaid", "Unpaid", (o) => o.status === "pending_payment"],
  ["all", "All", () => true],
];

export const AdminOrdersPanel = () => {
  const orders = useCollection(ordersQuery);
  const fees = useFeeSettings();
  const [filter, setFilter] = useState("attention");
  const [search, setSearch] = useState("");

  if (!orders)
    return (
      <div className="flex justify-center py-16 text-foreground/30">
        <Spin s={24} />
      </div>
    );

  const real = orders.filter((o) => o.status !== "pending_payment" && !(o.status === "cancelled" && o.paymentStatus === "unpaid"));
  const live = real.filter((o) => !["cancelled", "refunded"].includes(o.status));
  const gmv = live.reduce((n, o) => n + (o.total || 0), 0);
  const earned = real
    .filter((o) => o.status === "completed")
    .reduce((n, o) => n + (o.commission || 0) + (o.fulfilmentFee || 0), 0);
  const held = real.filter((o) => o.payoutStatus === "held").reduce((n, o) => n + (o.total || 0), 0);
  const attention = orders.filter(FILTERS[0][2]).length;

  const q = search.trim().toLowerCase();
  const shown = orders
    .filter((FILTERS.find((f) => f[0] === filter) || FILTERS[0])[2])
    .filter(
      (o) =>
        !q ||
        shortOrderId(o.id).toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.buyerName?.toLowerCase().includes(q) ||
        o.sellerName?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.name?.toLowerCase().includes(q)),
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sales (GMV)" value={naira(gmv)} sub={`${live.length} orders`} />
        <Stat label="Declutt earned" value={naira(earned)} sub="Commission + fees on completed orders" />
        <Stat label="Held for sellers" value={naira(held)} sub="Paid online, not yet released" />
        <Stat label="Needs attention" value={attention} sub="Disputes & refunds" alert={attention > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(([id, label, match]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 ${filter === id ? "bg-primary text-primary-foreground" : "bg-border/40 text-foreground/55 hover:bg-border/70"}`}
            >
              {label} ({orders.filter(match).length})
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order, buyer, seller, item"
          aria-label="Search orders"
          className="ml-auto w-full sm:w-64 px-3.5 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/60"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-foreground/45 text-center py-12">
          {filter === "attention" ? "Nothing needs your attention right now." : "No orders here."}
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 items-start">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} viewer="seller" fees={fees} admin />
          ))}
        </div>
      )}
    </div>
  );
};

/* ───────────── Payouts ───────────── */
const PAYOUT_TONE = {
  paid: "bg-emerald-500/12 text-emerald-600",
  processing: "bg-violet-500/12 text-violet-500",
  failed: "bg-red-500/12 text-red-500",
  on_hold: "bg-amber-500/12 text-amber-600",
};

/* Paying a seller by bank transfer (Paystack Starter Business): shows the exact amount and the
   seller's bank details, then records the payout once the admin confirms they've sent it */
const ManualPayoutDialog = ({ seller, onClose, onDone }) => {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    apiPost("payout-manual", { sellerUid: seller.uid, preview: true })
      .then((r) => alive && setInfo(r))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [seller.uid]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await apiPost("payout-manual", { sellerUid: seller.uid, amount: info.amount, reference });
      onDone(`Recorded ${naira(r.amount)} paid to ${info.sellerName}.`);
    } catch (e) {
      if (e.data?.summary) {
        setInfo(e.data.summary);
        setSent(false);
      }
      setError(e.message);
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.bank.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the number is on screen */
    }
  };

  const bank = info?.bank;
  const blocked = info && info.amount > 0 && (!bank || !bank.accountNumber || !bank.nameOk);

  return (
    <div className="fixed inset-0 z-80 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={busy ? undefined : onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl p-5 space-y-4 text-left max-h-[92dvh] overflow-y-auto">
        <p className="text-base font-black text-foreground">Pay {info?.sellerName || seller.name}</p>
        {!info && !error && (
          <div className="flex justify-center py-8 text-foreground/30">
            <Spin s={22} />
          </div>
        )}
        {info && (
          <>
            <div className="rounded-xl bg-primary/8 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/50">Amount to send</p>
              <p className="text-3xl font-black text-primary">{naira(info.amount)}</p>
              <p className="text-[11px] text-foreground/50 mt-1">
                {info.orderCount} order{info.orderCount === 1 ? "" : "s"} · sales {naira(info.gross)} − commission{" "}
                {naira(info.commission)}
                {info.fulfilmentFee ? ` − fulfilment ${naira(info.fulfilmentFee)}` : ""}
                {info.otherDeductions ? ` − fees owed & penalties ${naira(info.otherDeductions)}` : ""}
              </p>
            </div>

            {info.amount > 0 &&
              (!bank ? (
                <p className="text-xs font-semibold text-red-500 bg-red-500/8 rounded-xl px-3 py-2">
                  This seller hasn't added a bank account yet. Ask them to add one in Payments.
                </p>
              ) : (
                <div className="border border-border rounded-xl divide-y divide-border/60 text-sm">
                  <div className="flex justify-between gap-3 px-3.5 py-2.5">
                    <span className="text-foreground/50">Bank</span>
                    <span className="font-semibold text-foreground text-right">{bank.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 px-3.5 py-2.5">
                    <span className="text-foreground/50">Account number</span>
                    {bank.accountNumber ? (
                      <span className="flex items-center gap-2">
                        <span className="font-black text-foreground tracking-wider">{bank.accountNumber}</span>
                        <button type="button" onClick={copy} className="text-[11px] font-bold text-primary">
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 text-right">
                        Not saved — ask the seller to add their bank account again
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between gap-3 px-3.5 py-2.5">
                    <span className="text-foreground/50">Account name</span>
                    <span className="font-semibold text-foreground text-right">{bank.accountName}</span>
                  </div>
                  {!bank.nameOk && (
                    <p className="px-3.5 py-2.5 text-xs font-semibold text-amber-600">
                      This name doesn't match the seller's Declutt name. Approve it under "Bank names to check" first.
                    </p>
                  )}
                </div>
              ))}

            {!blocked && (
              <>
                {info.amount > 0 && (
                  <>
                    <p className="text-xs text-foreground/60 leading-relaxed">
                      Send exactly <span className="font-bold text-foreground">{naira(info.amount)}</span> to this
                      account from your bank app, then record it here. The seller sees it in their Payments tab.
                    </p>
                    <label className="block text-xs font-bold text-foreground/70">
                      Transfer reference (optional)
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        maxLength={100}
                        placeholder="e.g. the session ID from your bank receipt"
                        className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-normal text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/60"
                      />
                    </label>
                  </>
                )}
                <label className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sent}
                    onChange={(e) => setSent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[hsl(var(--primary))]"
                  />
                  {info.amount > 0
                    ? `I've sent ${naira(info.amount)} to this account`
                    : "Nothing to send — the fees this seller owed cancel out their sales. Settle them."}
                </label>
              </>
            )}
          </>
        )}
        {error && <p className="text-xs font-semibold text-red-500 bg-red-500/8 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground/60 hover:bg-border/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!info || blocked || !sent || busy}
            className="main-button px-4 py-2.5 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {busy && <Spin s={13} />}
            Mark as paid
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminPayoutsPanel = () => {
  const orders = useCollection(ordersQuery);
  const payouts = useCollection(payoutsQuery);
  const accounts = useCollection(accountsQuery);
  const fees = useFeeSettings();
  const manual = fees.payoutMethod !== "paystack";
  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);
  const [paying, setPaying] = useState(null);

  const run = async (payNow) => {
    if (payNow && !window.confirm("Send every seller their eligible balance now, instead of waiting for the monthly payout day?"))
      return;
    setRunning(payNow ? "pay" : "check");
    setResult(null);
    try {
      const r = await apiPost("payouts-run", { payNow });
      setResult({
        ok: true,
        text: `Done — ${r.expired} unpaid checkouts closed, ${r.autoDelivered} auto-delivered, ${r.completed} completed${r.payoutDue ? `, ${r.paid} payouts sent, ${r.onHold} on hold, ${r.failed} failed` : ""}${r.manualDue ? `, ${r.manualDue} seller${r.manualDue === 1 ? "" : "s"} to pay by bank transfer` : ""}.`,
      });
    } catch (e) {
      setResult({ ok: false, text: e.message });
    }
    setRunning(null);
  };

  const approve = (uid) =>
    updateDoc(doc(db, "sellerPayoutAccounts", uid), { nameOverride: true }).catch((e) =>
      setResult({ ok: false, text: e.message }),
    );

  // What each seller is owed right now
  const upcoming = useMemo(() => {
    if (!orders) return [];
    const m = new Map();
    const row = (o) => {
      if (!m.has(o.sellerUid)) m.set(o.sellerUid, { uid: o.sellerUid, name: o.sellerName, eligible: 0, owed: 0, held: 0, orders: 0 });
      return m.get(o.sellerUid);
    };
    orders.forEach((o) => {
      if (o.payoutStatus === "eligible") {
        row(o).eligible += o.sellerNet || 0;
        row(o).orders++;
      }
      if (o.payoutStatus === "held") row(o).held += o.sellerNet || 0;
      if (o.payoutStatus === "commission_owed") row(o).owed += (o.commission || 0) + (o.fulfilmentFee || 0);
      if (o.penaltyStatus === "owed") row(o).owed += o.penalty || 0;
    });
    return [...m.values()].sort((a, b) => b.eligible - a.eligible);
  }, [orders]);

  if (!orders || !payouts || !accounts)
    return (
      <div className="flex justify-center py-16 text-foreground/30">
        <Spin s={24} />
      </div>
    );

  const acct = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const holds = payouts.filter((p) => p.status === "on_hold");
  const history = payouts.filter((p) => p.status !== "on_hold");
  const mismatched = accounts.filter((a) => !a.nameMatches && !a.nameOverride);

  return (
    <div className="space-y-5">
      <Card
        title="Payout cycle"
        right={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => run(false)}
              disabled={!!running}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-foreground/70 hover:border-primary/40 hover:text-primary flex items-center gap-1.5 disabled:opacity-60"
            >
              {running === "check" && <Spin s={12} />}
              Run daily checks
            </button>
            {!manual && (
              <button
                type="button"
                onClick={() => run(true)}
                disabled={!!running}
                className="main-button px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                {running === "pay" && <Spin s={12} />}
                Pay all eligible now
              </button>
            )}
          </div>
        }
      >
        <p className="text-sm text-foreground/65 leading-relaxed">
          {manual ? (
            <>
              You pay sellers yourself: by the 5th business day after each month closes — next by{" "}
              <span className="font-bold text-foreground">{fmtDate(nextPayoutDate().getTime())}</span> — send each
              seller their "Ready" amount by bank transfer, then click <span className="font-bold text-foreground">Mark as paid</span>.
            </>
          ) : (
            <>
              Sellers are paid automatically for each calendar month on the 5th business day after it
              closes — next on <span className="font-bold text-foreground">{fmtDate(nextPayoutDate().getTime())}</span>.
            </>
          )}{" "}
          Every morning the server also closes unpaid checkouts, confirms delivery on orders shipped
          long ago and releases orders whose return window has ended.
        </p>
        {result && (
          <p className={`mt-3 text-xs font-semibold rounded-xl px-3 py-2 ${result.ok ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/8"}`}>
            {result.text}
          </p>
        )}
      </Card>

      {mismatched.length > 0 && (
        <Card title={`Bank names to check (${mismatched.length})`}>
          <div className="divide-y divide-border/60 -my-2">
            {mismatched.map((a) => (
              <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 text-sm">
                  <p className="font-bold text-foreground">{a.sellerName || "Seller"}</p>
                  <p className="text-xs text-foreground/55">
                    Bank says: <span className="font-semibold text-foreground/80">{a.accountName}</span> · {a.bankName} ••••{a.accountLast4}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => approve(a.id)}
                  className="px-3.5 py-2 rounded-xl border border-emerald-600/40 text-emerald-600 text-xs font-bold hover:bg-emerald-500/10"
                >
                  Approve — it's the same person
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-foreground/40 mt-3">
            Only approve after checking the seller's ID or business documents.
          </p>
        </Card>
      )}

      <Card title="What sellers are owed" pad={false}>
        {upcoming.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-foreground/40">No seller balances yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="text-left text-foreground/45 border-b border-border">
                  <th className="font-semibold py-2.5 px-4">Seller</th>
                  <th className="font-semibold py-2.5 px-2 text-right">Held</th>
                  <th className="font-semibold py-2.5 px-2 text-right">Ready</th>
                  <th className="font-semibold py-2.5 px-2 text-right">Owes</th>
                  <th className="font-semibold py-2.5 px-4">Bank account</th>
                  {manual && <th className="py-2.5 px-4" />}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((s) => {
                  const a = acct[s.uid];
                  return (
                    <tr key={s.uid} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{s.name}</td>
                      <td className="py-2.5 px-2 text-right text-foreground/60">{naira(s.held)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-foreground">{naira(s.eligible)}</td>
                      <td className="py-2.5 px-2 text-right text-foreground/60">{s.owed ? naira(s.owed) : "—"}</td>
                      <td className="py-2.5 px-4">
                        {!a ? (
                          <span className="text-amber-600 font-semibold">Not added</span>
                        ) : a.nameMatches || a.nameOverride ? (
                          <span className="text-foreground/60">
                            {a.bankName} ••••{a.accountLast4}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold">Name mismatch</span>
                        )}
                      </td>
                      {manual && (
                        <td className="py-2 px-4 text-right">
                          {s.eligible > 0 && (
                            <button
                              type="button"
                              onClick={() => setPaying(s)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold whitespace-nowrap hover:bg-primary/90"
                            >
                              Mark as paid
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {holds.length > 0 && (
        <Card title={`On hold (${holds.length})`}>
          <div className="divide-y divide-border/60 -my-2">
            {holds.map((p) => (
              <div key={p.id} className="py-3 text-sm">
                <p className="font-bold text-foreground">
                  {p.sellerName} · {naira(p.amount)}
                </p>
                <p className="text-xs text-foreground/55">{p.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {paying && (
        <ManualPayoutDialog
          seller={paying}
          onClose={() => setPaying(null)}
          onDone={(text) => {
            setPaying(null);
            setResult({ ok: true, text });
          }}
        />
      )}

      <Card title="Payout history" pad={false}>
        {history.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-foreground/40">No payouts yet.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {history.map((p) => (
              <div key={p.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {p.sellerName} · {naira(p.amount)}
                  </p>
                  <p className="text-[11px] text-foreground/45">
                    {fmtDate(p.createdAt, true)} ·{" "}
                    {p.method === "manual"
                      ? `bank transfer${p.reference ? ` (ref ${p.reference})` : ""}`
                      : p.cycle === "early" || p.cycle === "manual"
                        ? "paid early"
                        : `for ${p.cycle}`}{" "}
                    ·{" "}
                    {p.bankName} ••••{p.accountLast4} · sales {naira(p.gross)} − commission {naira(p.commission)}
                    {p.fulfilmentFee ? ` − fulfilment ${naira(p.fulfilmentFee)}` : ""}
                    {p.otherDeductions ? ` − other ${naira(p.otherDeductions)}` : ""}
                  </p>
                  {p.error && <p className="text-[11px] text-red-500">{p.error}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${PAYOUT_TONE[p.status] || PAYOUT_TONE.processing}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* ───────────── Fees & policies ───────────── */
const NumField = ({ label, hint, value, onChange, suffix, min = 0, max }) => (
  <label className="flex flex-col gap-1.5 text-left">
    <span className="text-xs font-bold text-foreground/70">{label}</span>
    <span className="flex items-center rounded-xl border border-border bg-background focus-within:border-primary/60">
      <input
        type="number"
        min={min}
        max={max}
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-sm text-foreground focus:outline-none"
      />
      {suffix && <span className="pr-3.5 text-xs font-semibold text-foreground/45">{suffix}</span>}
    </span>
    {hint && <span className="text-[11px] text-foreground/40">{hint}</span>}
  </label>
);

export const FeeSettingsPanel = () => {
  const fees = useFeeSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);
  const [check, setCheck] = useState(null);
  const values = form || fees;
  const set = (k, v) => setForm({ ...values, [k]: v });
  const setRate = (c, v) => setForm({ ...values, commission: { ...values.commission, [c]: v } });

  const save = async (e) => {
    e.preventDefault();
    const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
    const clean = {
      commission: Object.fromEntries(CATEGORIES.map((c) => [c, num(values.commission[c], 0, 50)])),
      deliveryFee: Math.round(num(values.deliveryFee, 0, 1_000_000)),
      fulfilmentFee: Math.round(num(values.fulfilmentFee, 0, 1_000_000)),
      sellerCancelPenalty: Math.round(num(values.sellerCancelPenalty, 0, 1_000_000)),
      returnWindowDays: Math.round(num(values.returnWindowDays, 1, 30)),
      autoConfirmDays: Math.round(num(values.autoConfirmDays, 1, 30)),
      payOnDelivery: !!values.payOnDelivery,
      payoutMethod: values.payoutMethod === "paystack" ? "paystack" : "manual",
    };
    setSaving(true);
    setNote(null);
    try {
      await setDoc(doc(db, "settings", "fees"), clean);
      setForm(null);
      setNote({ ok: true, text: "Saved. New orders use these straight away." });
    } catch (err) {
      setNote({ ok: false, text: err.message });
    }
    setSaving(false);
  };

  const testServer = async () => {
    setCheck({ busy: true });
    try {
      const r = await api("setup-check");
      const ok = r.firebase === "ok" && r.paystack === "ok";
      setCheck({
        ok,
        lines: [
          r.firebase === "ok" ? "✓ Firebase server key works" : `✗ Firebase: ${r.firebase}`,
          r.paystack === "ok"
            ? `✓ Paystack key works (${r.mode === "live" ? "LIVE — real money" : "test mode"})`
            : `✗ Paystack: ${r.paystack}`,
          r.cron ? "✓ CRON_SECRET is set" : "✗ CRON_SECRET is missing (daily payouts job won't run)",
        ],
      });
    } catch (e) {
      setCheck({ ok: false, lines: [e.message] });
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
      <form onSubmit={save}>
        <Card title="Fees & policies">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-foreground/45 mb-2.5">
                Commission by category
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {CATEGORIES.map((c) => (
                  <NumField
                    key={c}
                    label={c}
                    suffix="%"
                    max={50}
                    value={values.commission[c] ?? DEFAULT_FEES.commission[c]}
                    onChange={(v) => setRate(c, v)}
                  />
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <NumField
                label="Delivery fee"
                suffix="₦"
                hint="Buyer pays per seller when they choose delivery (goes to the seller)"
                value={values.deliveryFee}
                onChange={(v) => set("deliveryFee", v)}
              />
              <NumField
                label="Fulfilment fee"
                suffix="₦"
                hint="Charged to the seller per order"
                value={values.fulfilmentFee}
                onChange={(v) => set("fulfilmentFee", v)}
              />
              <NumField
                label="Seller cancel penalty"
                suffix="₦"
                hint="When a seller cancels a paid order"
                value={values.sellerCancelPenalty}
                onChange={(v) => set("sellerCancelPenalty", v)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <NumField
                label="Return window"
                suffix="days"
                min={1}
                max={30}
                hint="After delivery, before the seller is paid (Jumia uses 7–14)"
                value={values.returnWindowDays}
                onChange={(v) => set("returnWindowDays", v)}
              />
              <NumField
                label="Auto-confirm delivery after"
                suffix="days"
                min={1}
                max={30}
                hint="If the buyer doesn't confirm a shipped order"
                value={values.autoConfirmDays}
                onChange={(v) => set("autoConfirmDays", v)}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!values.payOnDelivery}
                onChange={(e) => set("payOnDelivery", e.target.checked)}
                className="w-4 h-4 accent-[hsl(var(--primary))]"
              />
              <span className="text-sm text-foreground">
                Allow pay on delivery
                <span className="block text-[11px] text-foreground/45">
                  The buyer pays the seller directly; Declutt's fees come off the seller's next payout.
                </span>
              </span>
            </label>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-foreground/45 mb-2.5">
                How sellers get paid
              </p>
              <div className="grid gap-2">
                {[
                  [
                    "manual",
                    "I pay sellers myself",
                    "For a Paystack Starter Business. By payout day, send each seller their balance by bank transfer, then click “Mark as paid” in Payouts.",
                  ],
                  [
                    "paystack",
                    "Automatic Paystack transfers",
                    "Registered Business only. Declutt sends payouts from your Paystack balance on payout day.",
                  ],
                ].map(([id, title, sub]) => (
                  <label
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${(values.payoutMethod || "manual") === id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <input
                      type="radio"
                      name="payoutMethod"
                      checked={(values.payoutMethod || "manual") === id}
                      onChange={() => set("payoutMethod", id)}
                      className="mt-1 accent-[hsl(var(--primary))]"
                    />
                    <span className="text-sm text-foreground">
                      {title}
                      <span className="block text-[11px] text-foreground/45">{sub}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {note && (
              <p className={`text-xs font-semibold rounded-xl px-3 py-2 ${note.ok ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/8"}`}>
                {note.text}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !form}
                className="main-button px-5 py-2.5 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {saving && <Spin s={13} />}
                Save changes
              </button>
              {form && (
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground/60 hover:bg-border/40"
                >
                  Discard
                </button>
              )}
            </div>
          </div>
        </Card>
      </form>

      <Card title="Payment setup">
        <div className="space-y-3 text-xs text-foreground/65 leading-relaxed">
          <p>Online payments and payouts run on the Declutt server (Vercel) with Paystack. They need these environment variables in Vercel:</p>
          <ul className="space-y-1 font-mono text-[11px] text-foreground/80">
            <li>PAYSTACK_SECRET_KEY</li>
            <li>FIREBASE_SERVICE_ACCOUNT</li>
            <li>CRON_SECRET</li>
            <li>APP_URL (optional)</li>
          </ul>
          <p>
            Paystack webhook URL:
            <span className="block mt-1 font-mono text-[11px] text-foreground/85 break-all bg-background border border-border rounded-lg px-2 py-1.5">
              {origin}/api/paystack-webhook
            </span>
          </p>
          <button
            type="button"
            onClick={testServer}
            disabled={check?.busy}
            className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-foreground/70 hover:border-primary/40 hover:text-primary flex items-center gap-1.5 disabled:opacity-60"
          >
            {check?.busy && <Spin s={12} />}
            Test connection
          </button>
          {check?.lines && (
            <ul className={`space-y-1 font-semibold ${check.ok ? "text-emerald-600" : "text-red-500"}`}>
              {check.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
};
