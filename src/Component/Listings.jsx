import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import image6 from "../images/image3.avif";
import step3 from "../images/image1.avif";
import step4 from "../images/image4.avif";

const CATEGORIES = [
  { id: "All", label: "All Items", emoji: "🏠" },
  { id: "Sofas & Couches", label: "Sofas & Couches", emoji: "🛋️" },
  { id: "Beds & Mattresses", label: "Beds & Mattresses", emoji: "🛏️" },
  { id: "Tables & Desks", label: "Tables & Desks", emoji: "🪑" },
  { id: "Chairs & Seating", label: "Chairs & Seating", emoji: "💺" },
  { id: "Wardrobes & Storage", label: "Wardrobes & Storage", emoji: "🗄️" },
  { id: "Shelves & Cabinets", label: "Shelves & Cabinets", emoji: "📦" },
  { id: "Outdoor Furniture", label: "Outdoor Furniture", emoji: "⛱️" },
  { id: "Office Furniture", label: "Office Furniture", emoji: "🖥️" },
  { id: "Lighting & Decor", label: "Lighting & Decor", emoji: "💡" },
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

// ── Messaging Panel (drawer-style) ────────────────────────────────────────────
const MessagingPanel = ({ listing, onClose, currentUser }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "seller",
      text: `Hi! I'm ${listing.sellerName || "the seller"}. Feel free to ask anything about the ${listing.name}.`,
      time: "just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const txt = input.trim();
    setInput("");
    setSending(true);
    setMessages((m) => [
      ...m,
      { id: Date.now(), from: "buyer", text: txt, time: "just now" },
    ]);
    try {
      await addDoc(collection(db, "messages"), {
        listingId: listing.id,
        sellerUid: listing.sellerUid,
        buyerUid: currentUser?.uid || null,
        buyerName: currentUser?.displayName || "Buyer",
        sellerName: listing.sellerName,
        listingName: listing.name,
        text: txt,
        from: "buyer",
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Message send error:", e);
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-auto"
        onClick={onClose}
      />

      {/* Chat panel — slides in from bottom-right */}
      <div
        className="relative pointer-events-auto flex flex-col overflow-hidden"
        style={{
          width: "min(420px, 100vw)",
          height: "min(600px, 90dvh)",
          background: "hsl(var(--card))",
          border: "1.5px solid hsl(var(--border))",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          margin: "0 16px",
          marginBottom: 0,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid hsl(var(--border))" }}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/15 text-primary flex items-center justify-center text-sm font-black border-2 border-primary/20 shrink-0">
            {listing.sellerPhotoURL ? (
              <img
                src={listing.sellerPhotoURL}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              (listing.sellerName?.[0] || "?").toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {listing.sellerName || "Seller"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              <p className="text-[10px] text-foreground/45 truncate">
                Active · {listing.name}
              </p>
            </div>
          </div>

          {/* Product thumbnail */}
          {listing.imageUrl && (
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-border shrink-0">
              <img
                src={listing.imageUrl}
                alt={listing.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-border/50 transition-colors shrink-0"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Item price strip */}
        <div
          className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{
            background: "hsl(var(--background))",
            borderBottom: "1px solid hsl(var(--border)/0.5)",
          }}
        >
          <div>
            <p className="text-xs text-foreground/50 font-medium truncate max-w-[180px]">
              {listing.name}
            </p>
            <p className="text-sm font-black text-primary">
              ₦{Number(listing.price).toLocaleString()}
            </p>
          </div>
          {listing.sellerContact && (
            <a
              href={`https://wa.me/234${listing.sellerContact.replace(/^0/, "")}?text=${encodeURIComponent(`Hi, I'm interested in your ${listing.name} listed on Declutt`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-[11px] font-bold hover:bg-green-700 transition-colors"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              WhatsApp
            </a>
          )}
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ background: "hsl(var(--background))" }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.from === "buyer" ? "justify-end" : "justify-start"}`}
            >
              {m.from === "seller" && (
                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-black border border-primary/20 shrink-0 mr-2 mt-1">
                  {(listing.sellerName?.[0] || "S").toUpperCase()}
                </div>
              )}
              <div
                className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.from === "buyer"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-foreground rounded-bl-sm"
                }`}
                style={{
                  border:
                    m.from === "seller"
                      ? "1.5px solid hsl(var(--border))"
                      : "none",
                }}
              >
                {m.text}
                <p
                  className={`text-[10px] mt-1 ${m.from === "buyer" ? "text-primary-foreground/60 text-right" : "text-foreground/35"}`}
                >
                  {m.time}
                </p>
              </div>
            </div>
          ))}

          {/* Quick reply suggestions */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                "Is this still available?",
                "What's your best price?",
                "Can I see more photos?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full text-primary border border-primary/30 bg-primary/5 hover:bg-primary/12 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="flex items-center gap-2 px-3 py-3 shrink-0"
          style={{
            borderTop: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type a message…"
            autoFocus
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-background border border-border focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all text-foreground placeholder:text-foreground/30"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Product Detail Modal (full) ────────────────────────────────────────────────
const ProductModal = ({ listing, onClose, userCoords, onMessage }) => {
  const dist =
    userCoords && listing.lat && listing.lng
      ? getDistanceKm(userCoords.lat, userCoords.lng, listing.lat, listing.lng)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-card w-full sm:max-w-lg sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          maxHeight: "92dvh",
          border: "1.5px solid hsl(var(--border))",
          boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
        }}
      >
        {/* Hero image */}
        <div
          className="relative w-full bg-border/20"
          style={{ height: "clamp(200px, 40vw, 300px)" }}
        >
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/15">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Status */}
          <span
            className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 backdrop-blur-sm ${listing.available ? "bg-green-500/25 text-green-300 border border-green-400/30" : "bg-red-500/25 text-red-300 border border-red-400/30"}`}
          >
            {listing.available ? "Available" : "Sold"}
          </span>

          {/* Price overlay */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="text-white text-xl font-black leading-tight">
                ₦{Number(listing.price).toLocaleString()}
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                {listing.category}
                {listing.condition ? ` · ${listing.condition}` : ""}
              </p>
            </div>
            {dist !== null && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold">
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
                {formatDist(dist)} away
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <h2 className="text-xl font-black text-foreground leading-tight">
            {listing.name}
          </h2>

          {listing.description && (
            <div className="p-4 rounded-2xl bg-background border border-border/60">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wide mb-2">
                About this item
              </p>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {listing.description}
              </p>
            </div>
          )}

          {/* Seller card */}
          <div className="p-4 rounded-2xl border border-border bg-background">
            <p className="text-xs font-bold text-foreground/40 uppercase tracking-wide mb-3">
              Seller
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-base font-black border-2 border-primary/20 shrink-0 overflow-hidden">
                {listing.sellerPhotoURL ? (
                  <img
                    src={listing.sellerPhotoURL}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (listing.sellerName?.[0] || "?").toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {listing.sellerName || "Seller"}
                </p>
                {listing.sellerContact && (
                  <p className="text-xs text-foreground/40 truncate">
                    {listing.sellerContact}
                  </p>
                )}
                {listing.lat && (
                  <p className="text-[10px] text-blue-500 flex items-center gap-1 mt-0.5">
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
                    Location shared
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-semibold text-green-600">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex gap-3 px-5 py-4 border-t border-border shrink-0"
          style={{ background: "hsl(var(--card))" }}
        >
          <button
            onClick={() => onMessage(listing)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border border-border text-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Message
          </button>
          {listing.sellerContact && listing.available && (
            <a
              href={`https://wa.me/234${listing.sellerContact.replace(/^0/, "")}?text=${encodeURIComponent(`Hi, I'm interested in your ${listing.name} listed on Declutt for ₦${Number(listing.price).toLocaleString()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/// ── AliExpress-Style Listing Card ─────────────────────────────────────────────
const ListingCard = ({ listing, userCoords, onSelect }) => {
  const dist =
    userCoords && listing.lat && listing.lng
      ? getDistanceKm(userCoords.lat, userCoords.lng, listing.lat, listing.lng)
      : null;
  const [saved, setSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect(listing)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-card rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl flex flex-col border border-border hover:border-primary/20"
    >
      {/* Image Container - Square like AliExpress */}
      <div className="relative overflow-hidden bg-border/20 aspect-square">
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

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${
              listing.available
                ? "bg-green-500 text-white"
                : "bg-red-500/80 text-white"
            }`}
          >
            {listing.available ? "Available" : "Sold"}
          </span>
        </div>

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSaved((s) => !s);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/40"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={saved ? "white" : "none"}
            stroke="white"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* HOVER OVERLAY - Shows seller preview */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col justify-end p-3 transition-all duration-300 ${
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 transform transition-transform duration-300"
            style={{
              transform: isHovered ? "translateY(0)" : "translateY(10px)",
            }}
          >
            {/* Seller Info */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                {(listing.sellerName?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate">
                  {listing.sellerName || "Seller"}
                </p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-white/70 text-[10px]">Active now</p>
                </div>
              </div>
            </div>

            {/* Location */}
            {dist !== null && (
              <div className="flex items-center gap-1 text-white/80 text-[10px] mb-2">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {formatDist(dist)} away from you
              </div>
            )}

            {/* Quick Action */}
            <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
              Click to view details
            </button>
          </div>
        </div>

        {/* Static distance badge (hidden on hover) */}
        {!isHovered && dist !== null && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold">
            <svg
              width="8"
              height="8"
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
      </div>

      {/* Card Info - AliExpress Style */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        {/* Product Name */}
        <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
          {listing.name}
        </h3>

        {/* Rating Row (mock) */}
        <div className="flex items-center gap-1">
          <div className="flex text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <span className="text-[10px] text-foreground/40">4.8</span>
          <span className="text-[10px] text-foreground/30">|</span>
          <span className="text-[10px] text-foreground/40">200+ sold</span>
        </div>

        {/* Price Row */}
        <div className="flex items-end gap-2">
          <p className="text-lg font-black text-primary">
            ₦{Number(listing.price).toLocaleString()}
          </p>
          {listing.condition && (
            <span className="text-[9px] font-bold text-foreground/40 line-through mb-1">
              {listing.condition === "Brand new"
                ? "₦" + (listing.price * 1.3).toFixed(0)
                : ""}
            </span>
          )}
        </div>

        {/* Condition Tag */}
        {listing.condition && (
          <span className="inline-flex self-start text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            {listing.condition}
          </span>
        )}

        {/* Location & Seller Row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
          <div className="flex items-center gap-1 text-[10px] text-foreground/50">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate max-w-[80px]">
              {listing.lat ? "Nearby" : "Location N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-border flex items-center justify-center text-[7px] font-bold text-foreground/60">
              {(listing.sellerName?.[0] || "?").toUpperCase()}
            </div>
            <span className="text-[9px] text-foreground/40 truncate max-w-[60px]">
              {listing.sellerName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Fresh from Sellers Widget ─────────────────────────────────────────────────
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
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8 gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center border-2 border-dashed border-primary/20">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary/30"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-foreground/40">
            No new listings yet
          </p>
        </div>
      </div>
    );
  }

  const featured = items[currentIdx];

  return (
    <div className="hidden lg:flex flex-col rounded-xl border border-border bg-card h-full overflow-hidden">
      {/* Header */}
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

      {/* Featured Item - Large Card */}
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
                ₦{Number(featured.price).toLocaleString()}
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

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-white font-bold bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
              View →
            </span>
          </div>
        </div>

        {/* Progress dots */}
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

      {/* List of other items */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${
              i === currentIdx
                ? "bg-primary/5 border border-primary/20"
                : "hover:bg-border/30 border border-transparent"
            }`}
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
              ₦{Number(item.price).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
// ── Hero Section ──────────────────────────────────────────────────────────────
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
      style={{ height: "clamp(300px, 45vw, 400px)" }}
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
            <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-10">
              <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                {s.tag}
              </span>
              <h2 className="text-2xl lg:text-3xl font-black text-white mt-2 leading-tight max-w-sm">
                {s.title}
              </h2>
              <p className="text-white/70 mt-2 text-sm max-w-xs">{s.sub}</p>
              <button className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:opacity-90 transition-opacity">
                Shop Now
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25"
        >
          <svg
            width="18"
            height="18"
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
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
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

// ── Category Bar ──────────────────────────────────────────────────────────────
const CategoryBar = ({ active, onChange }) => {
  const [showAll, setShowAll] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden py-2">
        <div className="absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all duration-200 whitespace-nowrap ${active === cat.id ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25" : "bg-card text-foreground/60 border-border hover:border-primary/40 hover:text-foreground"}`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
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
                className="w-8 h-8 rounded-full hover:bg-border flex items-center justify-center transition-colors"
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

// ── Filter Bar ────────────────────────────────────────────────────────────────
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
    <div className="relative flex-1 min-w-[180px]">
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
        placeholder="Search furniture…"
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
      Available only
    </button>
    <div className="flex items-center gap-1">
      <span className="text-xs font-bold text-foreground/35">₦</span>
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

// ── Main Listings Page ────────────────────────────────────────────────────────
const Listings = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [avail, setAvail] = useState(false);
  const [gps, setGps] = useState(null);
  const [selected, setSelected] = useState(null);
  const [messaging, setMessaging] = useState(null);

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

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10 space-y-5">
        <HeroSection listings={listings} onSelect={setSelected} />

        <section>
          <div className="flex items-center justify-between mb-2 px-0.5">
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
            <span className="text-sm">Loading furniture…</span>
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
                ? "No furniture listed yet."
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                userCoords={gps}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </main>

      {/* Product detail modal */}
      {selected && (
        <ProductModal
          listing={selected}
          onClose={() => setSelected(null)}
          userCoords={gps}
          onMessage={(l) => {
            setSelected(null);
            setMessaging(l);
          }}
        />
      )}

      {/* Messaging panel */}
      {messaging && (
        <MessagingPanel
          listing={messaging}
          onClose={() => setMessaging(null)}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default Listings;
