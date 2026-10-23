import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

/* All colours come from the site's own theme tokens (primary / card / background / border /
 * foreground), so the chat matches the rest of the website in light and dark mode. */

/* ───────────── time helpers ───────────── */
const PENDING = Number.MAX_SAFE_INTEGER;
export const tsMs = (t) =>
  t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : PENDING;
export const fmtTime = (ms) =>
  ms === PENDING
    ? ""
    : new Date(ms).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const dayLabel = (ms) => {
  if (ms === PENDING) return "Today";
  const diff = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(ms))) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(ms).toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
export const listTime = (ms) => {
  if (ms === PENDING) return fmtTime(Date.now());
  const diff = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(ms))) / 86400000,
  );
  if (diff === 0) return fmtTime(ms);
  if (diff === 1) return "Yesterday";
  return new Date(ms).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
};

/* ───────────── delivery status ─────────────
 *  pending   clock        not saved on the server yet
 *  sent      ✓ grey       saved on the server
 *  delivered ✓✓ grey      the other person's app received it
 *  read      ✓✓ BLUE      the other person opened the chat and saw it
 */
export const messageStatus = (m) => {
  if (!m.createdAt) return "pending";
  if (m.read) return "read";
  if (m.delivered) return "delivered";
  return "sent";
};

export const Ticks = ({ status }) => {
  if (status === "pending")
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="text-foreground/40"
        aria-label="Sending"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  return (
    <svg
      width="17"
      height="11"
      viewBox="0 0 18 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={status === "read" ? "text-sky-500" : "text-foreground/40"}
      aria-label={
        status === "read"
          ? "Read"
          : status === "delivered"
            ? "Delivered"
            : "Sent"
      }
    >
      <path d="M1.5 6.5l3.3 3.3 6.4-7.2" />
      {status !== "sent" && <path d="M6.5 6.5l3.3 3.3 6.4-7.2" />}
    </svg>
  );
};

/* Mark the other person's messages as DELIVERED (called wherever the recipient is online). */
const deliveredTried = new Set();
export const markDelivered = (list, role) => {
  const todo = list.filter(
    (m) =>
      m.from !== role && !m.delivered && !m.read && !deliveredTried.has(m.id),
  );
  for (let i = 0; i < todo.length; i += 400) {
    const batch = writeBatch(db);
    todo.slice(i, i + 400).forEach((m) => {
      deliveredTried.add(m.id);
      batch.update(doc(db, "messages", m.id), { delivered: true });
    });
    batch.commit().catch((e) => console.error("mark delivered failed:", e));
  }
};

/* ───────────── small pieces ───────────── */
export const Avatar = ({ name, size = 44 }) => (
  <div
    className="rounded-full bg-primary/15 text-primary border-2 border-primary/20 font-black flex items-center justify-center shrink-0 select-none"
    style={{ width: size, height: size, fontSize: size * 0.38 }}
  >
    {(name?.[0] || "?").toUpperCase()}
  </div>
);

export const ProductThumb = ({ src, size = 44, className = "rounded-xl" }) =>
  src ? (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size }}
      className={`${className} object-cover shrink-0 bg-border/30 border border-border`}
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className={`${className} bg-border/30 shrink-0 flex items-center justify-center text-[9px] text-foreground/30 border border-border`}
    >
      Item
    </div>
  );

/** The product a message is about, shown inside the conversation. */
export const ProductCard = ({ listing, label, pending = false }) => (
  <div className="flex justify-center my-4 text-left">
    <Link
      to={`/product/${listing.id}`}
      className={`w-full max-w-sm flex items-center gap-3 p-2.5 rounded-2xl bg-card text-left hover:border-primary/40 transition-colors ${pending ? "border-2 border-dashed border-primary/30" : "border border-border shadow-sm"}`}
    >
      <ProductThumb src={listing.imageUrl} size={64} className="rounded-xl" />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {label}
        </p>
        <p className="text-sm font-bold text-foreground truncate mt-0.5">
          {listing.name || "Item"}
        </p>
        {listing.price != null && (
          <p className="text-sm font-black text-primary mt-0.5">
            ₦{Number(listing.price).toLocaleString()}
          </p>
        )}
        {pending && (
          <p className="text-[11px] text-foreground/45 mt-0.5">
            Sent with your next message
          </p>
        )}
      </div>
      {!pending && (
        <span className="shrink-0 text-[11px] font-bold text-foreground/45 flex items-center gap-0.5">
          View
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      )}
    </Link>
  </div>
);

/* ───────────── message list ───────────── */
export const MessageList = ({
  messages,
  role,
  peerName,
  resetKey,
  emptyNode,
  pendingListing,
}) => {
  const ref = useRef(null);
  const near = useRef(true);
  const lastKey = useRef(null);
  const lastLen = useRef(0);
  const [showJump, setShowJump] = useState(false);

  const toBottom = (smooth) => {
    const el = ref.current;
    if (el)
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
  };

  const last = messages[messages.length - 1];
  const showPending =
    pendingListing?.id && last?.listingId !== pendingListing.id;

  useEffect(() => {
    if (lastKey.current !== resetKey) toBottom(false);
    else if (
      messages.length > lastLen.current &&
      (near.current || last?.from === role)
    )
      toBottom(true);
    else if (showPending && lastLen.current === messages.length)
      toBottom(false);
    lastKey.current = resetKey;
    lastLen.current = messages.length;
  }, [messages, resetKey, role, showPending]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    near.current = d < 120;
    setShowJump(d > 300);
  };

  const groupEnds = (i) => {
    const m = messages[i];
    const n = messages[i + 1];
    return (
      !n ||
      n.from !== m.from ||
      n.listingId !== m.listingId ||
      dayLabel(tsMs(n.createdAt)) !== dayLabel(tsMs(m.createdAt))
    );
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={ref}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto px-3 sm:px-6 py-3 bg-background/60 text-left"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "hsl(var(--border)) transparent",
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && emptyNode}
          {messages.map((m, i) => {
            const mine = m.from === role;
            const prev = messages[i - 1];
            const ms = tsMs(m.createdAt);
            const newDay =
              !prev || dayLabel(tsMs(prev.createdAt)) !== dayLabel(ms);
            const newTopic =
              !!m.listingId && (!prev || prev.listingId !== m.listingId);
            const groupStart =
              newDay || newTopic || !prev || prev.from !== m.from;
            const end = groupEnds(i);
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-foreground/35">
                      {dayLabel(ms)}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                )}
                {newTopic && (
                  <ProductCard
                    listing={{
                      id: m.listingId,
                      name: m.listingName,
                      imageUrl: m.listingImageUrl,
                      price: m.listingPrice,
                    }}
                    label={
                      m.from === "buyer"
                        ? role === "buyer"
                          ? "You're asking about"
                          : `${(peerName || "Buyer").split(" ")[0]} is asking about`
                        : "About this item"
                    }
                  />
                )}
                <div
                  className={`flex flex-col ${mine ? "items-end" : "items-start"} ${groupStart ? "mt-3" : "mt-1"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 text-sm leading-relaxed rounded-2xl whitespace-pre-wrap break-words ${
                      mine
                        ? `bg-primary text-primary-foreground ${end ? "rounded-br-md" : ""}`
                        : `bg-card text-foreground border border-border ${end ? "rounded-bl-md" : ""}`
                    }`}
                  >
                    {m.text}
                  </div>
                  {end && (
                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-foreground/40">
                      <span>{fmtTime(ms) || "sending…"}</span>
                      {mine && <Ticks status={messageStatus(m)} />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {showPending && (
            <ProductCard
              pending
              listing={pendingListing}
              label={
                role === "buyer" ? "You're asking about" : "Replying about"
              }
            />
          )}
        </div>
      </div>
      {showJump && (
        <button
          onClick={() => toBottom(true)}
          className="absolute bottom-3 right-4 w-9 h-9 rounded-full bg-card border border-border text-foreground/60 hover:text-primary shadow-lg flex items-center justify-center"
          aria-label="Scroll to latest message"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
};

/* ───────────── composer ───────────── */
export const Composer = ({
  value,
  onChange,
  onSend,
  sending,
  quick = [],
  autoFocus,
}) => {
  const ta = useRef(null);
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    const h = el.scrollHeight + 2; // +2 = the textarea's 1px top/bottom border
    el.style.height = Math.min(h, 120) + "px";
    el.style.overflowY = h > 120 ? "auto" : "hidden"; // no stray scrollbar/arrows for short text
  }, [value]);

  const canSend = value.trim() && !sending;
  return (
    <div className="shrink-0 bg-card border-t border-border text-left">
      <div className="mx-auto w-full max-w-3xl">
        {quick.length > 0 && !value && (
          <div
            className="flex items-center gap-2 px-3 pt-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => onChange(q)}
                className="shrink-0 px-3.5 py-1.5 rounded-full border border-border bg-background text-xs font-semibold text-foreground/65 hover:text-primary hover:border-primary/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 p-3">
          <textarea
            ref={ta}
            rows={1}
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // Desktop: Enter sends, Shift+Enter = new line. Phones: Enter = new line, use the send button.
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                window.matchMedia("(pointer: fine)").matches
              ) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Write a message…"
            className="flex-1 min-w-0 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-[16px] sm:text-sm leading-5 text-foreground placeholder:text-foreground/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send"
            className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors shadow-sm"
          >
            {sending ? (
              <svg
                className="animate-spin"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
