// src/Component/Navbar.jsx
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

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

const AccountSidebar = ({ profile, logoutState, onLogout, onClose }) => {
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

const AccountDropdown = ({ profile, logoutState, onLogout }) => {
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
          logoutState={logoutState}
          onLogout={onLogout}
          onClose={() => setOpen(false)}
        />
      </div>
    </div>
  );
};

/* ── Cart Drawer ── */
const CartDrawer = ({ open, onClose, cartItems = [], onRemove }) => {
  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 1),
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
              {cartItems.map((item, i) => (
                <div
                  key={item.id || i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background"
                  style={{ border: "1.5px solid hsl(var(--border))" }}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-border/20 shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/15 text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-foreground/40 truncate">
                      {item.category}
                    </p>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      ₦{Number(item.price).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove?.(item.id)}
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

const getCartKey = (uid) =>
  uid ? `declutt_cart_${uid}` : "declutt_cart_guest";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(getCartKey(uid)) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      setCartItems(JSON.parse(localStorage.getItem(getCartKey(uid)) || "[]"));
    } catch {
      setCartItems([]);
    }
  }, [uid]);

  useEffect(() => {
    const sync = (e) => {
      if (e.detail?.uid !== uid && e.detail?.uid !== undefined) return;
      try {
        setCartItems(JSON.parse(localStorage.getItem(getCartKey(uid)) || "[]"));
      } catch {
        setCartItems([]);
      }
    };
    const storageSync = () => {
      try {
        setCartItems(JSON.parse(localStorage.getItem(getCartKey(uid)) || "[]"));
      } catch {
        setCartItems([]);
      }
    };
    window.addEventListener("cart-updated", sync);
    window.addEventListener("storage", storageSync);
    return () => {
      window.removeEventListener("cart-updated", sync);
      window.removeEventListener("storage", storageSync);
    };
  }, [uid]);

  const removeFromCart = (id) => {
    const updated = cartItems.filter((i) => i.id !== id);
    localStorage.setItem(getCartKey(uid), JSON.stringify(updated));
    setCartItems(updated);
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { uid } }));
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const overflow = menuOpen || cartOpen ? "hidden" : "";
    document.body.style.overflow = overflow;
    document.documentElement.style.overflow = overflow;
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen, cartOpen]);

  useLayoutEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  const isActive = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const dashboardPath =
    profile?.role === "seller"
      ? "/seller"
      : profile?.role === "admin"
      ? "/admin"
      : "/buyer";

  const mobileAccountLinks = [
    { id: "dashboard", label: "Dashboard", to: dashboardPath },
    { id: "messages", label: "Messages", to: `${dashboardPath}?tab=messages` },
    { id: "listings", label: "My Items", to: `${dashboardPath}?tab=listings` },
    { id: "orders", label: "Orders", to: `${dashboardPath}?tab=orders` },
    { id: "rewards", label: "Rewards", to: `${dashboardPath}?tab=rewards` },
    { id: "referrals", label: "Referrals", to: `${dashboardPath}?tab=referrals` },
    { id: "profile", label: "My Profile", to: `${dashboardPath}?tab=profile` },
  ];

  const [messageCount, setMessageCount] = useState(0);

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
        className={`fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 transition-all duration-300 ${scrolled ? "bg-background backdrop-blur-md" : "bg-transparent"}`}
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

                <button
                  onClick={() => setCartOpen(true)}
                  aria-label="Cart"
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl text-foreground/60 hover:text-primary hover:bg-primary/10 transition-all duration-200"
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
                  {cartItems.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">
                      {cartItems.length}
                    </span>
                  )}
                </button>
                <AccountDropdown
                  profile={profile}
                  logoutState={logoutState}
                  onLogout={handleLogout}
                />
              </>
            ) : (
              <>
                <SearchNavButton onClick={handleSearchClick} />

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

          {/* Mobile right side: search + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            {isOnListings && <SearchNavButton onClick={handleSearchClick} />}
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
          </div>
        </div>
      </header>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onRemove={removeFromCart}
      />

      {/* Mobile menu overlay - only covers content below header */}
      {menuOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
          style={{ top: "56px" }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu drawer */}
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
          <nav className="flex flex-col px-4 py-4 gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 px-4 pb-1">
              Navigation
            </p>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive(l.to) ? "text-primary bg-primary/8" : "text-foreground/65 hover:text-primary hover:bg-primary/8"}`}
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

          {user && profile && (
            <div className="px-1 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 px-4 pb-1">
                Account
              </p>
              {mobileAccountLinks.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-foreground/65 hover:text-primary hover:bg-primary/8 transition-all"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div
          className="shrink-0 px-4 py-4"
          style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}
        >
          {user && profile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-primary/30 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-black border-2 border-primary/25 shrink-0">
                    {profile.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {profile.name}
                  </p>
                  <p className="text-xs text-foreground/40 truncate">
                    {profile.email}
                  </p>
                </div>
              </div>
              <Link
                to={
                  profile.role === "seller"
                    ? "/seller"
                    : profile.role === "admin"
                    ? "/admin"
                    : "/buyer"
                }
                onClick={() => setMenuOpen(false)}
                className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                My Dashboard
              </Link>
              <LogoutButton onLogout={handleLogout} state={logoutState} />
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl text-foreground transition-all"
                style={{ border: "2px solid hsl(var(--border))" }}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMenuOpen(false)}
                className="main-button w-full text-center text-sm py-3 font-semibold block"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
