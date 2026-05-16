// ─── Cart Helpers ─────────────────────────────────────────────────────────────
export const cartHelpers = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem("declutt_cart") || "[]");
    } catch {
      return [];
    }
  },
  set: (items) => localStorage.setItem("declutt_cart", JSON.stringify(items)),
  add: (listing, qty = 1) => {
    const cart = cartHelpers.get();
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
    cartHelpers.set(cart);
    window.dispatchEvent(new Event("cart-updated"));
  },
};