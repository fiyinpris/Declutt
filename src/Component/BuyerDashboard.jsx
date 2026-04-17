import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// FIX: trim display name to max 2 words
const formatDisplayName = (name) => {
  if (!name) return "there";
  return name.trim().split(/\s+/).slice(0, 2).join(" ");
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Dashboard",
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
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    // FIX: Cart icon for orders
    id: "orders",
    label: "My Orders",
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
        width="18"
        height="18"
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
        width="18"
        height="18"
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
        width="18"
        height="18"
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

const NAVBAR_H = 64;

const StatCard = ({ label, value, icon, accent, sub }) => (
  <div
    className={`rounded-2xl px-5 py-5 flex flex-col gap-2 ${accent ? "bg-primary/8" : "bg-background"}`}
    style={{
      border: `2px solid ${accent ? "hsl(var(--primary)/0.25)" : "hsl(var(--border))"}`,
    }}
  >
    <div className="flex items-start justify-between">
      <div>
        <p
          className={`text-2xl font-black ${accent ? "text-primary" : "text-foreground"}`}
        >
          {value}
        </p>
        <p className="text-xs text-foreground/50 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-foreground/35 mt-0.5">{sub}</p>}
      </div>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}
      >
        {icon}
      </div>
    </div>
  </div>
);

const Empty = ({ msg, cta, ctaLink }) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center">
    <div className="w-14 h-14 rounded-full bg-border/30 flex items-center justify-center text-foreground/20">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    </div>
    <p className="text-sm text-foreground/40">{msg}</p>
    {cta && (
      <Link
        to={ctaLink}
        className="text-primary text-sm font-semibold hover:underline underline-offset-4"
      >
        {cta} →
      </Link>
    )}
  </div>
);

const ListingCard = ({ listing }) => (
  <div
    className="bg-background rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 group"
    style={{ border: "2px solid hsl(var(--border))" }}
  >
    <div className="aspect-video relative overflow-hidden bg-border/20">
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt={listing.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-foreground/15 text-xs">
          No image
        </div>
      )}
    </div>
    <div className="p-3">
      <p className="text-sm font-semibold text-foreground truncate">
        {listing.name}
      </p>
      <p className="text-xs text-foreground/45 truncate">
        {listing.category} · {listing.location}
      </p>
      <p className="text-sm font-bold text-primary mt-1.5">
        ₦{Number(listing.price).toLocaleString()}
      </p>
    </div>
  </div>
);

/* ── Overview Panel ── */
const OverviewPanel = ({ profile, listings, setTab }) => {
  // FIX: first word only for greeting
  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)/0.12), hsl(var(--primary)/0.04))",
          border: "2px solid hsl(var(--primary)/0.2)",
        }}
      >
        <div>
          <p className="text-lg font-black text-foreground">
            {greeting}, {firstName} 👋
          </p>
          <p className="text-sm text-foreground/55 mt-0.5">
            Find great deals from sellers near you.
          </p>
        </div>
        <Link
          to="/listings"
          className="main-button text-sm px-5 py-2.5 inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Browse items
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Orders placed"
          value="0"
          sub="lifetime total"
          icon={NAV_ITEMS[1].icon}
        />
        <StatCard
          label="Saved items"
          value="0"
          sub="in your wishlist"
          icon={NAV_ITEMS[2].icon}
        />
        <StatCard
          label="Reward points"
          value={profile?.rewards ?? 0}
          sub="redeemable"
          icon={NAV_ITEMS[3].icon}
          accent
        />
        <StatCard
          label="Referrals made"
          value="0"
          sub="friends invited"
          icon={NAV_ITEMS[4].icon}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Track your orders",
            desc: "See order status & history",
            tab: "orders",
            color: "text-amber-500",
          },
          {
            label: "Saved items",
            desc: "Items you've bookmarked",
            tab: "favourites",
            color: "text-rose-500",
          },
          {
            label: "Redeem points",
            desc: "Use your earned rewards",
            tab: "rewards",
            color: "text-primary",
          },
        ].map((a) => (
          <button
            key={a.tab}
            onClick={() => setTab(a.tab)}
            className="flex items-center gap-3 p-4 rounded-xl bg-background text-left hover:border-primary/30 transition-all duration-200"
            style={{ border: "2px solid hsl(var(--border))" }}
          >
            <div
              className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ${a.color}`}
            >
              {NAV_ITEMS.find((n) => n.id === a.tab)?.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{a.label}</p>
              <p className="text-xs text-foreground/45">{a.desc}</p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground/25 ml-auto flex-shrink-0"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-foreground">
            Fresh in the market
          </p>
          <Link
            to="/listings"
            className="text-xs text-primary font-semibold hover:underline underline-offset-4"
          >
            Browse all →
          </Link>
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {listings.slice(0, 6).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <Empty
            msg="No listings yet."
            cta="Check back soon"
            ctaLink="/listings"
          />
        )}
      </div>
    </div>
  );
};

/* ── Orders Panel ── */
const ORDER_TABS = [
  "All",
  "Pending",
  "Confirmed",
  "On the way",
  "Delivered",
  "Cancelled",
];

const OrdersPanel = () => {
  const [activeTab, setActiveTab] = useState("All");
  const orders = [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-foreground">My Orders</p>
        <span className="text-xs text-foreground/40 bg-border/40 px-3 py-1 rounded-full">
          {orders.length} total
        </span>
      </div>

      <div className="relative border-b border-border">
        <div
          className="flex gap-1 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {ORDER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`relative px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0 focus:outline-none rounded-t-lg ${activeTab === t ? "text-primary bg-primary/5" : "text-foreground/45 hover:text-foreground/70 hover:bg-border/20"}`}
            >
              {t}
              {activeTab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-border/30 flex items-center justify-center text-foreground/20">
            {/* Cart icon in empty state too */}
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/50">
              No orders yet
            </p>
            <p className="text-xs text-foreground/30 mt-1">
              Items you order will appear here with live status updates.
            </p>
          </div>
          <Link
            to="/listings"
            className="main-button text-sm px-5 py-2.5 inline-flex items-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Start browsing
          </Link>
        </div>
      ) : (
        orders
          .filter((o) => activeTab === "All" || o.status === activeTab)
          .map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-background"
              style={{ border: "2px solid hsl(var(--border))" }}
            >
              <div className="w-14 h-14 rounded-xl bg-border/30 overflow-hidden flex-shrink-0">
                {order.imageUrl && (
                  <img
                    src={order.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {order.itemName}
                </p>
                <p className="text-xs text-foreground/45 mt-0.5">
                  {order.sellerName} · {order.date}
                </p>
                <span
                  className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${order.status === "Delivered" ? "bg-green-500/15 text-green-600 border border-green-500/25" : order.status === "Pending" ? "bg-amber-500/15 text-amber-600 border border-amber-500/25" : order.status === "Cancelled" ? "bg-red-500/15 text-red-500 border border-red-500/25" : order.status === "On the way" ? "bg-blue-500/15 text-blue-500 border border-blue-500/25" : "bg-primary/15 text-primary border border-primary/25"}`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm font-bold text-primary flex-shrink-0">
                ₦{Number(order.price).toLocaleString()}
              </p>
            </div>
          ))
      )}
    </div>
  );
};

/* ── Favourites Panel ── */
const FavouritesPanel = () => (
  <div className="space-y-4">
    <p className="text-lg font-bold text-foreground">Saved Items</p>
    <div className="py-16 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-border/30 flex items-center justify-center text-foreground/20">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground/50">
          Nothing saved yet
        </p>
        <p className="text-xs text-foreground/30 mt-1">
          Tap the heart icon on any listing to save it here.
        </p>
      </div>
      <Link
        to="/listings"
        className="main-button text-sm px-5 py-2.5 inline-flex items-center gap-2"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        Explore listings
      </Link>
    </div>
  </div>
);

/* ── Rewards Panel ── */
const RewardsPanel = ({ profile }) => {
  const pts = profile?.rewards ?? 0;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">My Points</h2>
        <p className="text-sm text-foreground/50 mt-0.5">
          Hello {profile?.name?.trim().split(/\s+/)[0]}
        </p>
      </div>
      <div
        className="flex items-center gap-4 p-5 rounded-2xl bg-background"
        style={{ border: "2px solid hsl(var(--border))" }}
      >
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div>
          <p className="text-3xl font-black text-primary">{pts}</p>
          <p className="text-xs text-foreground/45">reward points</p>
        </div>
        <button className="ml-auto main-button px-4 py-2 text-sm font-bold">
          Redeem
        </button>
      </div>
      <div>
        <p className="text-sm font-bold text-foreground mb-3">
          How to Earn Points
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: "Order on Declutt",
              desc: "Earn points for every purchase.",
            },
            {
              title: "Refer a friend",
              desc: "Invite friends and earn bonus points.",
            },
            {
              title: "Write a review",
              desc: "Get rewarded for sharing feedback.",
            },
            {
              title: "Special events",
              desc: "Earn double points during promos.",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="flex items-start gap-3 p-4 rounded-xl bg-background"
              style={{ border: "2px solid hsl(var(--border))" }}
            >
              <div className="w-6 h-6 rounded-full border-[2px] border-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{r.title}</p>
                <p className="text-xs text-foreground/50 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Referrals Panel ── */
const ReferralsPanel = ({ profile }) => {
  const [copied, setCopied] = useState(false);
  const code = profile?.referralCode ?? "—";
  const link = `${window.location.origin}/signup?ref=${code}`;
  const copy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="space-y-5">
      <p className="text-lg font-bold text-foreground">Refer &amp; Earn</p>
      <div
        className="p-5 rounded-2xl bg-background space-y-4"
        style={{ border: "2px solid hsl(var(--border))" }}
      >
        <p className="text-sm text-foreground/60">
          Share your unique link. When a friend signs up using it, you both earn
          reward points.
        </p>
        <div>
          <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-2">
            Your referral code
          </p>
          <div className="flex gap-2">
            <span
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono text-foreground/70 truncate bg-background"
              style={{ border: "2px solid hsl(var(--border))" }}
            >
              {code}
            </span>
            <button
              onClick={copy}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${copied ? "bg-green-500 text-white" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
              style={{ border: "2px solid hsl(var(--primary)/0.25)" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Logout hook ── */
const useLogout = (logoutFn, navigate) => {
  const [state, setState] = useState("idle");
  const handleLogout = async () => {
    setState("loading");
    await new Promise((r) => setTimeout(r, 1400));
    setState("success");
    await new Promise((r) => setTimeout(r, 1600));
    await logoutFn();
    navigate("/");
  };
  return { state, handleLogout };
};

const LogoutButton = ({ onLogout, state }) => (
  <button
    onClick={onLogout}
    disabled={state !== "idle"}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${state === "success" ? "bg-green-500 text-white" : state === "loading" ? "bg-red-400 text-white" : "text-white bg-red-500 hover:bg-red-600"} disabled:cursor-not-allowed`}
  >
    {state === "loading" && (
      <svg
        className="animate-spin shrink-0"
        width="15"
        height="15"
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
        width="15"
        height="15"
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
        width="15"
        height="15"
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
        ? "Signed out! 👋"
        : "Log out"}
  </button>
);

/* ── Main BuyerDashboard ── */
const BuyerDashboard = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState("overview");
  const [listings, setListings] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state: logoutState, handleLogout } = useLogout(logout, navigate);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get("tab");
    if (p && NAV_ITEMS.find((n) => n.id === p)) setTab(p);
  }, [location.search]);

  useEffect(() => {
    getDocs(query(collection(db, "listings"), orderBy("createdAt", "desc")))
      .then((snap) =>
        setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch(console.error);
  }, []);

  const initials = getInitials(profile?.name);
  const displayName = formatDisplayName(profile?.name);

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-card">
      {!mobile && (
        <div className="px-5 py-4 shrink-0 flex items-center">
          <Link to="/" className="text-lg font-bold">
            <span className="text-foreground">De</span>
            <span className="text-primary">clutt</span>
          </Link>
        </div>
      )}
      {mobile && (
        <div
          className="px-5 py-4 shrink-0 flex items-center justify-between"
          style={{ borderBottom: "1px solid hsl(var(--border)/0.4)" }}
        >
          <Link
            to="/"
            className="text-lg font-bold"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-foreground">De</span>
            <span className="text-primary">clutt</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-foreground/50 hover:text-foreground transition-colors"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setTab(item.id);
              if (mobile) setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all duration-150 ${tab === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/60 hover:text-primary hover:bg-primary/8"}`}
          >
            <span className={tab === item.id ? "opacity-90" : "opacity-55"}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
      <div
        className="shrink-0 px-3 py-4 space-y-2"
        style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/15 text-primary flex items-center justify-center text-sm font-black border-2 border-primary/20 shrink-0">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            {/* FIX: max 2-word display name */}
            <p className="text-xs font-bold text-foreground truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-foreground/40 truncate">
              {profile?.email}
            </p>
          </div>
        </div>
        <LogoutButton onLogout={handleLogout} state={logoutState} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex pt-16">
      {/* FIX: sticky sidebar — stops naturally at footer, doesn't overlay it */}
      <aside
        className="hidden md:flex flex-col w-64 xl:w-72 shrink-0"
        style={{
          position: "sticky",
          top: `${NAVBAR_H}px`,
          height: `calc(100vh - ${NAVBAR_H}px)`,
          borderRight: "1px solid hsl(var(--border)/0.35)",
          alignSelf: "flex-start",
        }}
      >
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className="md:hidden fixed left-0 bottom-0 z-50 w-72 flex flex-col bg-card"
        style={{
          top: `${NAVBAR_H}px`,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
          borderRight: "1px solid hsl(var(--border)/0.4)",
        }}
      >
        <SidebarContent mobile />
      </div>

      <main className="flex-1 min-w-0 flex flex-col">
        <div
          className="md:hidden sticky top-16 z-30 bg-background/90 backdrop-blur-md px-4 h-12 flex items-center justify-between gap-3"
          style={{ borderBottom: "1px solid hsl(var(--border)/0.4)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            style={{ border: "1.5px solid hsl(var(--border))" }}
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
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-bold text-foreground">
            {NAV_ITEMS.find((n) => n.id === tab)?.label}
          </span>
          <Link
            to="/listings"
            className="text-xs font-semibold text-primary px-3 py-1.5 rounded-xl"
            style={{ border: "1.5px solid hsl(var(--primary)/0.3)" }}
          >
            Browse
          </Link>
        </div>
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl w-full mx-auto">
          {tab === "overview" && (
            <OverviewPanel
              profile={profile}
              listings={listings}
              setTab={setTab}
            />
          )}
          {tab === "orders" && <OrdersPanel />}
          {tab === "favourites" && <FavouritesPanel />}
          {tab === "rewards" && <RewardsPanel profile={profile} />}
          {tab === "referrals" && <ReferralsPanel profile={profile} />}
        </div>
      </main>
    </div>
  );
};

export default BuyerDashboard;
