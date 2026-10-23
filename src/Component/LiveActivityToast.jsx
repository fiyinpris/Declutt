import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

/*
 * Home page activity pop-up. Shows REAL recent listings from Firestore (newest first, live):
 * who listed what, when, and for how much. Tapping it opens the item. Nothing is made up —
 * with no listings it simply never appears.
 */
const SHOW_MS = 6000;
const EVERY_MS = 25000;
const FIRST_MS = 3000;

const shortName = (full) => {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A seller";
  return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
};
const initials = (full) =>
  (full || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
const tsMs = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : null);
const ago = (ms, now) => {
  if (!ms) return "";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ms).toLocaleDateString([], { day: "numeric", month: "short" });
};

const LiveActivityToast = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [now, setNow] = useState(0);
  const [imgFailed, setImgFailed] = useState(null);

  // Newest listings, live (a new listing shows up in the rotation straight away)
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "listings"), orderBy("createdAt", "desc"), limit(12)),
        (snap) =>
          setItems(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((l) => l.available !== false && l.name && tsMs(l.createdAt)),
          ),
        (e) => console.error("Activity pop-up:", e),
      ),
    [],
  );

  const count = items.length;
  useEffect(() => {
    if (!count) return;
    const timers = [];
    const show = () => {
      setNow(Date.now());
      setMounted(true);
      timers.push(setTimeout(() => setShown(true), 20));
      timers.push(
        setTimeout(() => {
          setShown(false);
          timers.push(
            setTimeout(() => {
              setMounted(false);
              setIdx((i) => i + 1);
            }, 400),
          );
        }, SHOW_MS),
      );
    };
    timers.push(setTimeout(show, FIRST_MS));
    const every = setInterval(show, EVERY_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(every);
    };
  }, [count]);

  if (!mounted || !count) return null;
  const l = items[idx % count];
  const when = tsMs(l.createdAt);
  const fresh = now - when < 24 * 3600 * 1000;
  const showImg = l.imageUrl && imgFailed !== l.imageUrl;

  const dismiss = (e) => {
    e.stopPropagation();
    setShown(false);
    setTimeout(() => {
      setMounted(false);
      setIdx((i) => i + 1);
    }, 400);
  };

  return createPortal(
    <div
      role="status"
      onClick={() => navigate(`/product/${l.id}`)}
      className="fixed left-3 sm:left-4 lg:left-6 flex items-center gap-2 sm:gap-3 bg-card border border-border/50 rounded-xl sm:rounded-2xl shadow-xl px-3 sm:px-4 py-2 sm:py-3 w-62 sm:w-72 cursor-pointer text-left"
      style={{
        bottom: "calc(var(--tabbar-h) + 1rem)",
        zIndex: 45, // above page content and the tab bar, below open menus/drawers (z-60+)
        transform: shown ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
        opacity: shown ? 0.97 : 0,
        transition:
          "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
      }}
    >
      <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-[10px] sm:text-xs font-bold">
        {showImg ? (
          <img
            src={l.imageUrl}
            alt=""
            onError={() => setImgFailed(l.imageUrl)}
            className="w-full h-full object-cover"
          />
        ) : (
          initials(l.sellerName)
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] text-foreground/45 leading-none mb-0.5">
          {ago(when, now)}
        </p>
        <p className="text-[10px] sm:text-xs font-semibold text-foreground leading-snug truncate">
          {shortName(l.sellerName)} {fresh ? "just listed" : "listed"}
        </p>
        <p className="text-[9px] sm:text-xs text-primary font-medium truncate">
          {l.name}
          {Number(l.price) > 0 && (
            <span className="text-foreground/45">
              {" "}
              · ₦{Number(l.price).toLocaleString()}
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-4 h-4 flex items-center justify-center rounded-full text-foreground/30 hover:text-foreground/70 hover:bg-border transition-colors duration-150"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default LiveActivityToast;
