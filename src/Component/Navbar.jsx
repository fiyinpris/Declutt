// src/Component/Navbar.jsx
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../utils/theme";
import { cartHelpers, syncCart, useCartItems } from "../utils/Cart";
import { isAdminUser } from "../utils/admin";

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ pointerEvents: "none" }}
  >
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ pointerEvents: "none" }}
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const AccountIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

/* ── Reusable search button ── */
const SearchNavButton = ({ onClick, className = "" }) => (
  <button
    onClick={onClick}
    aria-label="Search listings"
    className={`flex items-center justify-center w-9 h-9 rounded-xl text-foreground/60 hover:text-primary hover:bg-primary/10 transition-all duration-200 ${className}`}
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  </button>
);

export const DecluttLogo = ({ className = "" }) => (
  <span
    className={`relative inline-block font-bold text-foreground ${className}`}
  >
    De
    <span className="text-primary relative inline-block">
      clutt
      <svg
        viewBox="0 0 80 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-12px",
          left: "-12px",
          width: "calc(100% + 24px)",
          height: "calc(100% + 22px)",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <path
          d="M 24,4 C 40,0 64,0 72,12 C 78,20 75,32 64,37 C 50,42 16,40 4,37"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  </span>
);

const SIDEBAR_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    id: "favourites",
    label: "Saved Items",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: "rewards",
    label: "Rewards / Points",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: "referrals",
    label: "Referrals",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const useLogout = (logoutFn, navigate) => {
  const [state, setState] = useState("idle");
  const handleLogout = async () => {
    setState("loading");
    await new Promise((r) => setTimeout(r, 1400));
    setState("success");
    await new Promise((r) => setTimeout(r, 1600));
    await logoutFn();
    navigate("/");
    setState("idle");
  };
  return { state, handleLogout };
};

const LogoutButton = ({ onLogout, state, fullWidth = true }) => (
  <button
    onClick={onLogout}
    disabled={state !== "idle"}
    className={`${fullWidth ? "w-full" : ""} flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      state === "success"
        ? "bg-green-500 text-white"
        : state === "loading"
          ? "bg-red-400 text-white"
          : "text-red-500/80 hover:text-red-500 hover:bg-red-500/8"
    } disabled:cursor-not-allowed`}
  >
    {state === "loading" && (
      <svg
        className="animate-spin shrink-0"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    )}
    {state === "success" && (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
    {state === "idle" && (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    )}
    {state === "loading"
      ? "Signing out…"
      : state === "success"
        ? "Signed out!"
        : "Log out"}
  </button>
);

const AccountSidebar = ({ profile, isAdmin, logoutState, onLogout, onClose }) => {
  const navigate = useNavigate();
  const dashPath =
    profile?.role === "seller"
      ? "/seller"
      : profile?.role === "admin"
        ? "/admin"
        : "/buyer";
  const initials =
    profile?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";
  const roleColor =
    profile?.role === "seller"
      ? "text-amber-500"
      : profile?.role === "admin"
        ? "text-red-500"
        : "text-primary";

  const go = (tab) => {
    navigate(`${dashPath}${tab ? `?tab=${tab}` : ""}`);
    onClose();
  };

  const visibleItems = SIDEBAR_ITEMS.filter((item) => {
    if (profile?.role === "seller") return item.id !== "favourites";
    if (profile?.role === "admin") return item.id === "dashboard";
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}
      >
        <div className="flex items-center gap-3">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-primary/30 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-black border-2 border-primary/25 shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {profile?.name}
            </p>
            <p className="text-xs text-foreground/40 truncate">
              {profile?.email}
            </p>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${roleColor}`}
            >
              {profile?.role}
            </span>
          </div>
        </div>
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/6"
          style={{ border: "1px solid hsl(var(--primary)/0.15)" }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary shrink-0"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="text-xs font-bold text-primary">
            {profile?.rewards ?? 0} pts
          </span>
          <span className="text-xs text-foreground/35 ml-auto">
            Reward points
          </span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {isAdmin && profile?.role !== "admin" && (
          <button
            onClick={() => {
              navigate("/admin");
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-primary/8 transition-all duration-150 text-left"
          >
            <span className="shrink-0">{SIDEBAR_ITEMS[0].icon}</span>
            Admin dashboard
          </button>
        )}
        {visibleItems.map((item) => {
          const tab = item.id === "dashboard" ? "" : item.id;
          return (
            <button
              key={item.id}
              onClick={() => go(tab)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/60 hover:text-primary hover:bg-primary/8 transition-all duration-150 group text-left"
            >
              <span className="text-foreground/35 group-hover:text-primary transition-colors shrink-0">
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div
        className="px-3 pb-4 pt-3"
        style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}
      >
        <LogoutButton onLogout={onLogout} state={logoutState} />
      </div>
    </div>
  );
};

const AccountDropdown = ({ profile, isAdmin, logoutState, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 focus:outline-none ${open ? "text-primary bg-primary/10" : "text-foreground/60 hover:text-primary hover:bg-primary/10"}`}
      >
        <AccountIcon />
      </button>
      <div
        className="absolute right-0 top-[calc(100%+8px)] w-72 bg-card rounded-2xl shadow-2xl overflow-hidden z-50"
        style={{
          border: "1px solid hsl(var(--border)/0.7)",
          opacity: open ? 1 : 0,
          transform: open
            ? "translateY(0) scale(1)"
            : "translateY(-8px) scale(0.97)",
          pointerEvents: open ? "all" : "none",
          transition: "opacity 0.15s ease, transform 0.15s ease",
        }}
      >
        <AccountSidebar
          profile={profile}
          isAdmin={isAdmin}
          logoutState={logoutState}
          onLogout={onLogout}
          onClose={() => setOpen(false)}
        />
      </div>
    </div>
  );
};

/* ── Phone notification bell (signed in): unread messages for everyone, plus sellers'
   alerts (e.g. "Ada saved your Oak table"). Desktop keeps its existing layout. ── */
const timeAgo = (t) => {
  const ms = t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0;
  if (!ms) return "";
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const NotificationBell = ({ uid, role, messageCount, notifCount, open, onToggle, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const isSeller = role === "seller";
  const dash = isSeller ? "/seller" : "/buyer";

  // Seller alerts, live while the panel is open
  useEffect(() => {
    if (!open || !isSeller || !uid) return;
    return onSnapshot(
      query(collection(db, "notifications"), where("sellerUid", "==", uid)),
      (snap) =>
        setAlerts(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
            .slice(0, 12),
        ),
      (e) => console.error("Alerts:", e),
    );
  }, [open, isSeller, uid]);

  const markAllRead = async () => {
    const unread = alerts.filter((a) => !a.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((a) => batch.update(doc(db, "notifications", a.id), { read: true }));
    await batch.commit().catch((e) => console.error("Mark read failed:", e));
  };

  const total = messageCount + (isSeller ? notifCount : 0);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={total ? `Notifications (${total} new)` : "Notifications"}
        aria-expanded={open}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${open ? "text-primary bg-primary/10" : "text-foreground/65 hover:text-primary hover:bg-primary/10"}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {total > 0 && (
          <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="md:hidden fixed inset-0 top-14 z-40 bg-black/35" onClick={onClose} />
          <div className="md:hidden fixed top-14 right-2 left-2 sm:left-auto sm:w-96 z-60 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden text-left">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <p className="text-sm font-bold text-foreground">Notifications</p>
              {isSeller && alerts.some((a) => !a.read) && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-primary"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[65dvh] overflow-y-auto">
              <Link
                to={`${dash}?tab=messages`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 border-b border-border/40"
              >
                <span className="w-9 h-9 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
                  {TAB_ICONS.messages}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {messageCount
                      ? `${messageCount} unread message${messageCount > 1 ? "s" : ""}`
                      : "Messages"}
                  </span>
                  <span className="block text-xs text-foreground/50">
                    {messageCount ? "Tap to reply" : "No unread messages"}
                  </span>
                </span>
                {messageCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </Link>
              {isSeller &&
                (alerts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-foreground/45">
                    No alerts yet. You'll see when buyers save your items.
                  </p>
                ) : (
                  alerts.map((a) => (
                    <Link
                      key={a.id}
                      to="/seller?tab=notifications"
                      onClick={onClose}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/40 hover:bg-primary/5 ${a.read ? "" : "bg-primary/5"}`}
                    >
                      <span className="w-9 h-9 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0 text-xs font-black">
                        {(a.buyerName || "?")[0].toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-foreground">
                          <span className="font-semibold">{a.buyerName || "A buyer"}</span>{" "}
                          saved{" "}
                          <span className="font-semibold">{a.listingName || "your item"}</span>
                        </span>
                        <span className="block text-[11px] text-foreground/45 mt-0.5">
                          {timeAgo(a.createdAt)}
                        </span>
                      </span>
                      {!a.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </Link>
                  ))
                ))}
              {!isSeller && messageCount === 0 && (
                <p className="px-4 py-6 text-center text-xs text-foreground/45">
                  You're all caught up.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

/* Navbar cart icon with item count (shown signed in and signed out) */
const CartButton = ({ count, onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={count ? `Cart (${count})` : "Cart"}
    className={`relative flex items-center justify-center rounded-xl text-foreground/65 hover:text-primary hover:bg-primary/10 transition-colors ${className}`}
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
    {count > 0 && (
      <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">
        {count > 99 ? "99+" : count}
      </span>
    )}
  </button>
);

/* The cart stores a snapshot of each item; when the drawer opens we load each listing's
   CURRENT details so price edits, sold items and deleted listings show correctly. */
const listingCache = new Map(); // listing id → Promise<listing data | null (deleted)>
const fetchListing = (id) => {
  if (!listingCache.has(id))
    listingCache.set(
      id,
      getDoc(doc(db, "listings", id))
        .then((s) => (s.exists() ? s.data() : null))
        .catch(() => undefined), // network error: keep showing the saved snapshot
    );
  return listingCache.get(id);
};

const useLiveListings = (items, open) => {
  const [live, setLive] = useState({});
  const ids = items.map((i) => i.id).join(",");
  useEffect(() => {
    if (!open || !ids) return;
    let alive = true;
    ids.split(",").forEach((id) => listingCache.delete(id)); // fresh data each time it opens
    Promise.all(ids.split(",").map((id) => fetchListing(id).then((d) => [id, d]))).then(
      (pairs) => alive && setLive(Object.fromEntries(pairs)),
    );
    return () => {
      alive = false;
    };
  }, [open, ids]);
  return live;
};

const CartThumb = ({ item, liveImage }) => {
  const src = item.imageUrl || liveImage;
  return src ? (
    <img src={src} alt={item.name} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-foreground/15 text-xs">
      No img
    </div>
  );
};

/* ── Cart Drawer ── */
const CartDrawer = ({ open, onClose, cartItems = [], onRemove }) => {
  const live = useLiveListings(cartItems, open);
  // live[id]: listing data, null = deleted, undefined = not loaded (use the saved snapshot)
  const view = cartItems.map((item) => {
    const l = live[item.id];
    return {
      ...item,
      name: l?.name ?? item.name,
      price: l?.price ?? item.price,
      gone: l === null,
      sold: !!l && l.available === false,
      liveImage: l?.imageUrl || null,
    };
  });
  const total = view.reduce(
    (sum, item) =>
      item.gone || item.sold ? sum : sum + Number(item.price || 0) * (item.quantity || 1),
    0,
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className="fixed right-0 top-0 bottom-0 z-70 flex flex-col bg-background"
        style={{
          width: "min(400px, 92vw)",
          borderLeft: "1px solid hsl(var(--border)/0.5)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.12)" : "none",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid hsl(var(--border)/0.5)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Your Cart</p>
              <p className="text-xs text-foreground/40">
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-foreground/40 hover:text-foreground hover:bg-border/50 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-16">
              <div
                className="w-20 h-20 rounded-2xl bg-primary/6 flex items-center justify-center"
                style={{ border: "2px dashed hsl(var(--primary)/0.2)" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary/30"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/50">
                  Your cart is empty
                </p>
                <p className="text-xs text-foreground/30 mt-1">
                  Browse listings and add items you love
                </p>
              </div>
              <Link
                to="/listings"
                onClick={onClose}
                className="main-button text-sm px-5 py-2.5 font-semibold"
              >
                Browse listings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {view.map((item, i) => (
                <div
                  key={item.id || i}
                  className={`flex items-center gap-3 p-3 rounded-xl bg-background ${item.gone || item.sold ? "opacity-60" : ""}`}
                  style={{ border: "1.5px solid hsl(var(--border))" }}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-border/20 shrink-0">
                    <CartThumb item={item} liveImage={item.liveImage} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-foreground/40 truncate">
                      {item.gone ? (
                        <span className="font-semibold text-red-500">No longer available</span>
                      ) : item.sold ? (
                        <span className="font-semibold text-red-500">Sold</span>
                      ) : (
                        item.category
                      )}
                    </p>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      ₦{Number(item.price).toLocaleString()}
                      {(item.quantity || 1) > 1 && (
                        <span className="ml-1.5 text-xs font-semibold text-foreground/45">
                          × {item.quantity}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove?.(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground/30 hover:text-red-500 hover:bg-red-500/8 transition-colors shrink-0"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div
            className="shrink-0 px-4 pb-6 pt-4"
            style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-foreground/60 font-medium">
                Total
              </span>
              <span className="text-lg font-black text-primary">
                ₦{total.toLocaleString()}
              </span>
            </div>
            <button className="main-button w-full py-3 text-sm font-bold">
              Proceed to checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};


/* ── Phone tab bar (signed-in users) ── */
const TabIcon = ({ children }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const TAB_ICONS = {
  home: (
    <TabIcon>
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </TabIcon>
  ),
  browse: (
    <TabIcon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </TabIcon>
  ),
  messages: (
    <TabIcon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </TabIcon>
  ),
  dashboard: (
    <TabIcon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </TabIcon>
  ),
  items: (
    <TabIcon>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </TabIcon>
  ),
  alerts: (
    <TabIcon>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </TabIcon>
  ),
  account: (
    <TabIcon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </TabIcon>
  ),
};

const MobileTabBar = ({ tabs, isCurrent, accountActive, onAccount }) => (
  <nav
    className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border"
    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
  >
    <div className="flex items-stretch h-16">
      {[...tabs, { id: "account", label: "Account", icon: "account" }].map(
        (t) => {
          const active = t.to ? isCurrent(t.to) : accountActive;
          const body = (
            <>
              {active && (
                <span className="absolute top-0 inset-x-5 h-0.5 rounded-full bg-primary" />
              )}
              <span className="relative">
                {TAB_ICONS[t.icon]}
                {t.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center border-2 border-card">
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                )}
              </span>
              <span>{t.label}</span>
            </>
          );
          const cls = `relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? "text-primary" : "text-foreground/50 hover:text-foreground/80"}`;
          return t.to ? (
            <Link key={t.id} to={t.to} className={cls}>
              {body}
            </Link>
          ) : (
            <button key={t.id} type="button" onClick={onAccount} className={cls}>
              {body}
            </button>
          );
        },
      )}
    </div>
  </nav>
);

const AccountSheet = ({
  open,
  onClose,
  profile,
  links,
  isCurrent,
  logoutState,
  onLogout,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const initials =
    profile?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";
  return (
    <>
      {open && (
        <div
          className="md:hidden fixed inset-0 z-60 bg-black/45 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-60 flex flex-col bg-card rounded-t-3xl border-t border-border text-left"
        style={{
          maxHeight: "85dvh",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "0 -8px 32px rgba(0,0,0,0.18)" : "none",
        }}
        aria-hidden={!open}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center gap-3 px-5 py-3 shrink-0 border-b border-border/60">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt=""
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-black border-2 border-primary/25 shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">
              {profile?.name}
            </p>
            <p className="text-xs text-foreground/40 truncate">
              {profile?.email}
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10">
            {profile?.rewards ?? 0} pts
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={`flex items-center px-4 py-3.5 rounded-2xl text-sm font-semibold transition-colors ${isCurrent(l.to) ? "text-primary bg-primary/8" : "text-foreground/75 hover:text-primary hover:bg-primary/8"}`}
            >
              {l.label}
              {l.badge > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                  {l.badge > 9 ? "9+" : l.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 px-3 pt-2 pb-4 border-t border-border/60 space-y-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground/75 hover:bg-primary/8 transition-colors"
          >
            {isDark ? "Dark mode" : "Light mode"}
            <span className="relative w-11 h-6 rounded-full border border-border bg-background shrink-0">
              <span
                className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-primary transition-all"
                style={{ left: isDark ? "calc(100% - 20px)" : "2px" }}
              />
            </span>
          </button>
          <LogoutButton onLogout={onLogout} state={logoutState} />
        </div>
      </div>
    </>
  );
};

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state: logoutState, handleLogout } = useLogout(logout, navigate);

  const uid = user?.uid || null;

  // Mobile search icon only on /listings
  const isOnListings =
    location.pathname === "/listings" ||
    location.pathname.startsWith("/listings/");

  // Same cart the listing cards and product page use; saved to the account when signed in
  const cartItems = useCartItems(uid);
  useEffect(() => syncCart(uid), [uid]);
  const removeFromCart = (id) => cartHelpers.remove(uid, id);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const overflow = menuOpen || sheetOpen || cartOpen ? "hidden" : "";
    document.body.style.overflow = overflow;
    document.documentElement.style.overflow = overflow;
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen, sheetOpen, cartOpen]);

  useLayoutEffect(() => {
    // close drawers async after navigation to avoid synchronous setState in layout effect
    setTimeout(() => {
      try {
        setMenuOpen(false);
        setSheetOpen(false);
        setBellOpen(false);
      } catch (e) {
        console.error("closing drawers async error:", e);
      }
    }, 0);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.search]);

  /* ── Search click: focus input if on /listings, else navigate with state ── */
  const handleSearchClick = () => {
    if (isOnListings) {
      const el = document.getElementById("listings-search-input");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    } else {
      navigate("/listings", { state: { scrollToSearch: true } });
    }
    setMenuOpen(false);
  };

  const NAV_LINKS = [
    { label: "Home", to: "/" },
    { label: "Browse", to: "/listings" },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ];

  const isActive = (to) => {
    try {
      const target = new URL(to, window.location.origin);
      if (target.pathname !== location.pathname) return false;
      return !target.search || location.search.startsWith(target.search);
    } catch {
      return to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
    }
  };

  const role = profile?.role;
  const signedIn = !!(user && profile);
  const isAdmin = isAdminUser(user, profile);

  // Exact match for the phone tab bar / account sheet: same page and same ?tab (none = overview)
  const currentTab = new URLSearchParams(location.search).get("tab") || "";
  const isCurrent = (to) => {
    const target = new URL(to, window.location.origin);
    return (
      target.pathname === location.pathname &&
      (target.searchParams.get("tab") || "") === currentTab
    );
  };

  const [messageCount, setMessageCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  const tabBarTabs =
    role === "seller"
      ? [
          { id: "dashboard", label: "Dashboard", icon: "dashboard", to: "/seller" },
          { id: "listings", label: "My Items", icon: "items", to: "/seller?tab=listings" },
          { id: "messages", label: "Messages", icon: "messages", to: "/seller?tab=messages", badge: messageCount },
        ]
      : role === "admin"
        ? [
            { id: "home", label: "Home", icon: "home", to: "/" },
            { id: "browse", label: "Browse", icon: "browse", to: "/listings" },
            { id: "dashboard", label: "Dashboard", icon: "dashboard", to: "/admin" },
          ]
        : [
            { id: "home", label: "Home", icon: "home", to: "/" },
            { id: "browse", label: "Browse", icon: "browse", to: "/listings" },
            { id: "messages", label: "Messages", icon: "messages", to: "/buyer?tab=messages", badge: messageCount },
          ];

  // Every account section, opened from the tab bar's Account tab (Saved Items lives here)
  const roleLinks =
    role === "seller"
      ? [
          { label: "My Profile", to: "/seller?tab=profile" },
          { label: "Dashboard", to: "/seller" },
          { label: "Messages", to: "/seller?tab=messages", badge: messageCount },
          { label: "Notifications", to: "/seller?tab=notifications", badge: notifCount },
          { label: "My Items", to: "/seller?tab=listings" },
          { label: "Orders", to: "/seller?tab=orders" },
          { label: "Rewards", to: "/seller?tab=rewards" },
          { label: "Referrals", to: "/seller?tab=referrals" },
          { label: "Browse items", to: "/listings" },
        ]
      : role === "admin"
        ? [{ label: "Admin dashboard", to: "/admin" }]
        : [
            { label: "My Profile", to: "/buyer?tab=profile" },
            { label: "Dashboard", to: "/buyer" },
            { label: "Messages", to: "/buyer?tab=messages", badge: messageCount },
            { label: "My Orders", to: "/buyer?tab=orders" },
            { label: "Saved Items", to: "/buyer?tab=favourites" },
            { label: "Rewards / Points", to: "/buyer?tab=rewards" },
            { label: "Referrals", to: "/buyer?tab=referrals" },
          ];
  const accountLinks =
    isAdmin && role !== "admin"
      ? [{ label: "Admin dashboard", to: "/admin" }, ...roleLinks]
      : roleLinks;

  // The product page has its own bottom buy bar, so the tab bar steps aside there
  const showTabBar = signedIn && !location.pathname.startsWith("/product/");

  useEffect(() => {
    document.body.classList.toggle("has-tabbar", showTabBar);
    return () => document.body.classList.remove("has-tabbar");
  }, [showTabBar]);

  useEffect(() => {
    if (!user || role !== "seller") return;
    const q = query(
      collection(db, "notifications"),
      where("sellerUid", "==", user.uid),
      where("read", "==", false),
    );
    return onSnapshot(
      q,
      (snap) => setNotifCount(snap.size),
      (error) => console.error("Notification badge listener error:", error),
    );
  }, [user, role]);

  useEffect(() => {
    if (!user || !profile?.role) return;

    let q;
    if (profile.role === "seller") {
      q = query(
        collection(db, "messages"),
        where("sellerUid", "==", user.uid),
        where("from", "==", "buyer"),
        where("read", "==", false),
      );
    } else {
      q = query(
        collection(db, "messages"),
        where("buyerUid", "==", user.uid),
        where("from", "==", "seller"),
        where("read", "==", false),
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessageCount(snap.size);
      },
      (error) => {
        console.error("Message badge listener error:", error);
      },
    );

    return () => unsub();
  }, [user, profile?.role]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 transition-[background-color,box-shadow] duration-300 ${scrolled ? "bg-background" : "bg-transparent"}`}
        style={{
          borderBottom: scrolled ? "1px solid hsl(var(--border)/0.4)" : "none",
          boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.06)" : "none",
        }}
      >
        <div
          className="w-full mx-auto px-4 sm:px-5 md:px-8 lg:px-12 xl:px-16 h-full flex items-center justify-between gap-4"
          style={{ maxWidth: "1400px" }}
        >
          <Link to="/" className="text-xl sm:text-2xl shrink-0">
            <DecluttLogo />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className={`relative text-sm font-semibold transition-colors pb-0.5 ${isActive(l.to) ? "text-primary" : "text-foreground/60 hover:text-primary"}`}
              >
                {l.label}
                {isActive(l.to) && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-1.5">
            {user && profile ? (
              <>
                <SearchNavButton onClick={handleSearchClick} />
                <CartButton
                  count={cartItems.length}
                  onClick={() => setCartOpen(true)}
                  className="w-9 h-9"
                />
                <AccountDropdown
                  profile={profile}
                  isAdmin={isAdmin}
                  logoutState={logoutState}
                  onLogout={handleLogout}
                />
              </>
            ) : (
              <>
                <SearchNavButton onClick={handleSearchClick} />
                <CartButton
                  count={cartItems.length}
                  onClick={() => setCartOpen(true)}
                  className="w-9 h-9"
                />

                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-foreground/65 hover:text-primary rounded-xl transition-all"
                  style={{ border: "2px solid hsl(var(--border))" }}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="main-button text-sm px-5 py-2 font-semibold"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile right side: search + cart (+ hamburger when signed out;
              signed-in navigation is in the tab bar) */}
          <div className="md:hidden flex items-center gap-1">
            <SearchNavButton onClick={handleSearchClick} />
            {signedIn && (
              <NotificationBell
                uid={uid}
                role={role}
                messageCount={messageCount}
                notifCount={notifCount}
                open={bellOpen}
                onToggle={() => setBellOpen((o) => !o)}
                onClose={() => setBellOpen(false)}
              />
            )}
            <CartButton
              count={cartItems.length}
              onClick={() => {
                setBellOpen(false);
                setCartOpen(true);
              }}
              className="w-10 h-10"
            />
            {!signedIn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                aria-label="Menu"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-foreground hover:text-primary hover:bg-primary/10 transition-colors z-100"
                type="button"
              >
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            )}
          </div>
        </div>
      </header>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onRemove={removeFromCart}
      />

      {/* Signed-out phones: hamburger menu. Signed-in phones use the tab bar below instead. */}
      {!signedIn && menuOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
          style={{ top: "56px" }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {!signedIn && (
        <div
          className="md:hidden fixed right-0 bottom-0 z-60 flex flex-col bg-background"
          style={{
            top: "56px",
            width: "78vw",
            maxWidth: "320px",
            borderLeft: "1px solid hsl(var(--border)/0.5)",
            transform: menuOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: menuOpen ? "-4px 0 28px rgba(0,0,0,0.13)" : "none",
          }}
        >
          <div className="flex-1 overflow-y-auto">
            <nav className="flex flex-col px-4 py-5 gap-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 px-4 pb-1">
                Navigation
              </p>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-4 py-4 rounded-2xl text-sm font-semibold transition-all ${isActive(l.to) ? "text-primary bg-primary/8" : "text-foreground/70 hover:text-primary hover:bg-primary/8"}`}
                  style={{
                    border: isActive(l.to)
                      ? "1.5px solid hsl(var(--primary)/0.2)"
                      : "1.5px solid transparent",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="px-4 py-4 border-t border-border flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-foreground/75 hover:text-primary transition-colors"
              style={{ border: "2px solid hsl(var(--border))" }}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="main-button flex items-center justify-center w-full px-4 py-3.5 text-sm font-semibold"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {showTabBar && (
        <MobileTabBar
          tabs={tabBarTabs}
          isCurrent={isCurrent}
          accountActive={sheetOpen}
          onAccount={() => setSheetOpen((o) => !o)}
        />
      )}
      {signedIn && (
        <AccountSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          profile={profile}
          links={accountLinks}
          isCurrent={isCurrent}
          logoutState={logoutState}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

export default Navbar;
