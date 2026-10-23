import { useCallback, useSyncExternalStore } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/*
 * ONE cart used by the listings page, the product page and the navbar cart drawer.
 *
 * - Signed in: saved to Firestore (carts/{uid}), so the cart is still there after closing the
 *   browser, signing out and back in, or opening the site on another device. localStorage
 *   (`declutt_cart_<uid>`) is a fast local copy so the cart shows instantly.
 * - Signed out: localStorage only (`declutt_cart_guest`); merged into the account on sign-in.
 *
 * Every change is announced with the "cart-updated" window event so all views update at once.
 */
const LEGACY_KEY = "declutt_cart"; // old global key the listings page used to write to
const key = (uid) => (uid ? `declutt_cart_${uid}` : "declutt_cart_guest");
const MAX_LINES = 100;

const read = (k) => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const writeLocal = (uid, items) => {
  try {
    localStorage.setItem(key(uid), JSON.stringify(items));
  } catch (e) {
    console.error("Cart save failed:", e);
  }
};
const announce = (uid) =>
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: { uid } }));

/** Adds `extra` lines into `base` (quantities add up, capped at 99). */
const mergeInto = (base, extra) => {
  const out = base.map((i) => ({ ...i }));
  extra.forEach((it) => {
    const i = out.findIndex((c) => c.id === it.id);
    if (i > -1)
      out[i].quantity = Math.min((out[i].quantity || 1) + (it.quantity || 1), 99);
    else out.push({ ...it });
  });
  return out.slice(0, MAX_LINES);
};

// Firestore copy: base64 photos would blow the 1 MB document limit, so only real URLs are kept
// (the drawer loads a missing photo from the listing itself).
const forCloud = (items) =>
  items.map(({ id, name, price, category, quantity, imageUrl }) => ({
    id,
    name: name || "",
    price: Number(price) || 0,
    category: category || "",
    quantity: quantity || 1,
    imageUrl:
      typeof imageUrl === "string" && /^https?:\/\//.test(imageUrl)
        ? imageUrl
        : null,
  }));

const pushRemote = (uid, items) =>
  setDoc(doc(db, "carts", uid), {
    items: forCloud(items),
    updatedAt: serverTimestamp(),
  }).catch((e) => console.error("Cart sync failed:", e));

// Keep any photo we already have locally when the cloud copy has none
const withLocalPhotos = (uid, items) => {
  const local = read(key(uid));
  return items.map((it) =>
    it.imageUrl ? it : { ...it, imageUrl: local.find((l) => l.id === it.id)?.imageUrl || null },
  );
};

export const cartHelpers = {
  _key: key,

  get: (uid) => {
    // One-time rescue: items the old listings page saved under the global key now join the user's cart
    const legacy = read(LEGACY_KEY);
    if (uid && legacy.length) {
      writeLocal(uid, mergeInto(read(key(uid)), legacy));
      localStorage.removeItem(LEGACY_KEY);
    }
    return read(key(uid));
  },

  set: (uid, items) => {
    writeLocal(uid, items);
    announce(uid);
    if (uid) pushRemote(uid, items);
  },

  count: (uid) =>
    cartHelpers.get(uid).reduce((n, i) => n + (i.quantity || 1), 0),

  qtyOf: (uid, id) =>
    cartHelpers.get(uid).find((i) => i.id === id)?.quantity || 0,

  add: (uid, listing, qty = 1) => {
    const cart = cartHelpers.get(uid);
    const max = listing.maxQuantity || 99;
    const idx = cart.findIndex((i) => i.id === listing.id);
    if (idx > -1) {
      cart[idx].quantity = Math.min((cart[idx].quantity || 1) + qty, max);
    } else {
      cart.push({
        id: listing.id,
        name: listing.name,
        price: listing.price,
        imageUrl: listing.imageUrl || null,
        category: listing.category || "",
        quantity: Math.min(qty, max),
      });
    }
    cartHelpers.set(uid, cart);
  },

  /** Take one off; removes the line when it reaches 0. */
  decrement: (uid, id) => {
    const cart = cartHelpers.get(uid);
    const idx = cart.findIndex((i) => i.id === id);
    if (idx < 0) return;
    if ((cart[idx].quantity || 1) <= 1) cart.splice(idx, 1);
    else cart[idx].quantity -= 1;
    cartHelpers.set(uid, cart);
  },

  /** Remove a whole line. */
  remove: (uid, id) =>
    cartHelpers.set(
      uid,
      cartHelpers.get(uid).filter((i) => i.id !== id),
    ),
};

// Live cart lines for React: re-renders on "cart-updated" (this tab) and "storage" (other tabs)
const snapshots = new Map(); // storage key → { raw, items }
const subscribeCart = (cb) => {
  window.addEventListener("cart-updated", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("cart-updated", cb);
    window.removeEventListener("storage", cb);
  };
};
export const useCartItems = (uid) => {
  const getSnapshot = useCallback(() => {
    const k = key(uid);
    let raw = null;
    try {
      raw = localStorage.getItem(k);
    } catch {
      /* storage blocked: empty cart */
    }
    const cached = snapshots.get(k);
    if (cached && cached.raw === raw) return cached.items;
    const items = read(k);
    snapshots.set(k, { raw, items });
    return items;
  }, [uid]);
  return useSyncExternalStore(subscribeCart, getSnapshot);
};

/**
 * Keeps a signed-in user's cart in step with Firestore (call once, e.g. from the navbar).
 * On sign-in a guest cart is merged into the account. Returns an unsubscribe function.
 */
export const syncCart = (uid) => {
  if (!uid) return () => {};
  const guest = read(key(null));
  let first = true;
  const unsub = onSnapshot(
    doc(db, "carts", uid),
    (snap) => {
      const remote = snap.exists() ? snap.data().items || [] : null;
      // Offline "doesn't exist" isn't trustworthy — wait for the server before deciding
      if (first && !remote && snap.metadata.fromCache) return;
      if (first) {
        first = false;
        // Account cart: the saved one, or (first time) whatever this browser already had
        const base = remote ? withLocalPhotos(uid, remote) : cartHelpers.get(uid);
        const merged = guest.length ? mergeInto(base, guest) : base;
        writeLocal(uid, merged);
        if (guest.length) localStorage.removeItem(key(null));
        if (!remote || guest.length) pushRemote(uid, merged);
      } else if (!snap.metadata.hasPendingWrites && remote) {
        // A change made on another device / tab
        writeLocal(uid, withLocalPhotos(uid, remote));
      } else return;
      announce(uid);
    },
    (e) => console.error("Cart listener:", e),
  );
  return unsub;
};
