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
} from "firebase/firestore";

const Messages = ({ sellerUid }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  // ── 1. Real-time Subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!sellerUid) return;

    // IMPORTANT: You MUST create a Composite Index in Firebase Console for this!
    // Collection: messages | Fields: sellerUid (Asc), createdAt (Asc)
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
          // Fallback for local/pending timestamps so they don't break sorting
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
          return bTime - aTime; // Newest threads on top
        });

        setThreads(threadList);
        setLoading(false);

        if (active) {
          const currentThread = threadList.find((t) => t.key === active.key);
          if (currentThread) setMessages(currentThread.messages);
        }
      },
      (error) => {
        console.error("Firestore Error:", error);
        // If you see an "Index required" error in console, click the link provided there.
        setLoading(false);
      },
    );

    return () => unsub();
  }, [sellerUid, active?.key]);

  // ── 2. Sync Active Thread ──────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!active) return;
    const found = threads.find((t) => t.key === active.key);
    if (found) setMessages(found.messages);
  }, [active, threads]);

  // ── 3. Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 4. Send Message ────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !active || sending) return;

    setSending(true);
    const txt = reply.trim();
    setReply("");

    try {
      await addDoc(collection(db, "messages"), {
        listingId: active.listingId,
        sellerUid: sellerUid,
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

  // ── Render Logic (Unchanged but improved for empty states) ────────────────
  if (loading)
    return (
      <div className="flex justify-center py-20 text-primary">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-black">Messages</h2>
        <p className="text-xs text-foreground/40">
          Manage your sales conversations
        </p>
      </header>

      {threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-4 h-[600px] border border-border rounded-2xl overflow-hidden">
          {/* Sidebar */}
          <div className="border-r border-border overflow-y-auto bg-card/30">
            {threads.map((t) => (
              <ThreadItem
                key={t.key}
                thread={t}
                isActive={active?.key === t.key}
                onClick={() => setActive(t)}
              />
            ))}
          </div>

          {/* Chat Area */}
          <div className="flex flex-col bg-background">
            {active ? (
              <>
                <ChatHeader active={active} />
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      m={m}
                      buyerName={active.buyerName}
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-4 border-t border-border bg-card">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-primary"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      placeholder="Type your reply..."
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      className="bg-primary text-white p-2 rounded-xl disabled:opacity-50"
                    >
                      {sending ? "..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-foreground/30">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components for cleaner code
const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
);

const EmptyState = () => (
  <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
    <p className="text-foreground/40 font-bold">No messages yet.</p>
  </div>
);

const ThreadItem = ({ thread, isActive, onClick }) => {
  const last = thread.messages[thread.messages.length - 1];
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left border-b border-border transition-colors ${isActive ? "bg-primary/10" : "hover:bg-primary/5"}`}
    >
      <div className="flex justify-between items-start">
        <p className="font-bold text-sm truncate">{thread.buyerName}</p>
        {thread.unread > 0 && (
          <span className="bg-primary text-white text-[10px] px-1.5 rounded-full">
            {thread.unread}
          </span>
        )}
      </div>
      <p className="text-[10px] text-primary font-medium truncate">
        {thread.listingName}
      </p>
      <p className="text-xs text-foreground/50 truncate mt-1">{last?.text}</p>
    </button>
  );
};

const ChatHeader = ({ active }) => (
  <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
      {active.buyerName[0].toUpperCase()}
    </div>
    <div>
      <p className="text-sm font-bold">{active.buyerName}</p>
      <p className="text-[10px] opacity-50">Buying: {active.listingName}</p>
    </div>
  </div>
);

const MessageBubble = ({ m, buyerName }) => (
  <div
    className={`flex ${m.from === "seller" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.from === "seller" ? "bg-primary text-white rounded-tr-none" : "bg-secondary border border-border rounded-tl-none"}`}
    >
      <p>{m.text}</p>
    </div>
  </div>
);

export default Messages;
