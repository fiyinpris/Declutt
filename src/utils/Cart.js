/*
 * ONE cart used by the listings page, the product page and the cart page.
 * Stored per user (`declutt_cart_<uid>`, or `declutt_cart_guest` when signed out) and announced with
 * the "cart-updated" window event so the navbar / cart page / cards all update immediately.
 */
const LEGACY_KEY = "declutt_cart"; // old global key the listings page used to write to
const key = (uid) => (uid ? `declutt_cart_${uid}` : "declutt_cart_guest");

const read = (k) => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const cartHelpers = {
  _key: key,

  get: (uid) => {
    // One-time rescue: items the old listings page saved under the global key now join the user's cart
    const legacy = read(LEGACY_KEY);
    if (uid && legacy.length) {
      const cart = read(key(uid));
      legacy.forEach((it) => {
        const i = cart.findIndex((c) => c.id === it.id);
        if (i > -1)
          cart[i].quantity = Math.min(
            (cart[i].quantity || 1) + (it.quantity || 1),
            99,
          );
        else cart.push(it);
      });
      localStorage.setItem(key(uid), JSON.stringify(cart));
      localStorage.removeItem(LEGACY_KEY);
    }
    return read(key(uid));
  },

  set: (uid, items) => {
    localStorage.setItem(key(uid), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { uid } }));
  },

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
};
