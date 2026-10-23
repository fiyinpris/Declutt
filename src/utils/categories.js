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
 * Review status: sellers' new listings (and edits to name/description/photos/category) are
 * "pending" until an admin approves them. Listings from before reviews existed have no
 * status and count as approved.
 */
export const listingStatus = (listing) => listing?.status || "approved";

/** Shown to buyers: an allowed category AND approved. */
export const isPublicListing = (listing) =>
  isAllowedListing(listing) && listingStatus(listing) === "approved";

const ms = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : 0);

/** Featured (paid promotion, set by an admin) until `featuredUntil`. */
export const isFeatured = (listing, now = Date.now()) =>
  ms(listing?.featuredUntil) > now;

// Core details a buyer relies on — changing any of them sends the listing back for review
export const REVIEWED_FIELDS = [
  "name",
  "description",
  "category",
  "imageUrl",
  "additionalImages",
];
