/*
 * The ONLY categories Declutt accepts. Used by the seller and admin listing forms, the listings
 * filter and the home/about copy — and enforced by firestore.rules (keep both lists the same).
 */
export const CATEGORIES = ["Furniture", "Appliances", "Electronics"];

// Older listings had a typed-in category ("furniture", "Appliance", …); map those onto the
// official names. Anything else (clothes, food, "light", "Other", …) isn't allowed.
const ALIASES = {
  furniture: "Furniture",
  furnitures: "Furniture",
  appliance: "Appliances",
  appliances: "Appliances",
  "home appliances": "Appliances",
  electronic: "Electronics",
  electronics: "Electronics",
};

/** Official category name for a listing's category, or null if it isn't one we sell. */
export const normalizeCategory = (category) =>
  ALIASES[(category || "").trim().toLowerCase()] || null;

/** True when a listing belongs on the site (one of the allowed categories). */
export const isAllowedListing = (listing) => !!normalizeCategory(listing?.category);

/*
 * Moderation: listings go live as soon as a seller posts them. An admin can hide one
 * (status "hidden", with an optional rejectReason the seller sees). The older "rejected"
 * status counts as hidden; anything else (none, "approved", the old "pending") is live.
 */
export const isHiddenByAdmin = (listing) =>
  listing?.status === "hidden" || listing?.status === "rejected";

/** Shown to buyers: an allowed category and not hidden by an admin. */
export const isPublicListing = (listing) =>
  isAllowedListing(listing) && !isHiddenByAdmin(listing);

const ms = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0);

/** Featured (paid promotion, set by an admin) until `featuredUntil`. */
export const isFeatured = (listing, now = Date.now()) =>
  ms(listing?.featuredUntil) > now;
