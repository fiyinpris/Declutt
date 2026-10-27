import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { OWNER_EMAIL, isOwnerAccount } from "../utils/admin";

/* Owner/admin panels. Every read and write here is allowed only for admins by firestore.rules
 * (isAdmin()), so a non-admin who reached this page still couldn't see or change anything. */

const Card = ({ title, right, children }) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden text-left">
    <div className="px-4 sm:px-5 py-3.5 border-b border-border/60 flex items-center justify-between gap-3">
      <p className="text-sm font-bold text-foreground">{title}</p>
      {right}
    </div>
    {children}
  </div>
);

const Empty = ({ children }) => (
  <p className="px-5 py-8 text-center text-sm text-foreground/40">{children}</p>
);

const tsMs = (t) =>
  t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : typeof t === "string" ? Date.parse(t) || 0 : 0;
const when = (t) => {
  const ms = tsMs(t);
  return ms
    ? new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "";
};
const initials = (n) =>
  (n || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/* ───────────── Overview ───────────── */
export const AdminOverview = ({ onGo }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let dead = false;
    const c = (q) =>
      getCountFromServer(q)
        .then((s) => s.data().count)
        .catch(() => null);
    const users = collection(db, "users");
    Promise.all([
      c(users),
      c(query(users, where("role", "==", "seller"))),
      c(query(users, where("role", "==", "buyer"))),
      c(collection(db, "listings")),
      c(collection(db, "messages")),
      c(query(collection(db, "reports"), where("status", "==", "open"))),
      c(query(collection(db, "featureRequests"), where("status", "==", "open"))),
      c(query(collection(db, "contactMessages"), where("read", "==", false))),
      c(query(collection(db, "orders"), where("status", "==", "disputed"))),
    ]).then((v) => {
      if (!dead)
        setCounts({
          users: v[0],
          sellers: v[1],
          buyers: v[2],
          listings: v[3],
          messages: v[4],
          reports: v[5],
          featured: v[6],
          support: v[7],
          disputes: v[8],
        });
    });
    return () => {
      dead = true;
    };
  }, []);

  const tiles = [
    { label: "Users", value: counts?.users, sub: counts ? `${counts.sellers ?? "–"} sellers · ${counts.buyers ?? "–"} buyers` : "", tab: "users" },
    { label: "Listings", value: counts?.listings, tab: "listings" },
    { label: "Messages sent", value: counts?.messages, tab: "chats" },
    { label: "Open reports", value: counts?.reports, tab: "reports", alert: counts?.reports > 0 },
    { label: "Featured requests", value: counts?.featured, tab: "featured", alert: counts?.featured > 0 },
    { label: "Unread support", value: counts?.support, tab: "reports", alert: counts?.support > 0 },
    { label: "Order disputes", value: counts?.disputes, tab: "orders", alert: counts?.disputes > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onGo(t.tab)}
            className={`text-left bg-card border rounded-2xl px-4 py-4 hover:border-primary/40 transition-colors ${t.alert ? "border-primary/40" : "border-border"}`}
          >
            <p className={`text-2xl sm:text-3xl font-black ${t.alert ? "text-primary" : "text-foreground"}`}>
              {t.value ?? (counts ? "–" : "…")}
            </p>
            <p className="text-xs font-semibold text-foreground/55 mt-0.5">{t.label}</p>
            {t.sub && <p className="text-[11px] text-foreground/40 mt-0.5">{t.sub}</p>}
          </button>
        ))}
      </div>
      <p className="text-xs text-foreground/45">
        {isOwnerAccount(user)
          ? `Signed in as the site owner (${OWNER_EMAIL}).`
          : "Signed in as an administrator."}{" "}
        Admin access is checked by the database on every request, not just hidden in
        the page.
      </p>
    </div>
  );
};

/* ───────────── Users ───────────── */
export const UsersPanel = ({ listings }) => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let dead = false;
    getDocs(collection(db, "users"))
      .then((snap) => {
        if (dead) return;
        setUsers(
          snap.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)),
        );
      })
      .catch((e) => {
        console.error("Users:", e);
        if (!dead) setUsers([]);
      });
    return () => {
      dead = true;
    };
  }, [reloadKey]);

  const itemsBy = useMemo(() => {
    const m = {};
    listings.forEach((l) => {
      if (l.sellerUid) m[l.sellerUid] = (m[l.sellerUid] || 0) + 1;
    });
    return m;
  }, [listings]);

  const update = async (u, patch, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(u.uid);
    try {
      await updateDoc(doc(db, "users", u.uid), patch);
      setUsers((list) => list.map((x) => (x.uid === u.uid ? { ...x, ...patch } : x)));
    } catch (e) {
      console.error("User update failed:", e);
      alert("Couldn't update that account. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const q = search.trim().toLowerCase();
  const shown = (users || []).filter(
    (u) =>
      (roleFilter === "all" ||
        (roleFilter === "suspended" ? u.suspended : u.role === roleFilter)) &&
      (!q || [u.name, u.email].some((f) => f?.toLowerCase().includes(q))),
  );

  return (
    <Card
      title={`Users${users ? ` (${users.length})` : ""}`}
      right={
        <button onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-semibold text-foreground/50 hover:text-primary">
          Refresh
        </button>
      }
    >
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 border-b border-border/60">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-border bg-background text-[16px] sm:text-sm text-foreground outline-none focus:border-primary/50"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground/75"
        >
          <option value="all">Everyone</option>
          <option value="seller">Sellers</option>
          <option value="buyer">Buyers</option>
          <option value="admin">Admins</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {users === null ? (
        <Empty>Loading users…</Empty>
      ) : shown.length === 0 ? (
        <Empty>No matching users.</Empty>
      ) : (
        <ul className="divide-y divide-border/60 max-h-[640px] overflow-y-auto">
          {shown.map((u) => {
            const isSelf = u.uid === me?.uid;
            const protectedAcct = isSelf || u.role === "admin" || u.email?.toLowerCase() === OWNER_EMAIL;
            return (
              <li key={u.uid} className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-full overflow-hidden bg-primary/12 text-primary flex items-center justify-center text-xs font-black shrink-0">
                    {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : initials(u.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {u.name || "No name"}
                      {u.suspended && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase align-middle">
                          Suspended
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-foreground/50 truncate">{u.email}</p>
                    <p className="text-[11px] text-foreground/40">
                      {u.role || "—"} · joined {when(u.createdAt) || "—"}
                      {itemsBy[u.uid] ? ` · ${itemsBy[u.uid]} listing${itemsBy[u.uid] > 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                </div>
                {!protectedAcct && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={u.role}
                      disabled={busy === u.uid}
                      onChange={(e) =>
                        update(u, { role: e.target.value }, `Change ${u.name || u.email} to ${e.target.value}?`)
                      }
                      className="px-2.5 py-2 rounded-lg border border-border bg-background text-xs text-foreground/75"
                      aria-label="Account type"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy === u.uid}
                      onClick={() =>
                        u.suspended
                          ? update(u, { suspended: false })
                          : update(u, { suspended: true }, `Suspend ${u.name || u.email}? They won't be able to post listings or send messages.`)
                      }
                      className={`px-3 py-2 rounded-lg text-xs font-bold border ${u.suspended ? "border-green-600/40 text-green-600" : "border-red-500/40 text-red-500"} disabled:opacity-50`}
                    >
                      {u.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

/* ───────────── Featured listing requests ───────────── */
export const FeatureRequestsPanel = ({ onChanged }) => {
  const [items, setItems] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let dead = false;
    getDocs(query(collection(db, "featureRequests"), orderBy("createdAt", "desc")))
      .then((snap) => !dead && setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((e) => {
        console.error("Feature requests:", e);
        if (!dead) setItems([]);
      });
    return () => {
      dead = true;
    };
  }, [reloadKey]);

  const decide = async (r, approve) => {
    try {
      if (approve)
        await updateDoc(doc(db, "listings", r.listingId), {
          featuredUntil: Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000),
        });
      await updateDoc(doc(db, "featureRequests", r.id), {
        status: approve ? "approved" : "declined",
      });
      setReloadKey((k) => k + 1);
      if (approve) onChanged();
    } catch (e) {
      console.error("Feature decision failed:", e);
      alert("Couldn't update that request (the listing may have been deleted).");
    }
  };

  const open = (items || []).filter((r) => r.status === "open");
  const done = (items || []).filter((r) => r.status !== "open").slice(0, 20);

  const Row = ({ r }) => (
    <li className="px-4 sm:px-5 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={`/product/${r.listingId}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-foreground hover:text-primary">
          {r.listingName || "Listing"}
        </a>
        <span className="text-[11px] text-foreground/40">{when(r.createdAt)}</span>
      </div>
      <p className="text-xs text-foreground/55 mt-0.5">
        {r.sellerName} · <a href={`mailto:${r.sellerEmail}`} className="hover:text-primary">{r.sellerEmail}</a>
      </p>
      {r.reason && <p className="text-xs text-foreground/70 mt-1.5 whitespace-pre-wrap break-words">{r.reason}</p>}
      {r.status === "open" ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={() => decide(r, true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            ★ Feature for 7 days
          </button>
          <button onClick={() => decide(r, false)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground/60">
            Decline
          </button>
        </div>
      ) : (
        <p className={`mt-1.5 text-[11px] font-bold uppercase ${r.status === "approved" ? "text-green-600" : "text-foreground/40"}`}>
          {r.status}
        </p>
      )}
    </li>
  );

  return (
    <Card
      title={`Featured listing requests${open.length ? ` (${open.length} open)` : ""}`}
      right={
        <button onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-semibold text-foreground/50 hover:text-primary">
          Refresh
        </button>
      }
    >
      {items === null ? (
        <Empty>Loading requests…</Empty>
      ) : items.length === 0 ? (
        <Empty>No requests yet. Sellers send them from My Items → “Request featured”.</Empty>
      ) : (
        <ul className="divide-y divide-border/60">
          {open.map((r) => <Row key={r.id} r={r} />)}
          {done.length > 0 && (
            <li className="px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-foreground/35 bg-background/40">
              Recent decisions
            </li>
          )}
          {done.map((r) => <Row key={r.id} r={r} />)}
        </ul>
      )}
    </Card>
  );
};

/* ───────────── Conversations (moderation, read-only) ───────────── */
export const ConversationsPanel = ({ initialKey = null }) => {
  const [msgs, setMsgs] = useState(null);
  const [activeKey, setActiveKey] = useState(initialKey);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let dead = false;
    getDocs(query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(1500)))
      .then((snap) => !dead && setMsgs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((e) => {
        console.error("Conversations:", e);
        if (!dead) setMsgs([]);
      });
    return () => {
      dead = true;
    };
  }, [reloadKey]);

  const threads = useMemo(() => {
    const g = {};
    (msgs || []).forEach((m) => {
      if (!m.buyerUid || !m.sellerUid) return;
      const key = `${m.buyerUid}_${m.sellerUid}`;
      if (!g[key]) g[key] = { key, buyerName: m.buyerName, sellerName: m.sellerName, messages: [] };
      g[key].messages.push(m);
    });
    return Object.values(g)
      .map((t) => {
        t.messages.sort((a, b) => tsMs(a.createdAt) - tsMs(b.createdAt));
        return { ...t, last: t.messages[t.messages.length - 1] };
      })
      .sort((a, b) => tsMs(b.last?.createdAt) - tsMs(a.last?.createdAt));
  }, [msgs]);

  const removeMessage = async (m) => {
    if (!window.confirm("Remove this message for both people?")) return;
    try {
      await updateDoc(doc(db, "messages", m.id), { deletedForEveryone: true, text: "" });
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error("Remove message failed:", e);
      alert("Couldn't remove that message.");
    }
  };

  const q = search.trim().toLowerCase();
  const shown = threads.filter(
    (t) => !q || [t.buyerName, t.sellerName, t.last?.text, t.last?.listingName].some((f) => f?.toLowerCase().includes(q)),
  );
  const active = threads.find((t) => t.key === activeKey);

  return (
    <Card
      title={`Conversations${msgs ? ` (${threads.length})` : ""}`}
      right={
        <button onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-semibold text-foreground/50 hover:text-primary">
          Refresh
        </button>
      }
    >
      <div className="grid md:grid-cols-[300px_1fr] min-h-[420px]">
        <div className={`${active ? "hidden md:flex" : "flex"} flex-col border-b md:border-b-0 md:border-r border-border/60 min-w-0`}>
          <div className="p-3 border-b border-border/60">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people, items, text…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[16px] sm:text-sm text-foreground outline-none focus:border-primary/50"
            />
          </div>
          {msgs === null ? (
            <Empty>Loading…</Empty>
          ) : shown.length === 0 ? (
            <Empty>No conversations.</Empty>
          ) : (
            <ul className="overflow-y-auto max-h-[560px]">
              {shown.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(t.key)}
                    className={`w-full text-left px-4 py-3 border-b border-border/40 ${t.key === activeKey ? "bg-primary/8" : "hover:bg-primary/5"}`}
                  >
                    <p className="text-sm font-bold text-foreground truncate">
                      {t.buyerName || "Buyer"} ↔ {t.sellerName || "Seller"}
                    </p>
                    <p className="text-xs text-foreground/50 truncate">
                      {t.last?.deletedForEveryone ? "Message deleted" : t.last?.text}
                    </p>
                    <p className="text-[10px] text-foreground/35">
                      {t.messages.length} messages · {when(t.last?.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`${active ? "flex" : "hidden md:flex"} flex-col min-w-0`}>
          {!active ? (
            <Empty>Select a conversation to read it.</Empty>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                <button type="button" onClick={() => setActiveKey(null)} className="md:hidden text-xs font-bold text-primary">
                  ← Back
                </button>
                <p className="text-sm font-bold text-foreground truncate">
                  {active.buyerName || "Buyer"} (buyer) ↔ {active.sellerName || "Seller"} (seller)
                </p>
              </div>
              <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto max-h-[560px] bg-background/40">
                {active.messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.from === "seller" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${m.deletedForEveryone ? "italic text-foreground/40 border border-dashed border-border" : m.from === "seller" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}
                    >
                      {m.deletedForEveryone ? "Message deleted" : m.text}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 px-1 text-[10px] text-foreground/40">
                      <span>
                        {m.from === "seller" ? active.sellerName : active.buyerName} · {when(m.createdAt)}
                        {m.listingName ? ` · ${m.listingName}` : ""}
                        {m.editedAt ? " · edited" : ""}
                      </span>
                      {!m.deletedForEveryone && (
                        <button type="button" onClick={() => removeMessage(m)} className="text-red-500 font-semibold">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
