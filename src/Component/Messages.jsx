import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// ── Message Bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isMe }) => (
  <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}>
    {!isMe && (
      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold mr-2 shrink-0 border border-primary/20">
        {message.senderName?.[0]?.toUpperCase() || "?"}
      </div>
    )}
    <div
      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isMe
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-card border border-border text-foreground rounded-bl-md"
      }`}
    >
      <p>{message.text}</p>
      <p
        className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60 text-right" : "text-foreground/40"}`}
      >
        {message.timestamp?.toDate
          ? new Date(message.timestamp.toDate()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Just now"}
      </p>
    </div>
  </div>
);

// ── Conversation List Item ────────────────────────────────────────────────────
const ConversationItem = ({ convo, isActive, onClick, currentUser }) => {
  const otherParty = convo.participants?.find(
    (p) => p.uid !== currentUser?.uid,
  );
  const lastMessage = convo.lastMessage;
  const unread = convo.unread?.[currentUser?.uid] || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
        isActive
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-border/30 border border-transparent"
      }`}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border-2 border-primary/20 shrink-0">
          {otherParty?.name?.[0]?.toUpperCase() || "?"}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p
            className={`text-sm font-bold truncate ${unread > 0 ? "text-foreground" : "text-foreground/80"}`}
          >
            {otherParty?.name || "Unknown"}
          </p>
          {lastMessage?.timestamp && (
            <p className="text-[10px] text-foreground/40">
              {new Date(
                lastMessage.timestamp?.toDate?.() || lastMessage.timestamp,
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <p
          className={`text-xs truncate ${unread > 0 ? "text-foreground font-medium" : "text-foreground/50"}`}
        >
          {lastMessage?.text || "No messages yet"}
        </p>
      </div>

      {unread > 0 && (
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
          {unread}
        </span>
      )}
    </button>
  );
};

// ── Product Context Bar ───────────────────────────────────────────────────────
const ProductContextBar = ({ listing, onClose }) => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background/50">
    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-border/20 border border-border">
      {listing?.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt={listing.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-foreground/20">
          <svg
            width="20"
            height="20"
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
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-foreground truncate">
        {listing?.name || "Product"}
      </p>
      <p className="text-sm font-black text-primary">
        ₦{Number(listing?.price || 0).toLocaleString()}
      </p>
    </div>
    <Link
      to="/listings"
      className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5"
    >
      View
    </Link>
  </div>
);

// ── Main Messages Component ───────────────────────────────────────────────────
const Messages = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "conversations"),
      where("participantUids", "array-contains", user.uid),
      orderBy("lastMessage.timestamp", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConvo) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "conversations", activeConvo.id, "messages"),
      orderBy("timestamp", "asc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);

      // Mark as read
      if (activeConvo.unread?.[user?.uid] > 0) {
        updateDoc(doc(db, "conversations", activeConvo.id), {
          [`unread.${user.uid}`]: 0,
        });
      }
    });

    return () => unsubscribe();
  }, [activeConvo, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConvo) return;

    const text = inputText.trim();
    setInputText("");

    try {
      await addDoc(
        collection(db, "conversations", activeConvo.id, "messages"),
        {
          text,
          senderUid: user.uid,
          senderName: profile?.name || "User",
          timestamp: serverTimestamp(),
        },
      );

      const otherUid = activeConvo.participants.find(
        (p) => p.uid !== user.uid,
      )?.uid;

      await updateDoc(doc(db, "conversations", activeConvo.id), {
        lastMessage: {
          text,
          timestamp: serverTimestamp(),
          senderUid: user.uid,
        },
        [`unread.${otherUid}`]: (activeConvo.unread?.[otherUid] || 0) + 1,
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const startConversation = async (sellerUid, sellerName, listing) => {
    const existing = conversations.find(
      (c) =>
        c.participants.some((p) => p.uid === sellerUid) &&
        c.listing?.id === listing.id,
    );

    if (existing) {
      setActiveConvo(existing);
      return;
    }

    try {
      const newConvoRef = await addDoc(collection(db, "conversations"), {
        participants: [
          { uid: user.uid, name: profile?.name || "User" },
          { uid: sellerUid, name: sellerName },
        ],
        participantUids: [user.uid, sellerUid],
        listing: {
          id: listing.id,
          name: listing.name,
          price: listing.price,
          imageUrl: listing.imageUrl,
        },
        lastMessage: null,
        unread: { [sellerUid]: 0, [user.uid]: 0 },
        createdAt: serverTimestamp(),
      });

      setActiveConvo({
        id: newConvoRef.id,
        participants: [
          { uid: user.uid, name: profile?.name || "User" },
          { uid: sellerUid, name: sellerName },
        ],
        listing,
      });
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground/60 mb-4">
            Please sign in to view messages
          </p>
          <Link to="/login" className="main-button px-6 py-2.5">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-120px)]">
        <div className="bg-card rounded-2xl border border-border h-full overflow-hidden flex">
          {/* Sidebar - Conversations */}
          <div className="w-full sm:w-80 border-r border-border flex flex-col">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <h1 className="text-lg font-black text-foreground">Messages</h1>
              <span className="text-xs text-foreground/40">
                {conversations.length} chats
              </span>
            </div>

            <div className="px-4 py-3 border-b border-border/60">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/35"
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
                  placeholder="Search messages..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:border-primary/50 outline-none transition-all text-foreground placeholder:text-foreground/30"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3 border-2 border-dashed border-primary/20">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-primary/30"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-foreground/50">
                    No messages yet
                  </p>
                  <p className="text-xs text-foreground/30 mt-1">
                    Start a conversation from a product page
                  </p>
                </div>
              ) : (
                conversations.map((convo) => (
                  <ConversationItem
                    key={convo.id}
                    convo={convo}
                    isActive={activeConvo?.id === convo.id}
                    onClick={() => setActiveConvo(convo)}
                    currentUser={user}
                  />
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="hidden sm:flex flex-1 flex-col bg-background/30">
            {activeConvo ? (
              <>
                {/* Header */}
                <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border-2 border-primary/20">
                      {activeConvo.participants
                        ?.find((p) => p.uid !== user?.uid)
                        ?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {activeConvo.participants?.find(
                          (p) => p.uid !== user?.uid,
                        )?.name || "Unknown"}
                      </p>
                      <p className="text-[10px] text-foreground/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active now
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Context */}
                {activeConvo.listing && (
                  <ProductContextBar listing={activeConvo.listing} />
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {messages.length === 0 && activeConvo.listing && (
                    <div className="text-center py-8 text-foreground/40 text-sm">
                      Start a conversation about{" "}
                      <span className="font-bold text-foreground">
                        {activeConvo.listing.name}
                      </span>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMe={msg.senderUid === user.uid}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-5 py-4 border-t border-border/60 bg-card">
                  <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-foreground/40 hover:text-foreground hover:border-primary/30 transition-all">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && sendMessage()
                      }
                      placeholder="Write your questions here..."
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-foreground/30"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputText.trim()}
                      className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 hover:bg-primary/90 transition-all flex items-center gap-2"
                    >
                      <span>Send</span>
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
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-4 border-2 border-dashed border-primary/20">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-primary/30"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-foreground/40 max-w-xs">
                  Choose a conversation from the sidebar to start messaging
                </p>
                <Link
                  to="/listings"
                  className="mt-6 main-button px-6 py-2.5 text-sm font-semibold"
                >
                  Browse Listings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
