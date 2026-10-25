import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { OWNER_EMAIL } from "../utils/admin";
import { isFeatured, isPublicListing } from "../utils/categories";
import { Ico, Spin } from "./Ico";

/*
 * "Request Featured Listing": the seller picks an item and says why. The request is saved for
 * the admin dashboard AND emailed to the owner (prefilled email-app / Gmail links).
 */
const buildEmail = ({ listing, sellerName, sellerEmail, reason }) => {
  const link = `${window.location.origin}/product/${listing.id}`;
  const subject = `Featured listing request: ${listing.name}`;
  const body = [
    "Hello Declutt,",
    "",
    "I'd like to request a Featured Listing for this item.",
    "",
    `Seller: ${sellerName}`,
    `Seller email: ${sellerEmail}`,
    `Product: ${listing.name}`,
    `Product ID: ${listing.id}`,
    `Product link: ${link}`,
    `Price: ₦${Number(listing.price || 0).toLocaleString()}`,
    "",
    "Why I'd like it featured:",
    reason,
    "",
    "Thank you.",
  ].join("\n");
  const q = (s) => encodeURIComponent(s);
  return {
    mailto: `mailto:${OWNER_EMAIL}?subject=${q(subject)}&body=${q(body)}`,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${q(OWNER_EMAIL)}&su=${q(subject)}&body=${q(body)}`,
  };
};

const FeatureRequestModal = ({ listings, initial, onClose }) => {
  const { user, profile } = useAuth();
  const eligible = listings.filter((l) => isPublicListing(l) && !isFeatured(l));
  const [listingId, setListingId] = useState(
    initial?.id || eligible[0]?.id || "",
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // { mailto, gmail }

  const listing = eligible.find((l) => l.id === listingId);
  const sellerName = profile?.name || user?.displayName || "Seller";
  const sellerEmail = profile?.email || user?.email || "";

  const submit = async () => {
    if (!listing) return setError("Choose one of your live items.");
    if (reason.trim().length < 10)
      return setError("Tell us a little about why (at least 10 characters).");
    if (sending) return;
    setSending(true);
    setError("");
    const links = buildEmail({
      listing,
      sellerName,
      sellerEmail,
      reason: reason.trim(),
    });
    try {
      await addDoc(collection(db, "featureRequests"), {
        listingId: listing.id,
        listingName: listing.name || "",
        sellerUid: user.uid,
        sellerName,
        sellerEmail,
        reason: reason.trim().slice(0, 1000),
        status: "open",
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      // The email still reaches the owner even if saving the copy fails
      console.error("Feature request save failed:", e);
    }
    setSending(false);
    setSent(links);
    window.location.assign(links.mailto); // opens the email app with everything filled in
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-foreground">
              ★ Request Featured Listing
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              Featured items show first on Browse with a badge for 7 days.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/45 hover:bg-border/40 shrink-0"
          >
            <Ico s={16} w={2.2} r>
              <path d="M18 6 6 18M6 6l12 12" />
            </Ico>
          </button>
        </div>

        {sent ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-foreground/75">
              Your request is ready. If your email app didn't open, send it
              with one of these:
            </p>
            <a
              href={sent.gmail}
              target="_blank"
              rel="noopener noreferrer"
              className="main-button w-full flex items-center justify-center py-3 text-sm font-bold"
            >
              Send with Gmail
            </a>
            <a
              href={sent.mailto}
              className="w-full flex items-center justify-center py-3 rounded-full border-2 border-border text-sm font-semibold text-foreground/75 hover:text-primary"
            >
              Open my email app
            </a>
            <p className="text-[11px] text-foreground/45 text-center">
              Requests are reviewed by Declutt — sending one doesn't guarantee
              your item will be featured. We'll reply by email.
            </p>
          </div>
        ) : eligible.length === 0 ? (
          <p className="mt-5 text-sm text-foreground/60">
            You don't have any live items that can be featured right now.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="fr-item" className="block text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2">
                Item
              </label>
              <select
                id="fr-item"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[16px] sm:text-sm text-foreground outline-none focus:border-primary/50"
              >
                {eligible.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — ₦{Number(l.price || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fr-reason" className="block text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2">
                Why should it be featured?
              </label>
              <textarea
                id="fr-reason"
                rows={4}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Brand-new condition, priced to sell this week…"
                className="w-full resize-none px-3.5 py-2.5 rounded-xl border border-border bg-background text-[16px] sm:text-sm text-foreground placeholder:text-foreground/30 outline-none focus:border-primary/50"
              />
            </div>
            <p className="text-[11px] text-foreground/45 leading-relaxed">
              Your request is emailed to {OWNER_EMAIL} with your name, the
              item's name, ID and link. Requesting doesn't guarantee approval —
              we'll reply by email.
            </p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="main-button w-full flex items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-60"
            >
              {sending && <Spin s={14} />}
              {sending ? "Preparing…" : "Send request"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureRequestModal;
