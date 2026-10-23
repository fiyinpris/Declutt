import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Ico, Spin } from "./Ico";
import {
  tsMs,
  listTime,
  Ticks,
  messageStatus,
  markDelivered,
  PeerAvatar,
  ProductThumb,
  MessageList,
  Composer,
  replySnapshot,
  hiddenFor,
} from "./Chatui";

export { tsMs }; // other files import tsMs from here

/*
 * ONE conversation per buyer + seller pair (key = buyerUid_sellerUid).
 * Every message still carries the product it is about; when the topic changes, the product
 * appears as a card inside the same conversation. Items are never split into separate chats.
 *
 * Queries use a single equality filter + client-side sorting (no composite index needed),
 * with a polling fallback if the realtime listener fails.
 */
const QUICK = {
  buyer: [
    "Is this still available?",
    "What's your best price?",
    "Can we meet up?",
  ],
  seller: [
    "Yes, it's still available",
    "When can you pick it up?",
    "Let's meet in a public place",
  ],
};

const useMessages = (role, uid) => {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "messages"),
      where(role === "seller" ? "sellerUid" : "buyerUid", "==", uid),
    );
    let dead = false;
    let poll = null;
    let unsub = null;
    const apply = (snap) => {
      if (dead) return;
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMsgs(list);
      setLoading(false);
      setError("");
      markDelivered(list, role);
    };
    const fail = (e) => {
      if (dead) return;
      console.error("Messages error:", e);
      setError(
        e?.code === "permission-denied"
          ? "Permission denied. Check your Firestore rules for the messages collection."
          : "Could not load messages. Retrying…",
      );
      setLoading(false);
    };
    const startPoll = () => {
      if (poll) return;
      const run = () => getDocs(q).then(apply).catch(fail);
      run();
      poll = setInterval(run, 3000);
    };
    try {
      unsub = onSnapshot(q, apply, (e) => {
        console.error("Messages listener failed, falling back to polling:", e);
        startPoll();
      });
    } catch {
      startPoll();
    }
    return () => {
      dead = true;
      if (unsub) unsub();
      if (poll) clearInterval(poll);
    };
  }, [role, uid]);

  return { msgs, loading, error };
};

const ChatCenter = ({
  role,
  uid,
  selfName,
  initialTarget = null,
  offset = 200,
}) => {
  const { msgs, loading, error } = useMessages(role, uid);
  const [activeKey, setActiveKey] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [replyTo, setReplyTo] = useState(null);

  const otherName = (t) =>
    role === "seller" ? t.buyerName || "Buyer" : t.sellerName || "Seller";
  const otherUid = (t) => (role === "seller" ? t.buyerUid : t.sellerUid);

  const threads = useMemo(() => {
    const g = {};
    [...msgs]
      .sort((a, b) => tsMs(a.createdAt) - tsMs(b.createdAt))
      .forEach((m) => {
        if (!m.buyerUid || !m.sellerUid) return;
        const key = `${m.buyerUid}_${m.sellerUid}`;
        if (!g[key])
          g[key] = {
            key,
            buyerUid: m.buyerUid,
            sellerUid: m.sellerUid,
            buyerName: "",
            sellerName: "",
            listing: null,
            topics: [],
            messages: [],
            unread: 0,
          };
        const t = g[key];
        t.messages.push(m);
        if (m.buyerName) t.buyerName = m.buyerName;
        if (m.sellerName) t.sellerName = m.sellerName;
        if (m.listingId) {
          t.listing = {
            id: m.listingId,
            name: m.listingName || "",
            imageUrl: m.listingImageUrl || "",
            price: m.listingPrice ?? null,
          };
          if (!t.topics.includes(m.listingId)) t.topics.push(m.listingId);
        }
        if (m.from !== role && !m.read) t.unread++;
      });
    return Object.values(g)
      .map((t) => {
        // Preview skips messages this user deleted for themselves; ordering uses the real latest
        const seen = t.messages.filter((m) => !hiddenFor(m, uid));
        const last = seen[seen.length - 1] || null;
        const newest = t.messages[t.messages.length - 1];
        return { ...t, last, lastMs: tsMs(newest.createdAt) };
      })
      .sort((a, b) => b.lastMs - a.lastMs);
  }, [msgs, role, uid]);

  // Open (or start) a conversation, e.g. from a notification about a saved item
  useEffect(() => {
    if (!initialTarget?.buyerUid && !initialTarget?.sellerUid) return;
    const buyerUid = initialTarget.buyerUid || (role === "buyer" ? uid : "");
    const sellerUid = initialTarget.sellerUid || (role === "seller" ? uid : "");
    const key = `${buyerUid}_${sellerUid}`;
    setActiveKey(key);
    setMobileOpen(true);
    setDraft({
      key,
      buyerUid,
      sellerUid,
      buyerName: initialTarget.buyerName || "Buyer",
      sellerName: initialTarget.sellerName || selfName || "Seller",
      listing: initialTarget.listingId
        ? {
            id: initialTarget.listingId,
            name: initialTarget.listingName || "",
            imageUrl: initialTarget.listingImageUrl || "",
            price: initialTarget.listingPrice ?? null,
          }
        : null,
      topics: [],
      messages: [],
      unread: 0,
    });
  }, [initialTarget]);

  // Desktop: open the latest conversation by default
  useEffect(() => {
    if (activeKey || !threads.length) return;
    if (window.matchMedia("(min-width: 640px)").matches)
      setActiveKey(threads[0].key);
  }, [threads, activeKey]);

  const thread = threads.find((t) => t.key === activeKey);
  const active = thread || (draft && draft.key === activeKey ? draft : null);
  // A product the user wants to talk about that isn't the latest topic yet → shown as a pending card
  const pendingListing =
    draft &&
    active &&
    draft.key === active.key &&
    draft.listing &&
    active.listing?.id !== draft.listing.id
      ? draft.listing
      : null;

  // Opening a conversation = reading it → the other person's ticks turn blue
  useEffect(() => {
    if (!active) return;
    const unread = active.messages.filter((m) => m.from !== role && !m.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread
      .slice(0, 400)
      .forEach((m) =>
        batch.update(doc(db, "messages", m.id), {
          read: true,
          delivered: true,
        }),
      );
    batch.commit().catch((e) => console.error("Mark read failed:", e));
  }, [active, role]);

  // Phones: chat is full-screen; stop the page behind it from scrolling
  useEffect(() => {
    if (!mobileOpen || !window.matchMedia("(max-width: 639px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const openThread = (t) => {
    setActiveKey(t.key);
    setMobileOpen(true);
    setSendError("");
    setText("");
    setReplyTo(null);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !active || sending) return;
    if (!active.sellerUid || !active.buyerUid) {
      setSendError("This conversation is missing a participant.");
      return;
    }
    const about = pendingListing || active.listing; // the item this message is about
    const quoting = replyTo;
    setSending(true);
    setSendError("");
    setText("");
    setReplyTo(null);
    try {
      await addDoc(collection(db, "messages"), {
        sellerUid: active.sellerUid,
        buyerUid: active.buyerUid,
        buyerName:
          role === "buyer"
            ? selfName || active.buyerName || "Buyer"
            : active.buyerName || "Buyer",
        sellerName:
          role === "seller"
            ? selfName || active.sellerName || "Seller"
            : active.sellerName || "Seller",
        listingId: about?.id || null,
        listingName: about?.name || "",
        listingImageUrl: about?.imageUrl || null,
        listingPrice: about?.price ?? null,
        text: body,
        from: role,
        replyTo: replySnapshot(quoting),
        createdAt: serverTimestamp(),
        delivered: false,
        read: false,
      });
    } catch (e) {
      console.error("Send failed:", e);
      setText(body);
      setReplyTo(quoting);
      setSendError("Failed to send. Please try again.");
    }
    setSending(false);
  };

  const shown = threads.filter((t) => {
    if (tab === "unread" && !t.unread) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [otherName(t), t.listing?.name, t.last?.text].some((f) =>
      f?.toLowerCase().includes(q),
    );
  });

  const hasAny = threads.length > 0 || !!active;
  const itemCount = active
    ? new Set([...(active.topics || []), pendingListing?.id].filter(Boolean))
        .size
    : 0;
  const unreadTotal = threads.reduce((n, t) => n + t.unread, 0);

  return (
    <div className="space-y-4 text-left">
      <div className={mobileOpen ? "hidden sm:block" : "block"}>
        <p className="text-2xl font-black text-foreground">Messages</p>
        <p className="text-xs text-foreground/40 mt-0.5">
          {role === "seller"
            ? "Real-time conversations from buyers"
            : "Real-time conversations with sellers"}
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-foreground/40">
          <div className="flex flex-col items-center gap-3">
            <Spin s={24} />
            <span className="text-sm">Loading conversations…</span>
          </div>
        </div>
      ) : !hasAny ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl bg-primary/6 flex items-center justify-center"
            style={{ border: "2px dashed hsl(var(--primary)/0.2)" }}
          >
            <Ico s={26} w={1.5} className="text-primary/30">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </Ico>
          </div>
          <p className="text-sm font-semibold text-foreground/50 max-w-xs">
            {role === "seller"
              ? "No messages yet. When buyers contact you, they'll appear here."
              : "No conversations yet. Open any item and tap “Message Seller” to start one."}
          </p>
          {role === "buyer" && (
            <Link to="/listings" className="main-button text-sm px-5 py-2.5">
              Browse items
            </Link>
          )}
        </div>
      ) : (
        // Phones: the list is only as tall as its conversations (a chat opens full-screen),
        // so there's no empty box. Wider screens: fixed-height two-pane layout.
        <div
          className="grid grid-cols-1 sm:grid-cols-[320px_1fr] overflow-hidden rounded-none sm:rounded-2xl -mx-4 sm:mx-0 bg-card sm:h-[var(--chat-h)] sm:min-h-[460px]"
          style={{
            "--chat-h": `calc(100dvh - ${offset}px - var(--tabbar-h))`,
            border: "1.5px solid hsl(var(--border))",
          }}
        >
          {/* ───────── People ───────── */}
          <div
            className={`${mobileOpen ? "hidden" : "flex"} sm:flex flex-col min-h-0 sm:border-r border-border`}
          >
            <div className="p-3 space-y-2.5 shrink-0 border-b border-border/60">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 transition-colors">
                <Ico s={15} r className="text-foreground/35 shrink-0">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </Ico>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people or items…"
                  className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-foreground/30"
                />
              </div>
              <div className="flex gap-2">
                {[
                  ["all", "All"],
                  ["unread", `Unread${unreadTotal ? ` (${unreadTotal})` : ""}`],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${tab === id ? "bg-primary text-primary-foreground" : "bg-border/40 text-foreground/55 hover:bg-border/70"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {shown.length === 0 && (
                <p className="text-center text-xs text-foreground/40 py-10">
                  No conversations found
                </p>
              )}
              {shown.map((t) => {
                const isActive = active?.key === t.key;
                const mine = t.last?.from === role;
                const lastDeleted = !!t.last?.deletedForEveryone;
                return (
                  <button
                    key={t.key}
                    onClick={() => openThread(t)}
                    className={`w-full flex items-start gap-3 p-3 text-left rounded-xl border transition-all ${isActive ? "bg-primary/10 border-primary/25" : "border-transparent hover:bg-border/30"}`}
                  >
                    <PeerAvatar uid={otherUid(t)} name={otherName(t)} size={46} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground truncate">
                          {otherName(t)}
                        </p>
                        <span
                          className={`text-[11px] shrink-0 ${t.unread ? "text-primary font-bold" : "text-foreground/35"}`}
                        >
                          {listTime(t.lastMs)}
                        </span>
                      </div>
                      {t.listing && (
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          <ProductThumb
                            src={t.listing.imageUrl}
                            size={16}
                            className="rounded"
                          />
                          <p className="text-[11px] font-semibold text-primary truncate">
                            {t.listing.name || "Item"}
                            {t.topics.length > 1 && (
                              <span className="text-foreground/40">
                                {" "}
                                +{t.topics.length - 1} more
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p
                          className={`flex-1 min-w-0 truncate text-xs ${t.unread ? "text-foreground font-semibold" : "text-foreground/50"}`}
                        >
                          {mine && (
                            <span className="text-foreground/35">You: </span>
                          )}
                          {!t.last ? (
                            <span className="italic">No messages</span>
                          ) : lastDeleted ? (
                            <span className="italic">This message was deleted</span>
                          ) : (
                            t.last.text
                          )}
                        </p>
                        {t.unread > 0 ? (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">
                            {t.unread}
                          </span>
                        ) : mine && !lastDeleted ? (
                          <span className="shrink-0 flex items-center">
                            <Ticks status={messageStatus(t.last)} />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ───────── Conversation (full-screen on phones) ───────── */}
          {active ? (
            <div
              className={`${mobileOpen ? "fixed inset-0 z-[100] flex" : "hidden"} sm:static sm:z-auto sm:flex flex-col min-h-0 sm:h-full bg-card`}
            >
              <div className="flex items-center gap-3 pl-1.5 pr-4 sm:px-4 py-3 shrink-0 border-b border-border bg-card">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setActiveKey(null);
                    setReplyTo(null);
                  }}
                  className="sm:hidden w-10 h-10 rounded-full flex items-center justify-center text-foreground/60 hover:bg-border/40 shrink-0"
                  aria-label="Back"
                >
                  <Ico s={22} w={2.4} r>
                    <path d="m15 18-6-6 6-6" />
                  </Ico>
                </button>
                <PeerAvatar uid={otherUid(active)} name={otherName(active)} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-foreground truncate">
                    {otherName(active)}
                  </p>
                  <p className="text-[11px] text-foreground/45">
                    <span className="font-bold text-primary">
                      {role === "seller" ? "Buyer" : "Seller"}
                    </span>
                    {" · "}
                    {itemCount} item{itemCount !== 1 ? "s" : ""} discussed
                  </p>
                </div>
              </div>

              <MessageList
                messages={active.messages}
                role={role}
                uid={uid}
                onReply={setReplyTo}
                peerName={otherName(active)}
                pendingListing={pendingListing}
                resetKey={`${active.key}-${mobileOpen}`}
                emptyNode={
                  !pendingListing && (
                    <p className="text-center text-xs text-foreground/40 py-8">
                      No messages yet — say hello 👋
                    </p>
                  )
                }
              />

              {sendError && (
                <p className="px-4 py-1.5 text-xs text-red-500 bg-red-500/10 shrink-0">
                  {sendError}
                </p>
              )}
              <Composer
                value={text}
                onChange={setText}
                onSend={send}
                sending={sending}
                quick={QUICK[role]}
                replyTo={replyTo}
                replyLabel={
                  replyTo?.from === role ? "yourself" : otherName(active)
                }
                onCancelReply={() => setReplyTo(null)}
              />
            </div>
          ) : (
            <div className="hidden sm:flex flex-col items-center justify-center gap-2 text-foreground/35 text-sm bg-background/60">
              <Ico s={40} w={1.3} className="text-foreground/15">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </Ico>
              <p>Select a conversation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatCenter;
