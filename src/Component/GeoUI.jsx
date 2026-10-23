import { Ico } from "./Ico";
import { listingDistance, getCoords, STATUS_MESSAGES } from "../utils/geo";

const Pin = ({ s = 14 }) => (
  <Ico s={s} w={2.5} r>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Ico>
);

/** Banner shown on the listings page when the buyer's location is missing or too rough. */
export const LocationBanner = ({ loc }) => {
  const { status, coords, retry } = loc;
  if (status === "loading" && !coords)
    return (
      <p className="text-[11px] text-foreground/40 flex items-center gap-1.5">
        <Pin s={11} /> Getting your location to show distances…
      </p>
    );
  if (status === "granted") {
    if (coords?.accuracy > 2000)
      return (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 text-xs">
          Your location is only accurate to about{" "}
          {(coords.accuracy / 1000).toFixed(1)} km, so distances are approximate
          (shown with “~”). Turn on GPS / precise location for exact distances.
        </div>
      );
    return null;
  }
  const msg = STATUS_MESSAGES[status];
  if (!msg) return null;
  return (
    <div className="px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/70 flex items-start sm:items-center gap-3 flex-col sm:flex-row">
      <span className="flex items-center gap-2 flex-1">
        <span className="text-primary shrink-0">
          <Pin />
        </span>
        {msg}
      </span>
      {(status === "denied" ||
        status === "unavailable" ||
        status === "timeout") && (
        <button
          onClick={retry}
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-[11px]"
        >
          Retry
        </button>
      )}
    </div>
  );
};

/** One-line "x km away" for the product page. */
export const DistanceLine = ({ listing, loc }) => {
  const seller = getCoords(listing);
  const d = listingDistance(listing, loc);
  let body;
  if (!seller)
    body = "The seller hasn't shared a precise location for this item.";
  else if (d)
    body = (
      <>
        <span className="font-bold text-foreground">{d.label}</span> away
        <span className="text-foreground/40">
          {" "}
          · straight-line from your location
        </span>
      </>
    );
  else if (loc.status === "loading") body = "Getting your location…";
  else body = STATUS_MESSAGES[loc.status] || "Distance unavailable.";

  return (
    <div className="flex items-start gap-2 text-sm text-foreground/60">
      <span className="text-primary mt-0.5 shrink-0">
        <Pin />
      </span>
      <div className="flex-1">
        <p>{body}</p>
        {!d &&
          seller &&
          ["denied", "unavailable", "timeout"].includes(loc.status) && (
            <button
              onClick={loc.retry}
              className="mt-1 text-xs font-bold text-primary hover:underline"
            >
              Retry
            </button>
          )}
      </div>
    </div>
  );
};
