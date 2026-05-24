import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { db } from "../firebase";
import {
  query,
  collection,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";

const Messages = ({ sellerUid }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"
  const [viewedAt, setViewedAt] = useState({}); // threadKey → Date
  const bottomRef = useRef();
  const activeKey = active?.key;

  // ── 1. Real-time subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!sellerUid) return;

    const q = query(
      collection(db, "messages"),
      where("sellerUid", "==", sellerUid),
      orderBy("createdAt", "asc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt || { toDate: () => new Date() },
        }));

        const grouped = {};
        msgs.forEach((m) => {
          const key = `${m.listingId}_${m.buyerUid}`;
          if (!grouped[key]) {
            grouped[key] = {
              key,
              listingName: m.listingName,
              listingImage: m.listingImageUrl,
              buyerName: m.buyerName || "Buyer",
              buyerUid: m.buyerUid,
              listingId: m.listingId,
              messages: [],
              unread: 0,
            };
          }
          grouped[key].messages.push(m);
          if (m.from === "buyer" && !m.read) grouped[key].unread++;
        });

        const threadList = Object.values(grouped).sort((a, b) => {
          const aTime =
            a.messages[a.messages.length - 1]?.createdAt?.toDate() || 0;
          const bTime =
            b.messages[b.messages.length - 1]?.createdAt?.toDate() || 0;
          return bTime - aTime;
        });

        setThreads(threadList);
        setLoading(false);

        if (!activeKey && threadList.length > 0) {
          setActive(threadList[0]);
          setMessages(threadList[0].messages);
          return;
        }
        if (activeKey) {
          const curr = threadList.find((t) => t.key === activeKey);
          if (curr) setMessages(curr.messages);
        }
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [sellerUid, activeKey]);

  // ── 2. Sync active thread messages ────────────────────────────────────────
  useLayoutEffect(() => {
    if (!active) return;
    const found = threads.find((t) => t.key === active.key);
    if (found) setMessages(found.messages);
  }, [active, threads]);

  // ── 3. Mark messages as read (Firestore + local timestamp) ────────────────
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const markRead = async () => {
      try {
        const q = query(
          collection(db, "messages"),
          where("listingId", "==", active.listingId),
          where("buyerUid", "==", active.buyerUid),
          where("from", "==", "buyer"),
          where("read", "==", false),
        );
        const snap = await getDocs(q);
        if (cancelled || snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
        await batch.commit();
      } catch (e) {
        console.error("Error marking messages read:", e);
      }
    };

    markRead();
    return () => {
      cancelled = true;
    };
  }, [active]);

  // ── 4. Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 5. Open a thread ──────────────────────────────────────────────────────
  const openThread = (thread) => {
    setActive(thread);
    setMessages(thread.messages);
    setMobileView("chat");
    // Record when this thread was last viewed so we can accurately
    // show unread badges only for messages that arrive *after* this moment
    setViewedAt((prev) => ({ ...prev, [thread.key]: new Date() }));
  };

  // ── 6. Unread badge count (instant, no Firestore round-trip needed) ───────
  const getUnread = (thread) => {
    // If this thread is currently open → no badge
    if (active?.key === thread.key) return 0;

    const lastViewed = viewedAt[thread.key];
    // Never opened before → use Firestore unread count
    if (!lastViewed) return thread.unread;

    // Only count messages that arrived AFTER the user last viewed this thread
    return thread.messages.filter(
      (m) =>
        m.from === "buyer" && !m.read && m.createdAt?.toDate() > lastViewed,
    ).length;
  };

  // ── 7. Send reply ─────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !active || sending) return;
    setSending(true);
    const txt = reply.trim();
    setReply("");
    try {
      await addDoc(collection(db, "messages"), {
        listingId: active.listingId,
        sellerUid,
        buyerUid: active.buyerUid,
        buyerName: active.buyerName,
        listingName: active.listingName,
        listingImageUrl: active.listingImage || "",
        text: txt,
        from: "seller",
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      console.error("Send Error:", e);
      alert(
        "Failed to send message. Check your internet or Firestore indexes.",
      );
    } finally {
      setSending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex justify-center py-20 text-primary">
        <Spinner />
      </div>
    );

  return (
    // WhatsApp-style: full viewport height, zero horizontal margins on all screens
    <div className="flex flex-col h-dvh -mx-0">
      {/* Page header — hidden on mobile once a chat is open */}
      <header
        className={`
          px-4 sm:px-0 pt-2 pb-3 sm:pb-4 flex-shrink-0
          ${mobileView === "chat" ? "hidden sm:block" : "block"}
        `}
      >
        <h2 className="text-xl font-black">Messages</h2>
        <p className="text-xs text-foreground/40">
          Manage your sales conversations
        </p>
      </header>

      {threads.length === 0 ? (
        <EmptyState />
      ) : (
        // Two-column on desktop; single-panel on mobile — full height, no side margins
        <div
          className="
            flex-1 min-h-0
            grid grid-cols-1 sm:grid-cols-[280px_1fr]
            sm:border sm:border-border sm:rounded-2xl
            overflow-hidden
          "
        >
          {/* ── Thread sidebar ── */}
          <div
            className={`
              overflow-y-auto bg-card/30
              sm:border-r sm:border-border
              ${mobileView === "chat" ? "hidden sm:block" : "block"}
            `}
          >
            {threads.map((t) => (
              <ThreadItem
                key={t.key}
                thread={t}
                isActive={active?.key === t.key}
                unread={getUnread(t)}
                onClick={() => openThread(t)}
              />
            ))}
          </div>

          {/* ── Chat panel ── */}
          <div
            className={`
              flex-col bg-background min-h-0
              ${mobileView === "list" ? "hidden sm:flex" : "flex"}
            `}
          >
            {active ? (
              <>
                <ChatHeader
                  active={active}
                  onBack={() => setMobileView("list")}
                />

                {/* Message list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} m={m} />
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Reply bar */}
                <div className="flex-shrink-0 p-3 border-t border-border bg-card">
                  <div className="flex gap-2">
                    <input
                      className="
                        flex-1 bg-background border border-border
                        rounded-xl px-4 py-2.5 text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/30
                      "
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      placeholder="Type your reply…"
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      className="
                        bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold
                        disabled:opacity-40 transition-opacity
                      "
                    >
                      {sending ? "…" : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-foreground/30 text-sm">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
);

const EmptyState = () => (
  <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl mx-0 sm:mx-0">
    <p className="text-foreground/40 font-bold">No messages yet.</p>
  </div>
);

const ThreadItem = ({ thread, isActive, unread, onClick }) => {
  const last = thread.messages[thread.messages.length - 1];
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 text-left border-b border-border transition-colors
        ${isActive ? "bg-primary/10" : "hover:bg-primary/5"}
      `}
    >
      <div className="flex justify-between items-start gap-1">
        <p className="font-bold text-sm truncate">{thread.buyerName}</p>
        {unread > 0 && (
          <span className="flex-shrink-0 bg-primary text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1.5 rounded-full">
            {unread}
          </span>
        )}
      </div>
      <p className="text-[10px] text-primary font-medium truncate">
        {thread.listingName}
      </p>
      <p className="text-xs text-foreground/50 truncate mt-0.5">{last?.text}</p>
    </button>
  );
};

// Back button: underline link style, no border, mobile-only
const ChatHeader = ({ active, onBack }) => (
  <div className="flex-shrink-0 p-3 sm:p-4 border-b border-border flex items-center gap-3 bg-card">
    <button
      onClick={onBack}
      className="sm:hidden text-sm text-primary underline underline-offset-2 decoration-primary/60 mr-1 flex-shrink-0"
    >
      ← Back
    </button>
    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
      {active.buyerName[0].toUpperCase()}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-bold truncate">{active.buyerName}</p>
      <p className="text-[10px] opacity-50 truncate">
        Buying: {active.listingName}
      </p>
    </div>
  </div>
);

const MessageBubble = ({ m }) => (
  <div
    className={`flex ${m.from === "seller" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`
        max-w-[78%] px-3.5 py-2.5 text-sm leading-snug
        ${
          m.from === "seller"
            ? "bg-primary text-white rounded-2xl rounded-tr-sm"
            : "bg-secondary border border-border rounded-2xl rounded-tl-sm"
        }
      `}
    >
      {m.text}
    </div>
  </div>
);

export default Messages;
