import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

// ── Cart helpers (PER-USER, keyed by uid) ────────────────────────────────────
export const cartHelpers = {
  _key: (uid) => (uid ? `declutt_cart_${uid}` : "declutt_cart_guest"),
  get: (uid) => {
    try {
      return JSON.parse(localStorage.getItem(cartHelpers._key(uid)) || "[]");
    } catch {
      return [];
    }
  },
  set: (uid, items) =>
    localStorage.setItem(cartHelpers._key(uid), JSON.stringify(items)),
  add: (uid, listing, qty = 1) => {
    const cart = cartHelpers.get(uid);
    const idx = cart.findIndex((i) => i.id === listing.id);
    if (idx > -1) {
      cart[idx].quantity = Math.min(
        (cart[idx].quantity || 1) + qty,
        listing.maxQuantity || 99,
      );
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
    cartHelpers.set(uid, cart);
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { uid } }));
  },
};

const Spinner = ({ size = 20 }) => (
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
    className={`fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl whitespace-nowrap bg-primary text-primary-foreground transition-all duration-300 pointer-events-none ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
  >
    {msg}
  </div>
);

/* ── Image Gallery ── */
const ImageGallery = ({ images, productName }) => {
  const [selected, setSelected] = useState(0);
  const slots = [0, 1, 2];
  const realImages = (images || []).filter(Boolean);
  const hasImages = realImages.length > 0;

  const prev = () =>
    setSelected((i) => (i - 1 + realImages.length) % realImages.length);
  const next = () => setSelected((i) => (i + 1) % realImages.length);

  return (
    <div className="w-full max-w-[380px] mx-auto space-y-3">
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-border/20 border border-border/60 group"
        style={{ aspectRatio: "1/1" }}
      >
        {hasImages ? (
          <img
            src={realImages[selected]}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20">
            No Image
          </div>
        )}
        {realImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="flex gap-3 justify-center">
        {slots.map((i) => {
          const img = realImages[i];
          return (
            <button
              key={i}
              onClick={() => img && setSelected(i)}
              className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                selected === i && img
                  ? "border-primary scale-105"
                  : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              {img ? (
                <img
                  src={img}
                  alt={`${productName} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-border/30 text-foreground/30 text-xs font-bold">
                  +
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── Qty Selector ── */
const QtySelector = ({ value, onChange, max = 99 }) => (
  <div className="flex items-center gap-3">
    <span className="text-sm font-semibold text-foreground">Quantity</span>
    <div className="flex items-center border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-9 h-9 flex items-center justify-center text-foreground/60 hover:bg-border/40 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="w-10 text-center text-sm font-bold">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 flex items-center justify-center text-foreground/60 hover:bg-border/40 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
    <span className="text-xs text-foreground/40">Max. {max}</span>
  </div>
);

/* ── Messaging Panel ── */
const MessagingPanel = ({ listing, onClose, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.uid || !listing?.id) {
      setReady(true);
      return;
    }
    const q = query(
      collection(db, "messages"),
      where("listingId", "==", listing.id),
      where("buyerUid", "==", currentUser.uid),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setReady(true);
      },
      () => setReady(true),
    );
    return () => unsub();
  }, [listing?.id, currentUser?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !currentUser || sending) return;
    const txt = input.trim();
    setInput("");
    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        listingId: listing.id,
        sellerUid: listing.sellerUid,
        buyerUid: currentUser.uid,
        buyerName: currentUser.displayName || "Buyer",
        sellerName: listing.sellerName || "Seller",
        listingName: listing.name,
        listingImageUrl: listing.imageUrl || null,
        text: txt,
        from: "buyer",
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-[70] flex justify-end">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative w-full max-w-sm sm:max-w-md bg-card h-full shadow-2xl flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-base font-bold text-foreground">
            Sign in to message
          </p>
          <p className="text-sm text-foreground/50">
            You need an account to contact sellers.
          </p>
          <div className="flex gap-2">
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
            >
              Sign in
            </Link>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-border/30 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md bg-card shadow-2xl flex flex-col"
        style={{ height: "100dvh" }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary border-2 border-primary/20 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
            {listing.sellerPhotoURL ? (
              <img
                src={listing.sellerPhotoURL}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              (listing.sellerName?.[0] || "S").toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {listing.sellerName || "Seller"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-foreground/45">
                Delivered even when offline
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground/40 hover:bg-border/50 hover:text-foreground transition-colors shrink-0"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          className="flex items-center gap-3 px-4 py-2 border-b border-border/50 shrink-0"
          style={{ background: "hsl(var(--background))" }}
        >
          {listing.imageUrl && (
            <img
              src={listing.imageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/50 truncate">
              {listing.name}
            </p>
            <p className="text-sm font-black text-primary">
              &#8358;{Number(listing.price).toLocaleString()}
            </p>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2"
          style={{ background: "hsl(var(--background)/0.4)" }}
        >
          {!ready ? (
            <div className="flex justify-center py-12 text-foreground/40">
              <Spinner size={22} />
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-foreground/40">
                    Ask {listing.sellerName?.split(" ")[0] || "the seller"}{" "}
                    anything
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "Is this still available?",
                      "What's your best price?",
                      "Can we meet up?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-full text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => {
                const isMine = m.from === "buyer";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {!isMine && (
                      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center text-[9px] font-black shrink-0 mr-2 mt-1">
                        {(listing.sellerName?.[0] || "S").toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-foreground border border-border rounded-bl-sm"}`}
                    >
                      <p>{m.text}</p>
                      <div
                        className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}
                      >
                        <p
                          className={`text-[10px] ${isMine ? "text-primary-foreground/55" : "text-foreground/35"}`}
                        >
                          {m.createdAt?.toDate
                            ? new Date(m.createdAt.toDate()).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "just now"}
                        </p>
                        {isMine && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="text-primary-foreground/55"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex items-center gap-2 px-3 py-3 border-t border-border bg-card shrink-0">
          <input
            type="text"
            value={input}
            autoFocus
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type a message..."
            className="flex-1 px-3 sm:px-4 py-2.5 rounded-xl text-sm bg-background border border-border focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 text-foreground placeholder:text-foreground/30 transition-all"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {sending ? (
              <Spinner size={16} />
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
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

/* ── Seller Info ── */
const SellerInfo = ({ listing, onMsg }) => (
  <div className="space-y-4">
    <div className="border-b border-border pb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-3">
        Sold By
      </p>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border-2 border-primary/30 overflow-hidden shrink-0">
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
        <div>
          <p className="text-sm font-bold text-foreground">
            {listing.sellerName || "Seller"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-semibold text-green-600">
              Active
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onMsg}
        className="mt-3 w-full py-2.5 rounded-xl border border-border text-sm font-bold text-foreground/70 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Message Seller
      </button>
    </div>
    <div className="space-y-2.5">
      <p className="text-xs font-bold text-green-600">Service commitment</p>
      <div className="flex items-start gap-2">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground/40 mt-0.5 shrink-0"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <div>
          <p className="text-xs font-bold text-foreground">Safe meetup</p>
          <p className="text-[10px] text-foreground/40">
            Meet in a public place
          </p>
        </div>
      </div>
    </div>
  </div>
);

/* ── Saved Items helpers ── */
const savedHelpers = {
  _key: (uid) => (uid ? `declutt_saved_${uid}` : "declutt_saved_guest"),
  get: (uid) => {
    try {
      return JSON.parse(localStorage.getItem(savedHelpers._key(uid)) || "[]");
    } catch {
      return [];
    }
  },
  toggle: (uid, listing) => {
    const saved = savedHelpers.get(uid);
    const idx = saved.findIndex((i) => i.id === listing.id);
    let next;
    if (idx > -1) {
      next = saved.filter((_, i) => i !== idx);
    } else {
      next = [
        ...saved,
        {
          id: listing.id,
          name: listing.name,
          price: listing.price,
          imageUrl: listing.imageUrl || null,
          category: listing.category || "",
        },
      ];
    }
    localStorage.setItem(savedHelpers._key(uid), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("saved-updated", { detail: { uid } }));
    return idx === -1;
  },
  has: (uid, id) => savedHelpers.get(uid).some((i) => i.id === id),
};

/* ── Related Items — FIXED: only same category ── */
const RelatedItems = ({ currentId, category }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    getDocs(collection(db, "listings"))
      .then((snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // FIX: Only show items from the SAME category, exclude current item
        const sameCategory = all.filter(
          (l) =>
            l.id !== currentId &&
            l.category === category &&
            l.available === true,
        );
        // If not enough same-category items, fill with other available items
        let result = sameCategory;
        if (result.length < 8) {
          const others = all.filter(
            (l) =>
              l.id !== currentId &&
              l.category !== category &&
              l.available === true,
          );
          result = [...result, ...others];
        }
        setItems(result.slice(0, 8));
      })
      .catch(console.error);
  }, [currentId, category]);

  if (items.length === 0)
    return (
      <p className="text-sm text-foreground/35 py-4">No related items yet.</p>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => {
            navigate(`/product/${item.id}`);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
          className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="aspect-square overflow-hidden bg-border/20">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground/15 text-xs">
                No img
              </div>
            )}
          </div>
          <div className="p-2.5 text-left">
            <p className="text-xs font-bold text-foreground truncate">
              {item.name}
            </p>
            <p className="text-sm font-black text-primary mt-0.5">
              &#8358;{Number(item.price).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Main ProductDetails ── */
const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid || null;

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [showMsg, setShowMsg] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });

  // FIX: Scroll to top when component mounts or id changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  useEffect(() => {
    if (id) setIsSaved(savedHelpers.has(uid, id));
  }, [uid, id]);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2400);
  };

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "listings", id))
      .then((snap) => {
        if (snap.exists()) setListing({ id: snap.id, ...snap.data() });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const openMsg = () => {
    if (!user) {
      showToast("Sign in to message seller");
      return;
    }
    setShowMsg(true);
  };

  const handleBuy = () => {
    if (!listing) return;
    if (listing.sellerContact) {
      const text = encodeURIComponent(
        `Hi! I want to buy your "${listing.name}" for ₦${Number(listing.price).toLocaleString()} on Declutt.`,
      );
      window.open(
        `https://wa.me/234${listing.sellerContact.replace(/^0/, "")}?text=${text}`,
        "_blank",
      );
    } else {
      openMsg();
    }
  };

  const handleCart = () => {
    cartHelpers.add(uid, listing, qty);
    showToast("Added to cart ✓");
  };

  const handleSave = () => {
    const nowSaved = savedHelpers.toggle(uid, listing);
    setIsSaved(nowSaved);
    showToast(nowSaved ? "Saved ✓" : "Removed from saved");
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.name, url });
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch (_) {}
      showToast("Link copied ✓");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center gap-2 text-foreground/40">
          <Spinner size={22} />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );

  if (!listing)
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-foreground/50 font-bold">Product not found</p>
            <button
              onClick={() => navigate("/listings")}
              className="text-primary text-sm font-bold hover:underline"
            >
              Back to listings
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );

  const images = listing.imageUrl
    ? [listing.imageUrl, ...(listing.additionalImages || [])]
    : [];
  const hasReviews = (listing.reviewCount || 0) > 0;
  const soldCount = listing.soldCount || 0;

  const PurchaseActions = () => (
    <div className="space-y-3 pt-4 border-t border-border">
      <QtySelector
        value={qty}
        onChange={setQty}
        max={listing.maxQuantity || 99}
      />
      <button
        onClick={handleBuy}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all"
      >
        {listing.sellerContact ? "Contact on WhatsApp" : "Buy Now"}
      </button>
      <button
        onClick={handleCart}
        className="w-full py-3 rounded-xl border-2 border-primary text-primary text-sm font-bold hover:bg-primary/5 active:scale-[0.98] transition-all"
      >
        Add to Cart
      </button>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${isSaved ? "border-primary/40 text-primary bg-primary/8" : "border-border text-foreground/60 hover:border-primary/30 hover:text-primary"}`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {isSaved ? "Saved" : "Save"}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 text-xs font-bold flex items-center justify-center gap-2 hover:border-primary/30 hover:text-primary transition-all"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-14 sm:top-16 z-30">
        <div className="mt-4 mx-auto px-3 sm:px-5 lg:px-6 h-10 flex items-center gap-3 text-xs text-foreground/50">
          <button
            onClick={() => {
              navigate("/listings");
              window.scrollTo({ top: 0 });
            }}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Browse
          </button>
          <span>/</span>
          <span className="text-foreground/70 font-medium truncate">
            {listing.name}
          </span>
        </div>
      </div>

      <main className="flex-1 w-full mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 sm:pb-8 mt-15">
        <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr_330px] gap-4 lg:gap-6 items-start">
          <div className="w-full lg:sticky lg:top-28 mt-1">
            <ImageGallery images={images} productName={listing.name} />
          </div>

          <div className="space-y-4 text-left">
            <span
              className={`inline-flex text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${listing.available ? "bg-green-500/10 text-green-600 border-green-500/25" : "bg-red-500/10 text-red-500 border-red-500/20"}`}
            >
              {listing.available ? "● Available" : "✕ Sold Out"}
            </span>

            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
              {listing.name}
            </h1>

            <div>
              {hasReviews ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill={
                          i < Math.round(listing.avgRating)
                            ? "currentColor"
                            : "none"
                        }
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-primary"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold">
                    {(listing.avgRating || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {listing.reviewCount} review
                    {listing.reviewCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-foreground/20">|</span>
                  <span className="text-xs text-foreground/40">
                    {soldCount} sold
                  </span>
                </div>
              ) : (
                <span className="text-xs text-foreground/40 italic">
                  No reviews yet · {soldCount} sold
                </span>
              )}
            </div>

            <div
              className="rounded-xl p-4 border"
              style={{
                background: "hsl(var(--primary)/0.07)",
                borderColor: "hsl(var(--primary)/0.18)",
              }}
            >
              <p
                className="text-3xl font-black"
                style={{ color: "hsl(var(--primary))" }}
              >
                &#8358;{Number(listing.price).toLocaleString()}
              </p>
              {listing.negotiable && (
                <p className="text-xs mt-1 text-foreground/50">
                  Price is negotiable
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {listing.condition && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/45">
                    Condition:
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {listing.condition}
                  </span>
                </div>
              )}
              {listing.category && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/45">
                    Category:
                  </span>
                  <span className="text-sm text-foreground font-medium">
                    {listing.category}
                  </span>
                </div>
              )}
            </div>

            {listing.description && (
              <div className="border-t border-border pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">
                  Description
                </p>
                <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {listing.location && (
              <div className="flex items-center gap-2 text-sm text-foreground/55">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {listing.location}
              </div>
            )}

            <div className="lg:hidden">
              <PurchaseActions />
            </div>

            <div className="lg:hidden pt-2 border-t border-border">
              <div className="p-4 rounded-2xl border-2 border-border/60">
                <SellerInfo listing={listing} onMsg={openMsg} />
              </div>
            </div>
          </div>

          <div className="hidden lg:block sticky top-28">
            <div className="bg-card border-2 border-border rounded-2xl p-5 space-y-4">
              <SellerInfo listing={listing} onMsg={openMsg} />
              <PurchaseActions />
            </div>
          </div>
        </div>

        {/* Related Items */}
        <div className="mt-10 sm:mt-12 border-t border-border pt-8">
          <h2 className="text-base font-bold text-foreground mb-4 text-left">
            Related items
          </h2>
          <RelatedItems currentId={listing.id} category={listing.category} />
        </div>
      </main>

      {/* FIX: Removed duplicate Footer - only one Footer at the bottom */}

      {/* Mobile sticky bottom bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 flex gap-2.5">
        <button
          onClick={openMsg}
          className="flex-1 py-3 rounded-xl border-2 border-primary text-primary text-sm font-bold hover:bg-primary/8 transition-all"
        >
          Message
        </button>
        <button
          onClick={handleBuy}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
        >
          {listing.sellerContact ? "WhatsApp" : "Buy Now"}
        </button>
      </div>

      {showMsg && (
        <MessagingPanel
          listing={listing}
          onClose={() => setShowMsg(false)}
          currentUser={user}
        />
      )}
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
};

export default ProductDetails;
