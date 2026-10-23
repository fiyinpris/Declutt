import { useState, useEffect, useCallback } from "react";

/* ───────────────────────── Coordinates & distance ───────────────────────── */

/** Read + validate a listing's saved coordinates. Returns {lat,lng,accuracy} or null. */
export const getCoords = (o) => {
  if (!o || o.lat == null || o.lng == null || o.lat === "" || o.lng === "")
    return null;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null; // "null island" = never a real location
  const acc = Number(o.locAccuracy);
  return { lat, lng, accuracy: Number.isFinite(acc) && acc > 0 ? acc : null };
};

/** Great-circle (straight-line) distance in km between two {lat,lng} points (haversine). */
export const distanceKm = (a, b) => {
  const R = 6371.0088; // mean Earth radius, km
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** "Nearby", "850 m", "3.2 km". Prefixed with "~" when either position is rough (> 1 km). */
export const formatDistance = (km, accuracyM = 0) => {
  const approx = accuracyM > 1000 ? "~" : "";
  if (km < 0.05) return approx ? "~Nearby" : "Nearby";
  if (km < 1) return `${approx}${Math.round(km * 1000)} m`;
  return `${approx}${km < 100 ? km.toFixed(1) : Math.round(km)} km`;
};

/** { km, label } for a listing relative to the buyer's location state, or null if unknown. */
export const listingDistance = (listing, loc) => {
  const seller = getCoords(listing);
  if (!seller || !loc?.coords) return null;
  const km = distanceKm(loc.coords, seller);
  const acc = Math.max(loc.coords.accuracy || 0, seller.accuracy || 0);
  return { km, label: formatDistance(km, acc) };
};

/* ───────────────────────────── Error messages ───────────────────────────── */

export const describeGeoError = (e) => {
  switch (e?.code) {
    case 1:
      return "Location permission was denied. Allow location access for this site in your browser settings, then try again.";
    case 2:
      return "Your device couldn't determine its location. Turn on GPS / location services and try again.";
    case 3:
      return "Getting your location took too long. Move to an open area or turn on GPS, then try again.";
    default:
      return e?.message || "Could not get your location.";
  }
};

export const STATUS_MESSAGES = {
  denied:
    "Location access is blocked, so we can't show how far items are. Allow location for this site in your browser settings, then tap Retry.",
  unavailable:
    "We couldn't determine your location. Turn on GPS / location services, then tap Retry.",
  timeout:
    "Getting your location took too long. Check that GPS is on, then tap Retry.",
  unsupported:
    "Your browser doesn't support location, so distances can't be shown.",
  insecure:
    "Location only works on a secure (https) connection, so distances can't be shown.",
};

/* ─────────────────────── Seller: capture an accurate fix ─────────────────────── */

/**
 * Collects GPS readings for up to `timeout` ms and resolves with the most accurate one
 * (stops early once accuracy is <= goodEnough metres). A single getCurrentPosition() call
 * often returns a coarse Wi-Fi/IP fix that can be kilometres off, which is what made
 * distances wrong.
 */
export const captureBestPosition = ({
  timeout = 15000,
  goodEnough = 50,
} = {}) =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation)
      return reject({
        code: 0,
        message: "Geolocation is not supported on this device.",
      });
    let best = null;
    let done = false;
    let watchId = null;
    let timer = null;
    const finish = (err) => {
      if (done) return;
      done = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(err || { code: 3 });
    };
    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const c = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy || 0) || null,
        };
        if (!best || (c.accuracy || Infinity) < (best.accuracy || Infinity))
          best = c;
        if (c.accuracy && c.accuracy <= goodEnough) finish();
      },
      (e) => {
        if (e.code === 1) finish(e); // permission denied — no point waiting
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout },
    );
    timer = setTimeout(() => finish({ code: 3 }), timeout);
  });

/* ───────────────────── Buyer: live location with status ───────────────────── */

/**
 * Live buyer location. Returns { coords:{lat,lng,accuracy}|null, status, retry }.
 * status: loading | granted | denied | unavailable | timeout | unsupported | insecure
 * Keeps watching, so distances update as the buyer moves, and re-checks automatically if the
 * user changes the browser's location permission.
 */
export const useBuyerLocation = () => {
  const [state, setState] = useState({ coords: null, status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ coords: null, status: "unsupported" });
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setState({ coords: null, status: "insecure" });
      return;
    }

    let dead = false;
    let watchId = null;
    let permStatus = null;
    setState((s) => ({
      coords: s.coords,
      status: s.coords ? s.status : "loading",
    }));

    const onPos = (p) => {
      if (dead) return;
      const c = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: Math.round(p.coords.accuracy || 0) || null,
      };
      setState((prev) => {
        const o = prev.coords;
        // ignore jitter (<20 m movement without better accuracy) to avoid needless re-renders
        if (
          o &&
          distanceKm(o, c) * 1000 < 20 &&
          (c.accuracy || Infinity) >= (o.accuracy || Infinity) * 0.8
        )
          return prev.status === "granted"
            ? prev
            : { coords: o, status: "granted" };
        return { coords: c, status: "granted" };
      });
    };

    const onErr = (e) => {
      if (dead) return;
      if (e.code === 1) {
        setState({ coords: null, status: "denied" });
        return;
      }
      // Couldn't get a high-accuracy fix: try a coarse one rather than showing nothing
      navigator.geolocation.getCurrentPosition(
        onPos,
        (e2) => {
          if (dead) return;
          setState((s) =>
            s.coords
              ? s
              : {
                  coords: null,
                  status: e2.code === 3 ? "timeout" : "unavailable",
                },
          );
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    };

    watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000,
    });

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((r) => {
          if (dead) return;
          permStatus = r;
          r.onchange = () => !dead && setAttempt((a) => a + 1);
        })
        .catch(() => {});
    }

    return () => {
      dead = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (permStatus) permStatus.onchange = null;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
};
