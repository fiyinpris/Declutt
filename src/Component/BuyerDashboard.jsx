import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useSavedItems } from "../utils/savedItems";
import ChatCenter from "./ChatCenter";
import { markDelivered } from "./Chatui";
import { Ico, Spin } from "./Ico";
import { useCloseFooterGap } from "../utils/footerGap";
import ProfilePhotoCard from "./ProfilePhotoCard";
import { OrdersList } from "./Orders";

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
      <Ico r>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </Ico>
    ),
  },
  {
    id: "messages",
    label: "Messages",
    icon: (
      <Ico r>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </Ico>
    ),
  },
  {
    id: "orders",
    label: "My Orders",
    icon: (
      <Ico r>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </Ico>
    ),
  },
  {
    id: "favourites",
    label: "Saved Items",
    icon: (
      <Ico r>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </Ico>
    ),
  },
  {
    id: "rewards",
    label: "Rewards / Points",
    icon: (
      <Ico r>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </Ico>
    ),
  },
  {
    id: "referrals",
    label: "Referrals",
    icon: (
      <Ico r>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </Ico>
    ),
  },
  {
    id: "profile",
    label: "My Profile",
    icon: (
      <Ico r>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </Ico>
    ),
  },
];

const navIcon = (id) => NAV_ITEMS.find((n) => n.id === id)?.icon;
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
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}
      >
        {icon}
      </div>
    </div>
  </div>
);

/* ── Overview Panel ── */
const OverviewPanel = ({ profile, setTab, savedCount, unread }) => {
  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)/0.12), hsl(var(--primary)/0.04))",
          border: "2px solid hsl(var(--primary)/0.2)",
        }}
      >
        <div>
          <p className="text-lg font-black text-foreground">
            {greeting}, {firstName}
          </p>
          <p className="text-sm text-foreground/55 mt-0.5">
            Find great deals from sellers near you.
          </p>
        </div>
        <Link
          to="/listings"
          className="main-button text-sm px-5 py-2.5 inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <Ico s={14} w={2.5} r>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </Ico>
          Browse items
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Orders placed"
          value="0"
          sub="lifetime total"
          icon={navIcon("orders")}
        />
        <StatCard
          label="Saved items"
          value={savedCount}
          sub="in your wishlist"
          icon={navIcon("favourites")}
        />
        <StatCard
          label="Reward points"
          value={profile?.rewards ?? 0}
          sub="redeemable"
          icon={navIcon("rewards")}
          accent
        />
        <StatCard
          label="Referrals made"
          value="0"
          sub="friends invited"
          icon={navIcon("referrals")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Messages",
            desc:
              unread > 0
                ? `${unread} unread from sellers`
                : "Chat with sellers",
            tab: "messages",
          },
          {
            label: "Track your orders",
            desc: "See order status & history",
            tab: "orders",
          },
          {
            label: "Saved items",
            desc: "Items you've bookmarked",
            tab: "favourites",
          },
          {
            label: "Redeem points",
            desc: "Use your earned rewards",
            tab: "rewards",
          },
        ].map((a) => (
          <button
            key={a.tab}
            onClick={() => setTab(a.tab)}
            className="flex items-center gap-3 p-4 rounded-xl bg-background text-left hover:border-primary/30 transition-all duration-200"
            style={{ border: "2px solid hsl(var(--border))" }}
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {navIcon(a.tab)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{a.label}</p>
              <p className="text-xs text-foreground/45 truncate">{a.desc}</p>
            </div>
            <Ico
              s={14}
              w={2.5}
              r
              className="text-foreground/25 ml-auto shrink-0"
            >
              <path d="m9 18 6-6-6-6" />
            </Ico>
          </button>
        ))}
      </div>
    </div>
  );
};

const OrdersPanel = ({ uid }) => (
  <div className="space-y-5">
    <div className="flex items-center justify-between">
      <p className="text-lg font-bold text-foreground">My Orders</p>
    </div>
    <OrdersList
      uid={uid}
      viewer="buyer"
      empty={
        <div className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-border/30 flex items-center justify-center text-foreground/20">
            <Ico s={30} w={1.5}>
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </Ico>
          </div>
          <p className="text-sm font-semibold text-foreground/50">
            No orders yet
          </p>
          <p className="text-xs text-foreground/30">
            Items you order will appear here with live status updates.
          </p>
          <Link
            to="/listings"
            className="main-button text-sm px-5 py-2.5 inline-flex items-center gap-2"
          >
            Browse listings
          </Link>
        </div>
      }
    />
  </div>
);

/* ── Saved Items (live, Firestore-backed) ── */
const FavouritesPanel = ({ items, onRemove }) => {
  const list = [...items].reverse(); // newest first
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-foreground">Saved Items</p>
        <span className="text-xs text-foreground/40 bg-border/40 px-3 py-1 rounded-full">
          {list.length} item{list.length !== 1 ? "s" : ""}
        </span>
      </div>
      {list.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-border/30 flex items-center justify-center text-foreground/20">
            <Ico s={30} w={1.5}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </Ico>
          </div>
          <p className="text-sm font-semibold text-foreground/50">
            Nothing saved yet
          </p>
          <p className="text-xs text-foreground/30">
            Tap the heart icon on any listing to save it here.
          </p>
          <Link to="/listings" className="main-button text-sm px-5 py-2.5">
            Explore listings
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {list.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl overflow-hidden bg-background flex flex-col"
              style={{ border: "2px solid hsl(var(--border))" }}
            >
              <Link to={`/product/${item.id}`} className="block">
                <div className="aspect-[4/3] bg-border/20 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/15 text-xs">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground truncate">
                    {item.name}
                  </p>
                  {item.category && (
                    <p className="text-xs text-foreground/40 truncate mt-0.5">
                      {item.category}
                    </p>
                  )}
                  <p className="text-sm font-black text-primary mt-1">
                    ₦{Number(item.price).toLocaleString()}
                  </p>
                </div>
              </Link>
              <div className="flex gap-2 px-3 pb-3 mt-auto">
                <Link
                  to={`/product/${item.id}`}
                  className="flex-1 text-center py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                >
                  View
                </Link>
                <button
                  onClick={() => onRemove(item.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                  style={{ border: "1.5px solid hsl(var(--border))" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Ico s={28} w={1.5} r className="text-primary">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </Ico>
        </div>
        <div>
          <p className="text-3xl font-black text-primary">{pts}</p>
          <p className="text-xs text-foreground/45">reward points</p>
        </div>
        <button className="ml-auto main-button px-4 py-2 text-sm font-bold">
          Redeem
        </button>
      </div>
    </div>
  );
};

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

const ProfilePanel = ({ profile }) => {
  const since = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString([], {
        month: "long",
        year: "numeric",
      })
    : null;
  const rows = [
    ["Name", profile?.name],
    ["Email", profile?.email],
    ["Account type", "Buyer"],
    ["Member since", since],
  ].filter(([, v]) => v);
  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <p className="text-2xl font-black text-foreground">My Profile</p>
          <p className="text-sm text-foreground/50 mt-0.5">
            Your photo is shown to sellers you chat with.
          </p>
        </div>
        <ProfilePhotoCard />
        <div
          className="p-5 rounded-2xl bg-card divide-y divide-border/60 text-left"
          style={{ border: "1.5px solid hsl(var(--border))" }}
        >
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">
                {label}
              </span>
              <span className="text-sm font-semibold text-foreground truncate">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
    {state === "loading" && <Spin />}
    {state === "success" && (
      <Ico s={15} w={2.5} r className="shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </Ico>
    )}
    {state === "idle" && (
      <Ico s={15} r className="shrink-0">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </Ico>
    )}
    {state === "loading"
      ? "Signing out..."
      : state === "success"
        ? "Signed out!"
        : "Log out"}
  </button>
);

/* ── Main BuyerDashboard ── */
const BuyerDashboard = () => {
  const { user, profile, logout } = useAuth();
  const uid = user?.uid || profile?.uid || null;
  const navigate = useNavigate();
  const location = useLocation();
  // The URL (?tab=…) is the source of truth, so the phone tab bar and the sidebar always agree
  const tabParam = new URLSearchParams(location.search).get("tab");
  const tab = NAV_ITEMS.some((n) => n.id === tabParam) ? tabParam : "overview";
  const setTab = (id) =>
    navigate(id === "overview" ? location.pathname : `?tab=${id}`);
  const rootRef = useRef(null);
  const pull = useCloseFooterGap(rootRef);
  const [unread, setUnread] = useState(0);
  const { state: logoutState, handleLogout } = useLogout(logout, navigate);
  const { items: savedItems, remove: removeSavedItem } = useSavedItems(uid);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);

  // Unread seller replies → badge
  useEffect(() => {
    if (!uid) {
      setUnread(0);
      return;
    }
    const q = query(
      collection(db, "messages"),
      where("buyerUid", "==", uid),
      where("from", "==", "seller"),
      where("read", "==", false),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUnread(snap.size);
        markDelivered(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          "buyer",
        );
      },
      (err) => console.error("Unread badge listener:", err),
    );
    return () => unsub();
  }, [uid]);

  const initials = getInitials(profile?.name);
  const displayName = formatDisplayName(profile?.name);

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-card">
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto mb-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all duration-150 ${tab === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/60 hover:text-primary hover:bg-primary/8"}`}
          >
            <span className={tab === item.id ? "opacity-90" : "opacity-55"}>
              {item.icon}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.id === "messages" && unread > 0 && (
              <span className="min-w-[22px] h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center px-1.5">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            {item.id === "favourites" && savedItems.length > 0 && (
              <span
                className={`min-w-[22px] h-5 rounded-full text-[10px] font-black flex items-center justify-center px-1.5 ${tab === item.id ? "bg-white/25 text-primary-foreground" : "bg-primary/15 text-primary"}`}
              >
                {savedItems.length > 99 ? "99+" : savedItems.length}
              </span>
            )}
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
    <div
      ref={rootRef}
      className="flex-1 md:min-h-screen bg-background flex flex-col"
      style={{ paddingTop: `${NAVBAR_H}px`, marginBottom: -pull }}
    >
      <div className="flex flex-1 md:min-h-screen items-stretch">
        {/* Desktop sidebar — full height, scrolls with page (not sticky) */}
        <aside
          className="hidden md:flex flex-col w-64 xl:w-72 shrink-0"
          style={{
            minHeight: "100vh",
            height: "auto",
            overflowY: "auto",
            borderRight: "1px solid hsl(var(--border)/0.35)",
            background: "hsl(var(--card))",
            alignSelf: "stretch",
          }}
        >
          {renderSidebar()}
        </aside>

        {/* Phones navigate with the tab bar in Navbar.jsx — no sidebar or hamburger here */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl w-full mx-auto">
            {tab === "overview" && (
              <OverviewPanel
                profile={profile}
                setTab={setTab}
                savedCount={savedItems.length}
                unread={unread}
              />
            )}
            {tab === "messages" && (
              <ChatCenter
                role="buyer"
                uid={uid}
                selfName={profile?.name || user?.displayName}
                offset={230}
              />
            )}
            {tab === "orders" && <OrdersPanel uid={user?.uid} />}
            {tab === "favourites" && (
              <FavouritesPanel items={savedItems} onRemove={removeSavedItem} />
            )}
            {tab === "rewards" && <RewardsPanel profile={profile} />}
            {tab === "referrals" && <ReferralsPanel profile={profile} />}
            {tab === "profile" && <ProfilePanel profile={profile} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BuyerDashboard;
