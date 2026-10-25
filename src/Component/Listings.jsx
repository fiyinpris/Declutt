import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useBuyerLocation, listingDistance } from "../utils/geo";
import { cartHelpers } from "../utils/Cart";
import {
  CATEGORIES,
  isFeatured,
  isPublicListing,
  normalizeCategory,
} from "../utils/categories";
import { useAuth } from "../context/AuthContext";
import { LocationBanner } from "./GeoUI";

import image6 from "../images/image3.avif";
import step3 from "../images/image1.avif";
import step4 from "../images/image4.avif";

/* ── Animation keyframes injected once ── */
const STYLES = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes arrowPulse {
  0%   { opacity: 0;   transform: translateX(-4px); }
  30%  { opacity: 1;   transform: translateX(0px);  }
  60%  { opacity: 1;   transform: translateX(4px);  }
  100% { opacity: 0;   transform: translateX(8px);  }
}
.card-enter {
  opacity: 0;
  animation: fadeSlideUp 0.45s ease forwards;
}
.arrow-pulse {
  animation: arrowPulse 2.4s ease-in-out infinite;
}
`;

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

const Toast = ({ msg, show }) => (
  <div
    style={{ bottom: "calc(var(--tabbar-h) + 2rem)" }}
    className={`fixed left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl whitespace-nowrap bg-primary text-primary-foreground transition-all duration-300 pointer-events-none ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
  >
    {msg}
  </div>
);

/* ── Search Bar ── */
const TopSearchBar = ({
  search,
  setSearch,
  selectedCategory,
  setSelectedCategory,
  hasFilters,
  clearFilters,
  categories,
}) => (
  <div id="listings-search" className="flex flex-col gap-2">
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/35"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="listings-search-input"
          type="text"
          placeholder="Search items, categories, sellers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full border border-border bg-card focus:border-primary/50 outline-none transition-all text-foreground placeholder:text-foreground/35 shadow-sm"
        />
      </div>
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="shrink-0 text-xs font-bold text-foreground/40 hover:text-red-500 transition-colors flex items-center gap-1 px-2.5 py-2 rounded-full border border-border hover:border-red-500/30"
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

    {/* Category chips with left/right fade edges */}
    <div className="relative mt-3 mb-3">
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10"
        style={{
          background:
            "linear-gradient(to right, hsl(var(--background)), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10"
        style={{
          background:
            "linear-gradient(to left, hsl(var(--background)), transparent)",
        }}
      />
      <div
        className="flex gap-3 overflow-x-auto px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {(categories.length ? ["All", ...categories] : ["All"]).map((cat) => {
          const isAll = cat === "All";
          const active = isAll ? !selectedCategory : selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(
                  isAll ? "" : selectedCategory === cat ? "" : cat,
                )
              }
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground/55 border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

/* ── Listing Card ── */
const ListingCard = ({
  listing,
  loc,
  uid,
  onSelect,
  onAddToCart,
  animDelay = 0,
}) => {
  // The number on the card always mirrors what is really in the cart
  const [qty, setQty] = useState(() => cartHelpers.qtyOf(uid, listing.id));
  useEffect(() => {
    const sync = () => setQty(cartHelpers.qtyOf(uid, listing.id));
    sync();
    window.addEventListener("cart-updated", sync);
    return () => window.removeEventListener("cart-updated", sync);
  }, [uid, listing.id]);
  // Real distance from the buyer's live GPS position to the seller's saved coordinates.
  // null (no badge) when either side is unknown — we never show a guessed number.
  const dist = listingDistance(listing, loc);

  const handleAddFirst = (e) => {
    e.stopPropagation();
    cartHelpers.add(uid, listing, 1);
    onAddToCart?.();
  };
  const handleInc = (e) => {
    e.stopPropagation();
    cartHelpers.add(uid, listing, 1);
    onAddToCart?.();
  };
  const handleDec = (e) => {
    e.stopPropagation();
    cartHelpers.decrement(uid, listing.id);
  };

  return (
    <div
      data-listing-id={listing.id}
      className="card-enter bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg flex flex-col border border-border/60 relative group text-left"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div
        className="relative overflow-hidden bg-muted cursor-pointer"
        style={{ aspectRatio: "1/1" }}
        onClick={() => onSelect(listing)}
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
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${listing.available ? "bg-green-500 text-white" : "bg-red-500/80 text-white"}`}
          >
            {listing.available ? "Available" : "Sold"}
          </span>
          {isFeatured(listing) && (
            <span className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-primary text-primary-foreground shadow">
              ★ Featured
            </span>
          )}
        </div>
        {dist && (
          <div
            title="Straight-line distance from your current location"
            className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold"
          >
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
            {dist.label}
          </div>
        )}
        <div
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {qty === 0 ? (
            <button
              onClick={handleAddFirst}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
            >
              <svg
                width="11"
                height="11"
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
              Add to cart
            </button>
          ) : (
            <div className="flex items-center rounded-full bg-primary shadow-lg overflow-hidden">
              <button
                onClick={handleDec}
                className="w-7 h-7 flex items-center justify-center text-primary-foreground font-bold text-base hover:bg-black/10 transition-colors"
              >
                −
              </button>
              <span className="text-primary-foreground text-xs font-bold min-w-[20px] text-center">
                {qty}
              </span>
              <button
                onClick={handleInc}
                className="w-7 h-7 flex items-center justify-center text-primary-foreground font-bold text-base hover:bg-black/10 transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className="p-3 flex flex-col gap-1 min-h-[110px] cursor-pointer"
        onClick={() => onSelect(listing)}
      >
        {/* phones: condition sits under the name so long names aren't squeezed */}
        <div className="flex flex-col min-[400px]:flex-row items-start justify-between gap-1 min-[400px]:gap-2">
          <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2 text-left flex-1 min-w-0 break-words">
            {listing.name}
          </h3>
          {listing.condition && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
              {listing.condition}
            </span>
          )}
        </div>
        {listing.category && (
          <p className="text-[10px] text-foreground/60 leading-snug uppercase tracking-wide">
            {listing.category}
          </p>
        )}
        {listing.sku && (
          <p className="text-[9px] text-foreground/35 truncate">
            SKU: {listing.sku}
          </p>
        )}
        <div className="mt-auto">
          <p className="text-sm font-black text-foreground text-left">
            &#8358;{Number(listing.price).toLocaleString()}.00
          </p>
        </div>
      </div>
    </div>
  );
};

/* Non-clickable display tile */
const CollectionTile = ({ item, className, style }) => {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden select-none pointer-events-none ${className}`}
      style={style}
    >
      {item?.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name || "Popular item"}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-foreground/50 text-sm uppercase tracking-[0.2em]">
          No image
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3">
        <span className="inline-flex items-center bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
          {item?.category || item?.name}
        </span>
        <p className="text-white text-[10px] mt-1 truncate opacity-75 font-medium">
          {item?.name}
        </p>
      </div>
    </div>
  );
};

/* Arrow hint — purely visual, pointer-events none */
const ArrowHint = ({ direction, visible }) => (
  <div
    className="absolute top-0 bottom-0 flex items-center"
    style={{
      [direction === "right" ? "right" : "left"]: 0,
      zIndex: 10,
      pointerEvents: "none",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.3s ease",
    }}
  >
    <div
      className="absolute top-0 bottom-0 w-20"
      style={{
        [direction === "right" ? "right" : "left"]: 0,
        background:
          direction === "right"
            ? "linear-gradient(to left, hsl(var(--background)), transparent)"
            : "linear-gradient(to right, hsl(var(--background)), transparent)",
      }}
    />
    <div
      className="arrow-pulse relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-primary/90 text-primary-foreground shadow-lg"
      style={{
        [direction === "right" ? "marginRight" : "marginLeft"]: "6px",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: direction === "left" ? "scaleX(-1)" : "none" }}
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </div>
  </div>
);

/* ── Popular Collections ── */
const MOBILE_SLOTS = 10;

const PopularCollections = ({ listings }) => {
  const pool = listings.filter((l) => l.available);
  const [showRight, setShowRight] = useState(true);
  const [showLeft, setShowLeft] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeft(scrollLeft > 20);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 20);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (pool.length === 0) return null;

  const getItem = (slot) => pool[slot % pool.length];

  return (
    <section className="py-2">
      <div className="text-center mb-5">
        <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          Popular Collections
        </h2>
        <div className="w-8 h-0.5 bg-primary mx-auto mt-2 mb-2.5 rounded-full" />
      </div>

      {/* Desktop: 4-tile grid — not clickable */}
      <div
        className="hidden sm:flex gap-3 pointer-events-none select-none"
        style={{ height: "360px" }}
      >
        <CollectionTile item={getItem(0)} className="flex-1 h-full" />
        <div className="flex flex-col gap-3 flex-1 h-full">
          <CollectionTile
            item={getItem(1)}
            className="w-full"
            style={{ flex: "1 1 0", minHeight: 0 }}
          />
          <CollectionTile
            item={getItem(2)}
            className="w-full"
            style={{ flex: "1 1 0", minHeight: 0 }}
          />
        </div>
        <CollectionTile item={getItem(3)} className="flex-1 h-full" />
      </div>

      {/* Mobile: horizontal scroll with left + right hint arrows */}
      <div className="sm:hidden relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {Array.from({ length: MOBILE_SLOTS }, (_, slot) => (
            <CollectionTile
              key={slot}
              item={getItem(slot)}
              className="flex-shrink-0"
              style={{
                width: "calc(50vw - 18px)",
                minWidth: "168px",
                height: "260px",
              }}
            />
          ))}
        </div>
        <ArrowHint direction="left" visible={showLeft} />
        <ArrowHint direction="right" visible={showRight} />
      </div>
    </section>
  );
};

/* ── Hero Section ── */
const HeroSection = () => {
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
      className="relative rounded-2xl overflow-hidden border border-border group mt-12"
      style={{ height: "clamp(240px, 40vw, 380px)" }}
    >
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
          <div className="absolute bottom-5 left-5 sm:bottom-8 sm:left-8 lg:bottom-10 lg:left-10 min-h-[9rem] sm:min-h-[10rem]">
            <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
              {s.tag}
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 leading-tight max-w-xs sm:max-w-sm">
              {s.title}
            </h2>
            <p className="text-white/70 mt-1.5 text-xs sm:text-sm max-w-xs">
              {s.sub}
            </p>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("all-listings")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="mt-3 px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Shop Now
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25"
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
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25"
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
  );
};

/* ── Main Listings Page ── */
const Listings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const uid = user?.uid || null;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [toast, setToast] = useState({ show: false, msg: "" });
  const resultsRef = useRef(null);
  const didMount = useRef(false);

  // Buyer's live position (watches GPS, so distances update as they move)
  const loc = useBuyerLocation();

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2000);
  };

  useEffect(() => {
    if (document.getElementById("listings-anim-styles")) return;
    const tag = document.createElement("style");
    tag.id = "listings-anim-styles";
    tag.textContent = STYLES;
    document.head.appendChild(tag);
  }, []);

  useEffect(() => {
    if (location.state?.scrollToSearch) {
      setTimeout(() => {
        const el = document.getElementById("listings-search-input");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }, 120);
    }
  }, [location.state]);

  // Live listings: when a seller updates an item's location, buyers' distances recalculate
  // automatically. No orderBy in the query, so listings without a createdAt are no longer dropped.
  useEffect(() => {
    setLoading(true);
    // Featured first, then newest
    const order = (a, b) =>
      Number(isFeatured(b)) - Number(isFeatured(a)) ||
      (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
    const apply = (snap) => {
      setListings(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          // only approved furniture / appliances / electronics reach buyers
          .filter(isPublicListing)
          .map((l) => ({ ...l, category: normalizeCategory(l.category) }))
          .sort(order),
      );
      setLoading(false);
    };
    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, "listings"), apply, (err) => {
        console.error("listings listener failed, loading once instead:", err);
        getDocs(collection(db, "listings"))
          .then(apply)
          .catch((e) => {
            console.error(e);
            setLoading(false);
          });
      });
    } catch {
      getDocs(collection(db, "listings")).then(apply).catch(console.error);
    }
    return () => unsub();
  }, []);

  const categories = CATEGORIES;

  const filtered = listings.filter((l) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        [l.name, l.description, l.category, l.sellerName].some((f) =>
          f?.toLowerCase().includes(q),
        )) &&
      (!selectedCategory || l.category === selectedCategory)
    );
  });

  const hasF = !!(search || selectedCategory);
  const clear = () => {
    setSearch("");
    setSelectedCategory("");
  };

  // After the user searches / picks a category, bring the results into view
  // (instead of leaving them at the search bar above the hero + collections).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (!hasF) return;
    const t = setTimeout(() => {
      const el = resultsRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top > 170 || top < 0)
        window.scrollTo({
          top: window.scrollY + top - 150,
          behavior: "smooth",
        });
    }, 400);
    return () => clearTimeout(t);
  }, [search, selectedCategory]);

  const handleSelect = (listing) => {
    try {
      sessionStorage.setItem("listings_scroll", String(window.scrollY || 0));
      sessionStorage.setItem("listings_scroll_id", String(listing.id));
    } catch { /* ignore */ }
    navigate(`/product/${listing.id}`);
  };

  // Restore scroll position if available (after listings load)
  useEffect(() => {
    try {
      const id = sessionStorage.getItem("listings_scroll_id");
      const v = sessionStorage.getItem("listings_scroll");
      if (id) {
        const el = document.querySelector(`[data-listing-id="${id}"]`);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ block: "center", behavior: "auto" });
            sessionStorage.removeItem("listings_scroll_id");
            sessionStorage.removeItem("listings_scroll");
          }, 120);
          return;
        }
      }
      if (!v) return;
      const pos = Number(v);
      if (Number.isFinite(pos)) {
        setTimeout(() => {
          window.scrollTo({ top: pos, behavior: "auto" });
          sessionStorage.removeItem("listings_scroll");
        }, 120);
      }
    } catch { /* ignore */ }
  }, [loading]);

  return (
    <div className="min-h-screen bg-background ">
      {/* STICKY SEARCH + CHIPS - outside <main> so sticky works full-width */}
      <div
        className="sticky top-14 sm:top-16 z-40 w-full border-b border-border/40"
        style={{
          background: "hsl(var(--background) / 1)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-3">
          <TopSearchBar
            search={search}
            setSearch={setSearch}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            hasFilters={hasF}
            clearFilters={clear}
            categories={categories}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pb-10">
        <div className="space-y-5 pt-5">
          <HeroSection />

          {!loading && listings.length > 0 && (
            <PopularCollections listings={listings} />
          )}

          <div
            ref={resultsRef}
            id="all-listings"
            className="flex items-center gap-3 pt-1 scroll-mt-24"
          >
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/35 font-bold">
              All Listings
            </span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Location permission / accuracy notice (only when relevant) */}
          <LocationBanner loc={loc} />

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
                  : "Try adjusting your search or category"}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-10">
              {filtered.map((l, i) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  loc={loc}
                  uid={uid}
                  onSelect={handleSelect}
                  onAddToCart={() => showToast("Added to cart!")}
                  animDelay={Math.min(i * 60, 600)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
};

export default Listings;
