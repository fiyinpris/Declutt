import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  doc,
  writeBatch,
  updateDoc,
  arrayUnion,
  deleteField,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { usePublicProfile } from "../utils/publicProfile";

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
 *  read      ✓✓ brand     the other person opened the chat and saw it (site's light brown)
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
      className={status === "read" ? "text-primary" : "text-foreground/40"}
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

/* ───────────── reply / delete ─────────────
 *  replyTo              snapshot of the quoted message, stored on the reply
 *  deletedFor: [uid]    "delete for me" — hidden only for those users
 *  deletedForEveryone   "delete for everyone" — text wiped, shown as "This message was deleted"
 */
export const replySnapshot = (m) =>
  m ? { id: m.id, text: (m.text || "").slice(0, 200), from: m.from } : null;

export const hiddenFor = (m, uid) => !!uid && !!m.deletedFor?.includes(uid);

const deleteForMe = (m, uid) =>
  updateDoc(doc(db, "messages", m.id), { deletedFor: arrayUnion(uid) });

const deleteForEveryone = (m) =>
  updateDoc(doc(db, "messages", m.id), {
    deletedForEveryone: true,
    text: "",
    replyTo: deleteField(),
  });

/* ───────────── edit / react / typing ─────────────
 *  editedAt                 set when the sender edits the text ("edited" label)
 *  reactions: { uid: "👍" } one reaction per person; tap the same emoji again to remove it
 *  forwarded: true          message was forwarded from another chat
 *  typing/{buyer_seller}    { buyer, seller } last-keystroke times → "typing…"
 */
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const toggleReaction = (m, uid, emoji) =>
  updateDoc(doc(db, "messages", m.id), {
    [`reactions.${uid}`]: m.reactions?.[uid] === emoji ? deleteField() : emoji,
  });

export const editMessage = (m, text) =>
  updateDoc(doc(db, "messages", m.id), { text, editedAt: serverTimestamp() });

/** Live "the other person is typing" flag + a throttled ping() to call while typing. */
export const useTyping = (convKey, role) => {
  const [peerTyping, setPeerTyping] = useState(false);
  const lastPing = useRef(0);
  useEffect(() => {
    if (!convKey || !role) return;
    const peer = role === "buyer" ? "seller" : "buyer";
    let prev = null;
    let first = true;
    let timer;
    const unsub = onSnapshot(
      doc(db, "typing", convKey),
      (s) => {
        const v = s.exists() ? tsMs(s.data()[peer]) : null;
        // only a NEW keystroke time counts (no clock comparison, so device clocks don't matter)
        if (!first && v && v !== prev) {
          setPeerTyping(true);
          clearTimeout(timer);
          timer = setTimeout(() => setPeerTyping(false), 4000);
        }
        first = false;
        prev = v;
      },
      () => {},
    );
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [convKey, role]);
  const ping = useCallback(() => {
    if (!convKey || !role) return;
    const now = Date.now();
    if (now - lastPing.current < 2500) return;
    lastPing.current = now;
    setDoc(doc(db, "typing", convKey), { [role]: serverTimestamp() }, { merge: true }).catch(
      () => {},
    );
  }, [convKey, role]);
  return { peerTyping, ping };
};

const MenuChip = ({ danger = false, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-bold border bg-card shadow-sm transition-colors ${danger ? "text-red-500 border-red-500/30 hover:bg-red-500/10" : "text-foreground/70 border-border hover:text-primary hover:border-primary/40"}`}
  >
    {children}
  </button>
);

/* ───────────── small pieces ───────────── */
/** Profile photo when there is one (and it loads), otherwise the initial-letter avatar. */
export const Avatar = ({ name, size = 44, src = null }) => {
  const [failed, setFailed] = useState(null); // the src that failed to load
  const showPhoto = src && failed !== src;
  return (
    <div
      className="rounded-full overflow-hidden bg-primary/15 text-primary border-2 border-primary/20 font-black flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={name ? `${name}'s photo` : ""}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(src)}
          className="w-full h-full object-cover"
        />
      ) : (
        (name?.[0] || "?").toUpperCase()
      )}
    </div>
  );
};

/** Avatar for another user, using their public profile photo (same photo in every chat). */
export const PeerAvatar = ({ uid, name, size }) => {
  const pub = usePublicProfile(uid);
  return <Avatar name={name} size={size} src={pub?.photoURL} />;
};

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
  messages: allMessages,
  role,
  uid,
  peerName,
  resetKey,
  emptyNode,
  pendingListing,
  onReply,
  onEdit,
  onForward,
}) => {
  const ref = useRef(null);
  const near = useRef(true);
  const lastKey = useRef(null);
  const lastLen = useRef(0);
  const [showJump, setShowJump] = useState(false);
  const [menu, setMenu] = useState(null); // { id, step: "actions" | "delete" }
  const [flash, setFlash] = useState(null);

  // Memoised so the auto-scroll effect below only re-runs when messages actually change
  const messages = useMemo(
    () => allMessages.filter((m) => !hiddenFor(m, uid)),
    [allMessages, uid],
  );
  const byId = useMemo(
    () => Object.fromEntries(allMessages.map((m) => [m.id, m])),
    [allMessages],
  );
  const peerFirst = (peerName || (role === "buyer" ? "Seller" : "Buyer")).split(
    " ",
  )[0];

  const runDelete = async (fn) => {
    setMenu(null);
    try {
      await fn();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Couldn't delete that message. Please try again.");
    }
  };

  const react = (m, emoji) => {
    setMenu(null);
    toggleReaction(m, uid, emoji).catch((e) => console.error("Reaction failed:", e));
  };

  // Tapping a quote jumps to the original message and briefly highlights it
  const jumpTo = (id) => {
    const el = ref.current?.querySelector(`#msg-${CSS.escape(id)}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1400);
  };

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
        onClick={(e) => {
          if (!e.target.closest("[data-bubble]")) setMenu(null);
        }}
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
            const deleted = !!m.deletedForEveryone;
            const original = m.replyTo && (byId[m.replyTo.id] || m.replyTo);
            const open = menu?.id === m.id;
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
                  id={`msg-${m.id}`}
                  data-bubble
                  className={`flex flex-col ${mine ? "items-end" : "items-start"} ${groupStart ? "mt-3" : "mt-1"}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Message options"
                    onClick={() => {
                      // only messages already saved on the server can be replied to / deleted
                      if (m.createdAt)
                        setMenu(open ? null : { id: m.id, step: "actions" });
                    }}
                    className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 text-sm leading-relaxed rounded-2xl whitespace-pre-wrap break-words cursor-pointer transition-shadow ${flash === m.id || open ? "ring-2 ring-primary/50" : ""} ${
                      deleted
                        ? "italic bg-transparent text-foreground/45 border border-dashed border-border"
                        : mine
                          ? `bg-primary text-primary-foreground ${end ? "rounded-br-md" : ""}`
                          : `bg-card text-foreground border border-border ${end ? "rounded-bl-md" : ""}`
                    }`}
                  >
                    {m.forwarded && !deleted && (
                      <span className="block text-[10px] italic opacity-70 mb-0.5">
                        ↪ Forwarded
                      </span>
                    )}
                    {original && !deleted && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          jumpTo(m.replyTo.id);
                        }}
                        className={`block mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] text-xs whitespace-normal ${mine ? "bg-black/15 border-primary-foreground/70" : "bg-primary/8 border-primary"}`}
                      >
                        <span
                          className={`block font-bold ${mine ? "text-primary-foreground" : "text-primary"}`}
                        >
                          {original.from === role ? "You" : peerFirst}
                        </span>
                        <span className="block truncate opacity-80">
                          {original.deletedForEveryone
                            ? "This message was deleted"
                            : original.text}
                        </span>
                      </span>
                    )}
                    {deleted
                      ? mine
                        ? "You deleted this message"
                        : "This message was deleted"
                      : m.text}
                  </div>
                  {!deleted && m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 -mt-1.5 ${mine ? "justify-end pr-2" : "pl-2"}`}>
                      {Object.entries(
                        Object.values(m.reactions).reduce(
                          (acc, e) => ({ ...acc, [e]: (acc[e] || 0) + 1 }),
                          {},
                        ),
                      ).map(([emoji, n]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => uid && react(m, emoji)}
                          className={`px-1.5 h-6 rounded-full text-xs flex items-center gap-0.5 border shadow-sm ${m.reactions[uid] === emoji ? "bg-primary/15 border-primary/40" : "bg-card border-border"}`}
                          aria-label={`${emoji} ${n}`}
                        >
                          <span>{emoji}</span>
                          {n > 1 && <span className="text-[10px] font-bold text-foreground/60">{n}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {open && (
                    <div className={`flex flex-col gap-1.5 mt-1.5 ${mine ? "items-end" : "items-start"}`}>
                      {menu.step === "actions" && uid && !deleted && (
                        <div className="flex gap-1 px-1.5 py-1 rounded-full bg-card border border-border shadow-sm">
                          {REACTIONS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => react(m, e)}
                              aria-label={`React ${e}`}
                              className={`w-8 h-8 rounded-full text-lg leading-none hover:scale-125 transition-transform ${m.reactions?.[uid] === e ? "bg-primary/15" : ""}`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    <div className="flex flex-wrap gap-1.5">
                      {menu.step === "actions" ? (
                        <>
                          {!deleted && onReply && (
                            <MenuChip
                              onClick={() => {
                                onReply(m);
                                setMenu(null);
                              }}
                            >
                              Reply
                            </MenuChip>
                          )}
                          {mine && !deleted && onEdit && (
                            <MenuChip
                              onClick={() => {
                                onEdit(m);
                                setMenu(null);
                              }}
                            >
                              Edit
                            </MenuChip>
                          )}
                          {!deleted && onForward && (
                            <MenuChip
                              onClick={() => {
                                onForward(m);
                                setMenu(null);
                              }}
                            >
                              Forward
                            </MenuChip>
                          )}
                          {!deleted && (
                            <MenuChip
                              onClick={() => {
                                navigator.clipboard?.writeText(m.text || "");
                                setMenu(null);
                              }}
                            >
                              Copy
                            </MenuChip>
                          )}
                          <MenuChip
                            danger
                            onClick={() => setMenu({ id: m.id, step: "delete" })}
                          >
                            Delete
                          </MenuChip>
                        </>
                      ) : (
                        <>
                          {uid && (
                            <MenuChip
                              danger
                              onClick={() => runDelete(() => deleteForMe(m, uid))}
                            >
                              Delete for me
                            </MenuChip>
                          )}
                          {mine && !deleted && (
                            <MenuChip
                              danger
                              onClick={() => runDelete(() => deleteForEveryone(m))}
                            >
                              Delete for everyone
                            </MenuChip>
                          )}
                          <MenuChip onClick={() => setMenu(null)}>Cancel</MenuChip>
                        </>
                      )}
                    </div>
                    </div>
                  )}
                  {end && (
                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-foreground/40">
                      <span>{fmtTime(ms) || "sending…"}</span>
                      {m.editedAt && !deleted && <span className="italic">edited</span>}
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
  replyTo = null,
  replyLabel = "",
  onCancelReply,
  editing = null,
  onCancelEdit,
  onTyping,
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

  useEffect(() => {
    if (replyTo || editing) ta.current?.focus();
  }, [replyTo, editing]);

  const canSend = value.trim() && !sending;
  return (
    <div className="shrink-0 bg-card border-t border-border text-left">
      <div className="mx-auto w-full max-w-3xl">
        {(editing || replyTo) && (
          <div className="flex items-center gap-2 mx-3 mt-3 pl-3 pr-1.5 py-2 rounded-xl bg-background border-l-[3px] border-primary">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary">
                {editing ? "Editing message" : `Replying to ${replyLabel}`}
              </p>
              <p className="text-xs text-foreground/55 truncate">
                {(editing || replyTo).text}
              </p>
            </div>
            <button
              type="button"
              onClick={editing ? onCancelEdit : onCancelReply}
              aria-label={editing ? "Cancel edit" : "Cancel reply"}
              className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/45 hover:text-foreground hover:bg-border/40 shrink-0"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {quick.length > 0 && !value && !replyTo && !editing && (
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
            onChange={(e) => {
              onChange(e.target.value);
              onTyping?.();
            }}
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
