import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

import image6 from "../images/image3.avif";
import step3 from "../images/image1.avif";
import step4 from "../images/image4.avif";

/* ── Cart helpers ── */
const cartHelpers = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem("declutt_cart") || "[]");
    } catch {
      return [];
    }
  },
  set: (items) => localStorage.setItem("declutt_cart", JSON.stringify(items)),
  add: (listing, qty = 1) => {
    const cart = cartHelpers.get();
    const idx = cart.findIndex((i) => i.id === listing.id);
    if (idx > -1) {
      cart[idx].quantity = Math.min((cart[idx].quantity || 1) + qty, 99);
    } else {
      cart.push({
        id: listing.id,
        name: listing.name,
        price: listing.price,
        imageUrl: listing.imageUrl || null,
        category: listing.category || "",
        quantity: qty,
      });
    }
    cartHelpers.set(cart);
    window.dispatchEvent(new Event("cart-updated"));
  },
};

const CATEGORIES = [
  { id: "All", label: "All Items", emoji: "🏷️" },
  { id: "Electronics", label: "Electronics", emoji: "📱" },
  { id: "Furniture", label: "Furniture", emoji: "🛋️" },
  { id: "Clothing", label: "Clothing", emoji: "👗" },
  { id: "Books", label: "Books", emoji: "📚" },
  { id: "Appliances", label: "Appliances", emoji: "🏠" },
  { id: "Bikes & Vehicles", label: "Bikes & Vehicles", emoji: "🚲" },
  { id: "Sports", label: "Sports", emoji: "⚽" },
  { id: "Music", label: "Music", emoji: "🎵" },
  { id: "Kitchen", label: "Kitchen", emoji: "🍳" },
  { id: "Other", label: "Other", emoji: "✨" },
];

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371,
    dLat = ((lat2 - lat1) * Math.PI) / 180,
    dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const Spinner = ({ size = 22 }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

/* ── Toast ── */
const Toast = ({ msg, show }) => (
  <div
    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl whitespace-nowrap bg-primary text-primary-foreground transition-all duration-300 pointer-events-none ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
  >
    {msg}
  </div>
);

/* ── Listing Card ── */
const ListingCard = ({ listing, userCoords, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const dist =
    userCoords && listing.lat && listing.lng
      ? getDistanceKm(userCoords.lat, userCoords.lng, listing.lat, listing.lng)
      : null;

  const handleCart = (e) => {
    e.stopPropagation();
    cartHelpers.add(listing, 1);
    // brief visual feedback handled by parent
  };

  return (
    <div
      onClick={() => onSelect(listing)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-card rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl flex flex-col border border-border hover:border-primary/20 relative"
    >
      {/* Image area */}
      <div
        className="relative overflow-hidden bg-border/20"
        style={{ aspectRatio: "1/1" }}
      >
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/15">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Status badge — top left */}
        <div className="absolute top-2 left-2 z-10">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${listing.available ? "bg-green-500 text-white" : "bg-red-500/80 text-white"}`}
          >
            {listing.available ? "Available" : "Sold"}
          </span>
        </div>

        {/* Distance badge — bottom left */}
        {dist !== null && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {formatDist(dist)}
          </div>
        )}

        {/* Cart icon — bottom right, always visible on hover */}
        <button
          onClick={handleCart}
          className={`absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transition-all duration-200 ${hovered ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
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
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </button>

        {/* Hover overlay — "See Preview" button */}
        <div
          className={`absolute inset-0 bg-black/35 flex flex-col items-center justify-center transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(listing);
            }}
            className="px-4 py-2 bg-white text-foreground text-xs font-bold rounded-xl hover:bg-white/90 transition-colors shadow-md flex items-center gap-2"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            See Preview
          </button>
        </div>
      </div>

      {/* Info — LEFT aligned, condition badge at RIGHT */}
      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 text-left flex-1">
            {listing.name}
          </h3>
          {listing.condition && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
              {listing.condition}
            </span>
          )}
        </div>
        <p className="text-base font-black text-primary text-left">
          &#8358;{Number(listing.price).toLocaleString()}
        </p>
        <p className="text-[10px] text-foreground/40 truncate text-left">
          {listing.category}
        </p>
      </div>
    </div>
  );
};

/* ── Fresh Sellers Widget ── */
const FreshSellersWidget = ({ listings, onSelect }) => {
  const items = listings.filter((l) => l.available && l.imageUrl).slice(0, 5);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(
      () => setCurrentIdx((i) => (i + 1) % items.length),
      4000,
    );
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="hidden lg:flex flex-col rounded-xl border border-border bg-card h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <h3 className="text-sm font-bold text-foreground">Fresh Arrivals</h3>
          <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-xs text-foreground/40">
          No new listings yet
        </div>
      </div>
    );
  }

  const featured = items[currentIdx];
  return (
    <div className="hidden lg:flex flex-col rounded-xl border border-border bg-card h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-foreground">Fresh Arrivals</h3>
          <p className="text-[10px] text-foreground/40">New this week</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="relative shrink-0">
        <div
          className="relative h-44 cursor-pointer overflow-hidden group"
          onClick={() => onSelect(featured)}
        >
          <img
            src={featured.imageUrl}
            alt={featured.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white text-sm font-bold truncate mb-1">
              {featured.name}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-primary text-lg font-black">
                &#8358;{Number(featured.price).toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1">
                <div className="w-5 h-5 rounded-full bg-primary/60 flex items-center justify-center text-[8px] font-bold text-white">
                  {(featured.sellerName?.[0] || "?").toUpperCase()}
                </div>
                <p className="text-white/80 text-[10px] truncate max-w-[70px]">
                  {featured.sellerName}
                </p>
              </div>
            </div>
          </div>
        </div>
        {items.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`h-1 rounded-full transition-all ${i === currentIdx ? "w-4 bg-white" : "w-1 bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${i === currentIdx ? "bg-primary/5 border border-primary/20" : "hover:bg-border/30 border border-transparent"}`}
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-border/20">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {item.name}
              </p>
              <p className="text-[10px] text-foreground/40 truncate">
                {item.sellerName}
              </p>
            </div>
            <p className="text-xs font-black text-primary shrink-0">
              &#8358;{Number(item.price).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Hero Section ── */
const HeroSection = ({ listings, onSelect }) => {
  const slides = [
    {
      src: image6,
      title: "Premium Furniture, Real Deals",
      sub: "Find quality pieces from sellers near you",
      tag: "FEATURED",
    },
    {
      src: step3,
      title: "New Pieces Daily",
      sub: "Discover fresh furniture from your community",
      tag: "NEW",
    },
    {
      src: step4,
      title: "Buy & Sell Easily",
      sub: "Give your furniture a second life on Declutt",
      tag: "TRENDING",
    },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4"
      style={{ height: "clamp(280px, 45vw, 400px)" }}
    >
      <div className="relative rounded-2xl overflow-hidden border border-border group h-full">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0"}`}
          >
            <img
              src={s.src}
              alt={s.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-5 left-5 sm:bottom-8 sm:left-8 lg:bottom-10 lg:left-10">
              <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                {s.tag}
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 leading-tight max-w-xs sm:max-w-sm">
                {s.title}
              </h2>
              <p className="text-white/70 mt-1.5 text-xs sm:text-sm max-w-xs">
                {s.sub}
              </p>
              <button className="mt-3 px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity">
                Shop Now
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => setIdx((i) => (i + 1) % slides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
            />
          ))}
        </div>
      </div>
      <FreshSellersWidget listings={listings} onSelect={onSelect} />
    </div>
  );
};

/* ── Category Bar — FIXED: reliable horizontal scroll ── */
const CategoryBar = ({ active, onChange }) => {
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef(null);

  // Scroll to active pill whenever it changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector("[data-active='true']");
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [active]);

  return (
    <>
      <div className="relative">
        {/* Scrollable row */}
        <div
          ref={scrollRef}
          style={{
            display: "flex",
            flexWrap: "nowrap",
            gap: "8px",
            overflowX: "scroll",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingBottom: "8px",
            paddingLeft: "4px",
            paddingRight: "4px",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              data-active={active === cat.id ? "true" : "false"}
              onClick={() => onChange(cat.id)}
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all duration-200 ${
                active === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                  : "bg-card text-foreground/60 border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
        {/* Hide scrollbar */}
        <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>
      </div>

      <div className="flex justify-end mt-1">
        <button
          onClick={() => setShowAll(true)}
          className="text-xs font-semibold text-foreground/40 hover:text-primary transition-colors flex items-center gap-0.5"
        >
          See All{" "}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {showAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAll(false)}
        >
          <div
            className="bg-card rounded-2xl p-5 max-w-md w-full border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-foreground">
                All Categories
              </h3>
              <button
                onClick={() => setShowAll(false)}
                className="w-8 h-8 rounded-full hover:bg-border flex items-center justify-center"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onChange(cat.id);
                    setShowAll(false);
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${active === cat.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border hover:border-primary/30 hover:bg-primary/5"}`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-xs font-bold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Filter Bar ── */
const FilterBar = ({
  search,
  setSearch,
  showAvailable,
  setShowAvailable,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  userCoords,
  itemCount,
  hasFilters,
  clearFilters,
}) => (
  <div className="flex flex-wrap gap-2 items-center py-3 border-b border-border/60">
    <div className="relative flex-1 min-w-[160px]">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/35"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-8 pr-3 py-2 text-xs rounded-full border border-border bg-card focus:border-primary/50 outline-none transition-all text-foreground placeholder:text-foreground/30"
      />
    </div>
    <button
      onClick={() => setShowAvailable(!showAvailable)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-all ${showAvailable ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-foreground/50"}`}
    >
      <span
        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${showAvailable ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
      >
        {showAvailable && (
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      Available
    </button>
    <div className="flex items-center gap-1">
      <span className="text-xs font-bold text-foreground/35">&#8358;</span>
      <input
        type="number"
        placeholder="Min"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        className="w-16 px-2.5 py-2 text-xs rounded-full border border-border bg-card outline-none focus:border-primary/50 transition-all"
      />
      <span className="text-foreground/25 text-xs">—</span>
      <input
        type="number"
        placeholder="Max"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        className="w-16 px-2.5 py-2 text-xs rounded-full border border-border bg-card outline-none focus:border-primary/50 transition-all"
      />
    </div>
    {userCoords && (
      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2.5 py-1.5 rounded-full border border-blue-500/20">
        <svg
          className="w-2.5 h-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        GPS on
      </span>
    )}
    <span className="text-xs text-foreground/35 font-medium ml-auto">
      {itemCount} items
    </span>
    {hasFilters && (
      <button
        onClick={clearFilters}
        className="text-xs font-bold text-foreground/40 hover:text-red-500 transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border hover:border-red-500/30"
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
        Clear
      </button>
    )}
  </div>
);

/* ── Main Listings Page ── */
const Listings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [avail, setAvail] = useState(false);
  const [gps, setGps] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "" });

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2000);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { timeout: 8000 },
      );
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    getDocs(query(collection(db, "listings"), orderBy("createdAt", "desc")))
      .then((s) => setListings(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = listings.filter((l) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        [l.name, l.description, l.category, l.sellerName].some((f) =>
          f?.toLowerCase().includes(q),
        )) &&
      (cat === "All" || l.category === cat) &&
      (!avail || l.available === true) &&
      (!min || Number(l.price || 0) >= Number(min)) &&
      (!max || Number(l.price || 0) <= Number(max))
    );
  });

  const hasF = search || cat !== "All" || min || max || avail;
  const clear = () => {
    setSearch("");
    setCat("All");
    setMin("");
    setMax("");
    setAvail(false);
  };

  // Navigate to product page — this is what restores Navbar + Footer
  const handleSelect = (listing) => navigate(`/product/${listing.id}`);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-20 sm:pt-24 pb-10 space-y-5">
        <HeroSection listings={listings} onSelect={handleSelect} />

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-foreground">
              Shop by Category
            </h2>
          </div>
          <CategoryBar active={cat} onChange={setCat} />
        </section>

        <FilterBar
          search={search}
          setSearch={setSearch}
          showAvailable={avail}
          setShowAvailable={setAvail}
          minPrice={min}
          setMinPrice={setMin}
          maxPrice={max}
          setMaxPrice={setMax}
          userCoords={gps}
          itemCount={filtered.length}
          hasFilters={hasF}
          clearFilters={clear}
        />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/35 font-bold">
            All Listings
          </span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20 gap-2 text-foreground/40">
            <Spinner />
            <span className="text-sm">Loading items...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-border/30 flex items-center justify-center text-2xl mx-auto mb-3">
              🛋️
            </div>
            <p className="text-foreground/50 font-bold text-base mb-1">
              No listings found
            </p>
            <p className="text-sm text-foreground/35 mb-4">
              {listings.length === 0
                ? "No items listed yet."
                : "Try adjusting your filters"}
            </p>
            {hasF && (
              <button
                onClick={clear}
                className="text-primary text-sm font-bold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                userCoords={gps}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </main>
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
};

export default Listings;
