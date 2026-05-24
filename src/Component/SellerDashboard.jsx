import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { DecluttLogo } from "./Navbar";

const NAVBAR_H = 64;

const CATEGORIES = [
  "Electronics",
  "Furniture",
  "Clothing",
  "Books",
  "Appliances",
  "Bikes & Vehicles",
  "Sports",
  "Music",
  "Kitchen",
  "Other",
];

const CONDITIONS = ["Brand new", "Like new", "Good", "Fair", "For parts"];

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Dashboard",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "messages",
    label: "Messages",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1 -2 2H7l-4 4V5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "listings",
    label: "My Items",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1 -2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2 -1.61L23 6H6" />
      </svg>
    ),
  },
  {
    id: "rewards",
    label: "Rewards",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: "referrals",
    label: "Referrals",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0 -4 -4H5a4 4 0 0 0 -4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0 -3 -3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "My Profile",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0 -4 -4H8a4 4 0 0 0 -4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const formatDisplayName = (name) => {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).join(" ");
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const useLogout = (logoutFn, navigate) => {
  const [state, setState] = useState("idle");
  const handleLogout = async () => {
    setState("loading");
    await new Promise((r) => setTimeout(r, 1400));
    setState("success");
    await new Promise((r) => setTimeout(r, 1600));
    await logoutFn();
    navigate("/");
  };
  return { state, handleLogout };
};

const LogoutButton = ({ onLogout, state }) => (
  <button
    onClick={onLogout}
    disabled={state !== "idle"}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed
      ${state === "success" ? "bg-green-500 text-white" : state === "loading" ? "bg-red-400 text-white" : "text-foreground/50 hover:text-red-500 hover:bg-red-500/8"}`}
  >
    {state === "loading" && (
      <svg
        className="animate-spin shrink-0"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12a9 9 0 1 1 -6.219 -8.56" />
      </svg>
    )}
    {state === "success" && (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
    {state === "idle" && (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M9 21H5a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    )}
    {state === "loading"
      ? "Signing out…"
      : state === "success"
        ? "Signed out!"
        : "Log out"}
  </button>
);

const LocationPicker = ({
  coords,
  onCapture,
  loading,
  onClear,
  allowClear = true,
}) => {
  if (coords) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-green-500/30 bg-green-500/8 text-green-700 text-sm">
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
          <path d="M20 10c0 6 -8 12 -8 12s-8 -6 -8 -12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="font-semibold text-xs flex-1">
          Location captured · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
        {allowClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-green-600/60 hover:text-red-500 transition-colors text-xs underline"
          >
            Remove
          </button>
        ) : (
          <span className="text-[11px] text-green-700/80">
            Location required
          </span>
        )}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onCapture}
      disabled={loading}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-sm text-foreground/60 hover:text-primary transition-all"
    >
      {loading ? (
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12a9 9 0 1 1 -6.219 -8.56" />
        </svg>
      ) : (
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
          <path d="M20 10c0 6 -8 12 -8 12s-8 -6 -8 -12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )}
      <div className="text-left">
        <p className="text-xs font-semibold">
          {loading ? "Getting your location…" : "Tap to share your location"}
        </p>
        <p className="text-[10px] text-foreground/40">
          Buyers will see distance from you
        </p>
      </div>
    </button>
  );
};

const Field = ({ label, children, hint, error, htmlFor }) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold text-foreground/55 uppercase tracking-wide cursor-pointer"
    >
      {label}
    </label>
    {children}
    {hint && !error && <p className="text-[11px] text-foreground/35">{hint}</p>}
    {error && <p className="text-[11px] text-red-500">{error}</p>}
  </div>
);

const compressToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX) {
        height = Math.round((height * MAX) / width);
        width = MAX;
      }
      if (height > MAX) {
        width = Math.round((width * MAX) / height);
        height = MAX;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });

// ── Listing Modal ─────────────────────────────────────────────────────────────
const ListingModal = ({
  onClose,
  onSaved,
  existing = null,
  sellerProfile,
  currentUserUid,
}) => {
  const mainFileRef = useRef();
  const thumbFileRef = useRef();

  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    price: existing?.price || "",
    category: existing?.category || "",
    condition: existing?.condition || CONDITIONS[0],
    available: existing?.available ?? true,
  });
  const [gpsCoords, setGpsCoords] = useState(
    existing?.lat ? { lat: existing.lat, lng: existing.lng } : null,
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(
    existing?.imageUrl || null,
  );
  const [additionalImages, setAdditionalImages] = useState(
    existing?.additionalImages || [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setError("Could not get location.");
        setGpsLoading(false);
      },
      { timeout: 8000 },
    );
  };

  const handleMainImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }
    setMainImageFile(file);
    setMainImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const handleAdditionalImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 3 - additionalImages.length;
    const toProcess = files.slice(0, remaining);
    const newImages = [];
    for (const file of toProcess) {
      if (file.size > 10 * 1024 * 1024) continue;
      newImages.push(URL.createObjectURL(file));
    }
    setAdditionalImages((prev) => [...prev, ...newImages]);
  };

  const removeAdditionalImage = (idx) =>
    setAdditionalImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) {
      setError("Enter a valid price.");
      return;
    }
    if (!form.category.trim()) {
      setError("Please enter a category for your item.");
      return;
    }
    if (!gpsCoords) {
      setError(
        "Please share your location so buyers can see how far away your item is.",
      );
      return;
    }
    if (!existing && !mainImageFile) {
      setError("Please upload a product image.");
      return;
    }

    const uid =
      currentUserUid || sellerProfile?.uid || sellerProfile?.id || null;
    if (!uid) {
      setError(
        "Session error: could not get your user ID. Please log out and back in.",
      );
      return;
    }

    setSaving(true);
    try {
      let imageUrl = existing?.imageUrl || "";
      if (mainImageFile) imageUrl = await compressToBase64(mainImageFile);

      const compressedAdditional = [];
      for (const img of additionalImages) {
        if (img.startsWith("blob:")) {
          try {
            const resp = await fetch(img);
            const blob = await resp.blob();
            const file = new File([blob], "thumb.jpg", { type: blob.type });
            compressedAdditional.push(await compressToBase64(file));
          } catch {
            /* skip */
          }
        } else {
          compressedAdditional.push(img);
        }
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        condition: form.condition,
        available: Boolean(form.available),
        imageUrl,
        additionalImages: compressedAdditional,
        sellerName: sellerProfile?.name || "",
        sellerContact: sellerProfile?.phone || sellerProfile?.whatsapp || "",
        sellerUid: uid,
        ...(gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng } : {}),
        updatedAt: serverTimestamp(),
      };

      if (existing) {
        await updateDoc(doc(db, "listings", existing.id), payload);
      } else {
        await addDoc(collection(db, "listings"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      if (err.code === "permission-denied")
        setError("Permission denied — check your Firestore rules.");
      else if (err.code === "resource-exhausted")
        setError("Database busy. Please wait a moment and try again.");
      else setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all";
  const selectCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/60 transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">
            {existing ? "Edit listing" : "Add new listing"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground hover:bg-border/50 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-sm font-medium">
              {error}
            </div>
          )}

          <Field label="Main product image" htmlFor="listing-image">
            <div
              onClick={() => mainFileRef.current?.click()}
              className="relative h-40 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer overflow-hidden transition-colors flex items-center justify-center bg-background"
            >
              {mainImagePreview ? (
                <img
                  src={mainImagePreview}
                  alt="preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-foreground/30">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15 -5 -5L5 21" />
                  </svg>
                  <span className="text-xs font-medium">
                    Click to upload main photo
                  </span>
                  <span className="text-[10px] text-foreground/20">
                    JPG, PNG, WEBP · Any size (auto-compressed)
                  </span>
                </div>
              )}
              {mainImagePreview && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <span className="text-white text-xs font-semibold bg-black/50 px-3 py-1.5 rounded-lg">
                    Change photo
                  </span>
                </div>
              )}
            </div>
            <input
              id="listing-image"
              ref={mainFileRef}
              type="file"
              accept="image/*"
              onChange={handleMainImage}
              className="hidden"
            />
          </Field>

          <Field label={`Additional photos (${additionalImages.length}/3)`}>
            <div className="flex gap-2 flex-wrap">
              {additionalImages.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group"
                >
                  <img
                    src={src}
                    alt={`thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {additionalImages.length < 3 && (
                <div
                  onClick={() => thumbFileRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-1 text-foreground/30 hover:text-primary transition-colors"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[9px] font-medium text-center leading-tight">
                    Add thumb
                  </span>
                </div>
              )}
            </div>
            <input
              ref={thumbFileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAdditionalImages}
              className="hidden"
            />
            <p className="text-[11px] text-foreground/35">
              Up to 3 additional product photos shown as thumbnails
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Product name" htmlFor="listing-name">
              <input
                id="listing-name"
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Dell Laptop"
              />
            </Field>
            <Field label="Price (₦)" htmlFor="listing-price">
              <input
                id="listing-price"
                className={inputCls}
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="5000"
                min="0"
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="listing-desc">
            <textarea
              id="listing-desc"
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the item — condition, specs, reason for selling…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="listing-cat">
              <input
                id="listing-cat"
                type="text"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Electronics, Furniture, Sports"
                className={inputCls}
              />
            </Field>
            <Field label="Condition" htmlFor="listing-cond">
              <select
                id="listing-cond"
                className={selectCls}
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Your location (required for buyer distance)"
            hint="This will show buyers how far away your item is."
          >
            <LocationPicker
              coords={gpsCoords}
              onCapture={captureLocation}
              loading={gpsLoading}
              onClear={() => setGpsCoords(null)}
              allowClear={false}
            />
          </Field>

          <Field label="Availability">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("available", !form.available)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.available ? "bg-primary" : "bg-border"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.available ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
              <span className="text-sm text-foreground/70">
                {form.available ? "Available for sale" : "Mark as sold"}
              </span>
            </div>
          </Field>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 main-button py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && (
              <svg
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1 -6.219 -8.56" />
              </svg>
            )}
            {saving
              ? existing
                ? "Saving…"
                : "Adding…"
              : existing
                ? "Save changes"
                : "Add listing"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete Modal ──────────────────────────────────────────────────────────────
const DeleteModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-500"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V6m3 0V4a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </div>
      <p className="text-base font-bold text-foreground mb-2">
        Delete listing?
      </p>
      <p className="text-sm text-foreground/50 mb-6">
        This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground/70 hover:text-foreground transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, accent, sub }) => (
  <div
    className={`rounded-2xl px-5 py-5 flex flex-col gap-3 relative overflow-hidden ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}
    style={{ border: accent ? "none" : "1.5px solid hsl(var(--border))" }}
  >
    {accent && (
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(circle at top right, white, transparent 60%)",
        }}
      />
    )}
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-white/20" : "bg-primary/10 text-primary"}`}
    >
      {icon}
    </div>
    <div>
      <p
        className={`text-2xl font-black ${accent ? "text-white" : "text-foreground"}`}
      >
        {value}
      </p>
      <p
        className={`text-xs mt-0.5 ${accent ? "text-white/70" : "text-foreground/50"}`}
      >
        {label}
      </p>
      {sub && (
        <p
          className={`text-[11px] mt-0.5 ${accent ? "text-white/50" : "text-foreground/35"}`}
        >
          {sub}
        </p>
      )}
    </div>
  </div>
);

// ── Item Card ─────────────────────────────────────────────────────────────────
const ItemCard = ({ listing, onEdit, onDelete, showActions = true }) => (
  <div
    className="bg-card rounded-2xl overflow-hidden group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
    style={{ border: "1.5px solid hsl(var(--border))" }}
  >
    <div className="aspect-[4/3] relative overflow-hidden bg-border/20">
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt={listing.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-foreground/15 text-xs">
          No image
        </div>
      )}
      <div className="absolute top-2 left-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 ${listing.available ? "bg-green-500 text-white" : "bg-foreground/20 text-foreground/60"}`}
        >
          {listing.available ? "Live" : "Sold"}
        </span>
      </div>
      {showActions && (onEdit || onDelete) && (
        <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-1.5 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(listing);
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0 -2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1 -4 9.5 -9.5z" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(listing.id);
              }}
              className="flex items-center justify-center w-8 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1 -2 2H7a2 2 0 0 1 -2 -2V6m3 0V4a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
    <div className="p-3">
      <p className="text-sm font-bold text-foreground truncate">
        {listing.name}
      </p>
      <p className="text-xs text-foreground/40 truncate mt-0.5">
        {listing.category} · {listing.condition}
      </p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm font-black text-primary">
          ₦{Number(listing.price).toLocaleString()}
        </p>
        {listing.lat && (
          <span className="text-[10px] text-blue-500 flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6 -8 12 -8 12s-8 -6 -8 -12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            GPS
          </span>
        )}
      </div>
    </div>
  </div>
);

// ── Empty State ───────────────────────────────────────────────────────────────
const Empty = ({ msg, cta, ctaAction }) => (
  <div className="py-20 flex flex-col items-center gap-4 text-center">
    <div
      className="w-16 h-16 rounded-2xl bg-primary/6 flex items-center justify-center"
      style={{ border: "2px dashed hsl(var(--primary)/0.2)" }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary/30"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    </div>
    <p className="text-sm font-semibold text-foreground/50">{msg}</p>
    {cta && (
      <button
        onClick={ctaAction}
        className="main-button text-sm px-5 py-2.5 font-semibold"
      >
        {cta}
      </button>
    )}
  </div>
);

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ total, perPage, current, onChange }) => {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="w-8 h-8 rounded-lg border border-border text-foreground/60 hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="m15 18 -6 -6 6 -6" />
        </svg>
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${current === p ? "bg-primary text-primary-foreground" : "border border-border text-foreground/60 hover:text-primary hover:border-primary/40"}`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === pages}
        className="w-8 h-8 rounded-lg border border-border text-foreground/60 hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="m9 18 6 -6 -6 -6" />
        </svg>
      </button>
    </div>
  );
};

// ── Overview Panel ────────────────────────────────────────────────────────────
const OverviewPanel = ({ profile, listings, setTab, onAddNew }) => {
  const active = listings.filter((l) => l.available).length;
  const sold = listings.filter((l) => !l.available).length;
  const earned = listings
    .filter((l) => !l.available)
    .reduce((s, l) => s + Number(l.price || 0), 0);
  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? "there";
  const DASHBOARD_PREVIEW_COUNT = 3;
  const previewItems = listings.slice(0, DASHBOARD_PREVIEW_COUNT);

  return (
    <div className="space-y-6">
      <div
        className="relative rounded-3xl overflow-hidden px-6 py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(circle at 80% 50%, white, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium mb-1">Welcome back</p>
          <p className="text-2xl font-black text-white">{firstName}</p>
          <p className="text-white/60 text-sm mt-1">
            Here&apos;s your seller activity at a glance.
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="relative z-10 flex items-center justify-center gap-2 bg-white text-primary font-bold text-sm px-5 py-2.5 rounded-2xl hover:bg-white/90 transition-colors whitespace-nowrap self-center sm:self-auto shadow-lg"
        >
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add new item
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total items"
          value={listings.length}
          icon={NAV_ITEMS[2].icon}
        />
        <StatCard
          label="Currently live"
          value={active}
          sub="visible in Browse"
          icon={NAV_ITEMS[0].icon}
        />
        <StatCard label="Items sold" value={sold} icon={NAV_ITEMS[3].icon} />
        <StatCard
          label="Est. earned"
          value={`₦${earned.toLocaleString()}`}
          icon={NAV_ITEMS[4].icon}
          accent
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "View your items",
            desc: "See & manage all your listings",
            tab: "listings",
            emoji: "",
          },
          {
            label: "Check orders",
            desc: "See who wants your items",
            tab: "orders",
            emoji: "",
          },
          {
            label: "Earn rewards",
            desc: "Points & referral bonuses",
            tab: "rewards",
            emoji: "",
          },
        ].map((a) => (
          <button
            key={a.tab}
            onClick={() => setTab(a.tab)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            style={{ border: "1.5px solid hsl(var(--border))" }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-lg shrink-0">
              {a.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{a.label}</p>
              <p className="text-xs text-foreground/45 truncate">{a.desc}</p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground/25 shrink-0"
            >
              <path d="m9 18 6 -6 -6 -6" />
            </svg>
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-foreground">Your recent items</p>
          {listings.length > DASHBOARD_PREVIEW_COUNT && (
            <button
              onClick={() => setTab("listings")}
              className="text-xs text-primary font-semibold hover:underline underline-offset-4 shrink-0"
            >
              See all ({listings.length}) →
            </button>
          )}
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {previewItems.map((l) => (
              <ItemCard
                key={l.id}
                listing={l}
                onEdit={null}
                onDelete={null}
                showActions={false}
              />
            ))}
          </div>
        ) : (
          <Empty
            msg="No items yet. Add your first product to get started."
            cta="Add your first item"
            ctaAction={onAddNew}
          />
        )}
      </div>
    </div>
  );
};

// ── Items Panel ───────────────────────────────────────────────────────────────
const ItemsPanel = ({ listings, onAddNew, onEdit, onDelete }) => {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  const paginated = listings.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black text-foreground">My Items</p>
          <p className="text-xs text-foreground/40 mt-0.5">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} · click
            Edit to modify
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="main-button text-sm px-5 py-2.5 flex items-center gap-2"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add item
        </button>
      </div>
      {listings.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginated.map((l) => (
              <ItemCard
                key={l.id}
                listing={l}
                onEdit={onEdit}
                onDelete={onDelete}
                showActions={true}
              />
            ))}
          </div>
          <Pagination
            total={listings.length}
            perPage={ITEMS_PER_PAGE}
            current={page}
            onChange={setPage}
          />
        </>
      ) : (
        <Empty
          msg="No items yet. Start by adding your first listing."
          cta="Add your first item"
          ctaAction={onAddNew}
        />
      )}
    </div>
  );
};

// ── Orders Panel ──────────────────────────────────────────────────────────────
const ORDER_TABS = [
  "All",
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const OrdersPanel = () => {
  const [activeTab, setActiveTab] = useState("All");
  return (
    <div className="space-y-5">
      <div>
        <p className="text-2xl font-black text-foreground">Orders Received</p>
        <p className="text-xs text-foreground/40 mt-0.5">
          All incoming orders from buyers
        </p>
      </div>
      <div className="relative border-b border-border">
        <div
          className="flex gap-1 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {ORDER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`relative px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0 focus:outline-none rounded-t-lg ${activeTab === t ? "text-primary bg-primary/5" : "text-foreground/45 hover:text-foreground/70 hover:bg-border/20"}`}
            >
              {t}
              {activeTab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
      <Empty msg="No orders yet. When buyers place orders, they'll appear here." />
    </div>
  );
};

// ── Rewards Panel ─────────────────────────────────────────────────────────────
const RewardsPanel = ({ profile }) => {
  const pts = profile?.rewards ?? 0;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-2xl font-black text-foreground">My Points</p>
        <p className="text-sm text-foreground/50 mt-0.5">
          Hello {profile?.name?.trim().split(/\s+/)[0]}
        </p>
      </div>
      <div
        className="relative rounded-3xl overflow-hidden px-6 py-7 flex items-center gap-5"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "radial-gradient(circle at 80% 50%, white, transparent 60%)",
          }}
        />
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="relative z-10">
          <p className="text-4xl font-black text-white">{pts}</p>
          <p className="text-white/60 text-sm">reward points</p>
        </div>
        <button className="relative z-10 ml-auto bg-white text-primary font-bold text-sm px-5 py-2.5 rounded-2xl hover:bg-white/90 transition-colors shadow-lg">
          Redeem
        </button>
      </div>
      <div>
        <p className="text-sm font-bold text-foreground mb-3">
          How to Earn Points
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: "Refer a seller",
              desc: "Invite friends to sell on Declutt.",
              emoji: "",
            },
            {
              title: "Close your first sale",
              desc: "Earn points on first successful sale.",
              emoji: "",
            },
            {
              title: "Write a review",
              desc: "Get rewarded for sharing feedback.",
              emoji: "",
            },
            {
              title: "Special events",
              desc: "Earn double points during promos.",
              emoji: "",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="flex items-start gap-3 p-4 rounded-2xl bg-card"
              style={{ border: "1.5px solid hsl(var(--border))" }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-lg shrink-0 mt-0.5">
                {r.emoji}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {r.title}
                </p>
                <p className="text-xs text-foreground/50 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Referrals Panel ───────────────────────────────────────────────────────────
const ReferralsPanel = ({ profile }) => {
  const [copied, setCopied] = useState(false);
  const code = profile?.referralCode ?? "—";
  const link = `${window.location.origin}/signup?ref=${code}`;
  const copy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="space-y-5">
      <div>
        <p className="text-2xl font-black text-foreground">Refer &amp; Earn</p>
        <p className="text-sm text-foreground/50 mt-0.5">
          Invite friends, earn rewards together
        </p>
      </div>
      <div
        className="p-5 rounded-2xl bg-card space-y-4"
        style={{ border: "1.5px solid hsl(var(--border))" }}
      >
        <p className="text-sm text-foreground/60">
          Invite friends to sell on Declutt. When they sign up with your link,
          you both earn reward points.
        </p>
        <div>
          <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-2">
            Your referral code
          </p>
          <div className="flex gap-2">
            <span
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono text-foreground/70 truncate bg-background"
              style={{ border: "1.5px solid hsl(var(--border))" }}
            >
              {code}
            </span>
            <button
              onClick={copy}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${copied ? "bg-green-500 text-white" : "main-button"}`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Nigerian States ───────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT – Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

// ── Profile Panel — CENTERED ──────────────────────────────────────────────────
const ProfilePanel = ({ profile }) => {
  const photoRef = useRef();
  const [photoPreview, setPhotoPreview] = useState(profile?.photoURL || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [form, setForm] = useState({
    phone: profile?.phone || "",
    whatsapp: profile?.whatsapp || "",
    state: profile?.state || "",
    address: profile?.address || "",
    nin: profile?.nin || "",
    bvn: profile?.bvn || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    setUploading(true);
    try {
      const base64 = await compressToBase64(photoFile);
      await updateDoc(doc(db, "users", profile.uid), { photoURL: base64 });
      setUploadDone(true);
      setTimeout(() => setUploadDone(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      setPhotoFile(null);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.phone.match(/^(\+?234|0)[789][01]\d{8}$/))
      e.phone = "Enter a valid Nigerian phone number";
    if (form.whatsapp && !form.whatsapp.match(/^(\+?234|0)[789][01]\d{8}$/))
      e.whatsapp = "Enter a valid WhatsApp number";
    if (!form.state) e.state = "Please select your state";
    if (!form.address.trim() || form.address.trim().length < 10)
      e.address = "Enter your full address (at least 10 characters)";
    if (form.nin && !form.nin.match(/^\d{11}$/))
      e.nin = "NIN must be exactly 11 digits";
    if (form.bvn && !form.bvn.match(/^\d{11}$/))
      e.bvn = "BVN must be exactly 11 digits";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        ...form,
        verifiedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all";

  const PField = ({ label, error, children, hint, htmlFor }) => (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-bold text-foreground/55 uppercase tracking-wide"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-foreground/35">{hint}</p>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );

  const initials = getInitials(profile?.name);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <p className="text-2xl font-black text-foreground">My Profile</p>
          <p className="text-sm text-foreground/50 mt-0.5">
            Keep your info up to date so buyers can reach you.
          </p>
        </div>

        <div
          className="p-5 rounded-2xl bg-card space-y-4"
          style={{ border: "1.5px solid hsl(var(--border))" }}
        >
          <p className="text-sm font-bold text-foreground text-center">
            Profile Photo
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/15 text-primary flex items-center justify-center text-2xl font-black border-2 border-primary/25">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => photoRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-foreground/50">
                JPG, PNG, WEBP · Any size
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => photoRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-foreground/70 hover:text-foreground transition-all"
                  style={{ border: "1.5px solid hsl(var(--border))" }}
                >
                  Choose photo
                </button>
                {photoFile && (
                  <button
                    onClick={uploadPhoto}
                    disabled={uploading}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${uploadDone ? "bg-green-500 text-white" : "main-button"}`}
                  >
                    {uploading && (
                      <svg
                        className="animate-spin"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 12a9 9 0 1 1 -6.219 -8.56" />
                      </svg>
                    )}
                    {uploadDone
                      ? "Saved!"
                      : uploading
                        ? "Uploading…"
                        : "Save photo"}
                  </button>
                )}
              </div>
            </div>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
          />
        </div>

        <div
          className="p-5 rounded-2xl bg-card space-y-4"
          style={{ border: "1.5px solid hsl(var(--border))" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-foreground">
              Seller Verification
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/25">
              Required
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PField
              label="Phone number"
              error={errors.phone}
              hint="e.g. 08012345678"
              htmlFor="prof-phone"
            >
              <input
                id="prof-phone"
                className={`${inputCls} ${errors.phone ? "border-red-500/60" : "border-border"}`}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="08012345678"
                type="tel"
              />
            </PField>
            <PField
              label="WhatsApp number"
              error={errors.whatsapp}
              hint="Leave blank if same as phone"
              htmlFor="prof-wa"
            >
              <input
                id="prof-wa"
                className={`${inputCls} ${errors.whatsapp ? "border-red-500/60" : "border-border"}`}
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="08012345678 (optional)"
                type="tel"
              />
            </PField>
            <PField
              label="State of residence"
              error={errors.state}
              htmlFor="prof-state"
            >
              <select
                id="prof-state"
                className={`${inputCls} ${errors.state ? "border-red-500/60" : "border-border"}`}
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              >
                <option value="">Select state…</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </PField>
            <PField
              label="Full address"
              error={errors.address}
              hint="Street, area, city"
              htmlFor="prof-addr"
            >
              <input
                id="prof-addr"
                className={`${inputCls} ${errors.address ? "border-red-500/60" : "border-border"}`}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="12 Akin Street, Ile-Ife"
              />
            </PField>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs font-bold text-foreground/50 uppercase tracking-wide mb-3">
              Identity verification{" "}
              <span className="text-foreground/30 normal-case font-normal">
                (optional but recommended)
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PField
                label="NIN"
                error={errors.nin}
                hint="11-digit number on your NIN slip"
                htmlFor="prof-nin"
              >
                <input
                  id="prof-nin"
                  className={`${inputCls} ${errors.nin ? "border-red-500/60" : "border-border"}`}
                  value={form.nin}
                  onChange={(e) =>
                    set("nin", e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="12345678901"
                  maxLength={11}
                />
              </PField>
              <PField
                label="BVN"
                error={errors.bvn}
                hint="11-digit number from your bank"
                htmlFor="prof-bvn"
              >
                <input
                  id="prof-bvn"
                  className={`${inputCls} ${errors.bvn ? "border-red-500/60" : "border-border"}`}
                  value={form.bvn}
                  onChange={(e) =>
                    set("bvn", e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="12345678901"
                  maxLength={11}
                />
              </PField>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`main-button px-10 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${saved ? "!bg-green-500" : ""}`}
            >
              {saving && (
                <svg
                  className="animate-spin"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1 -6.219 -8.56" />
                </svg>
              )}
              {saved && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {saving ? "Saving…" : saved ? "Saved!" : "Save profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Messages Panel ────────────────────────────────────────────────────────────
const MessagesPanel = ({ sellerUid }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [isWideScreen, setIsWideScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 640 : false,
  );
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [viewedAt, setViewedAt] = useState({}); // threadKey → Date
  const bottomRef = useRef();
  const chatAreaRef = useRef(null);
  const prevMessagesLength = useRef(0);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const updateScreen = () => setIsWideScreen(mediaQuery.matches);
    updateScreen();
    mediaQuery.addEventListener("change", updateScreen);
    return () => mediaQuery.removeEventListener("change", updateScreen);
  }, []);

  useEffect(() => {
    if (isWideScreen) setMobileChatOpen(false);
  }, [isWideScreen]);

  useEffect(() => {
    if (!active) return;
    if (!isWideScreen) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = 0;
      }
    }
  }, [active, isWideScreen]);

  useEffect(() => {
    if (!sellerUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "messages"),
      where("sellerUid", "==", sellerUid),
      orderBy("createdAt", "desc"),
      limit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const grouped = {};
        msgs.forEach((m) => {
          const key = `${m.listingId}_${m.buyerUid}`;
          if (!grouped[key]) {
            grouped[key] = {
              key,
              listingName: m.listingName || "Unknown item",
              listingImage: m.listingImageUrl || "",
              buyerName: m.buyerName || "Buyer",
              buyerUid: m.buyerUid,
              listingId: m.listingId,
              messages: [],
              lastText: "",
              unread: 0,
              lastAt: m.createdAt,
            };
          }
          grouped[key].messages.unshift(m);
          grouped[key].lastText = m.text || "";
          if (m.from === "buyer" && !m.read) grouped[key].unread++;
        });

        const threadList = Object.values(grouped).sort(
          (a, b) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0),
        );
        setThreads(threadList);
        setLoading(false);

        if (!active && threadList.length > 0) {
          setActive(threadList[0]);
          setMessages(threadList[0].messages);
          isInitialLoad.current = true;
          return;
        }

        if (active) {
          const updated = threadList.find((t) => t.key === active.key);
          if (updated) {
            setMessages(updated.messages);
            setActive(updated);
          }
        }
      },
      (err) => {
        console.error("Messages listener error:", err);
        if (err.code === "permission-denied")
          setError(
            "Permission denied. Check Firestore rules for messages collection.",
          );
        else if (err.code === "resource-exhausted") {
          setError("Database busy. Retrying...");
          setTimeout(() => setError(null), 3000);
        } else setError(`Error loading messages: ${err.message}`);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [sellerUid]);

  // ── Smart auto-scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!messages.length) return;

    if (isInitialLoad.current) {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = 0;
      }
      isInitialLoad.current = false;
      prevMessagesLength.current = messages.length;
      return;
    }

    if (messages.length > prevMessagesLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevMessagesLength.current = messages.length;
  }, [messages]);

  // ── Mark messages as read ───────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const markRead = async () => {
      try {
        const q = query(
          collection(db, "messages"),
          where("listingId", "==", active.listingId),
          where("buyerUid", "==", active.buyerUid),
          where("from", "==", "buyer"),
          where("read", "==", false),
        );
        const snap = await getDocs(q);
        if (cancelled || snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
        await batch.commit();
      } catch (e) {
        console.error("Error marking messages read:", e);
      }
    };

    markRead();
    return () => {
      cancelled = true;
    };
  }, [active]);

  // ── Smart unread count ──────────────────────────────────────────────────────
  const getUnread = (thread) => {
    if (active?.key === thread.key) return 0;
    const lastViewed = viewedAt[thread.key];
    if (!lastViewed) return thread.unread;
    return thread.messages.filter(
      (m) =>
        m.from === "buyer" && !m.read && m.createdAt?.toDate() > lastViewed,
    ).length;
  };

  const openThread = (thread) => {
    setActive(thread);
    setMessages(thread.messages);
    if (!isWideScreen) setMobileChatOpen(true);
    isInitialLoad.current = true;
    setViewedAt((prev) => ({ ...prev, [thread.key]: new Date() }));
  };

  const sendReply = async () => {
    if (!reply.trim() || !active || sending) return;
    setSending(true);
    const txt = reply.trim();
    setReply("");
    try {
      await addDoc(collection(db, "messages"), {
        listingId: active.listingId,
        sellerUid,
        buyerUid: active.buyerUid,
        buyerName: active.buyerName,
        listingName: active.listingName,
        text: txt,
        from: "seller",
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      console.error(e);
      setError("Failed to send message. Please try again.");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xl font-black text-foreground">Messages</p>
          <p className="text-xs text-foreground/40 mt-0.5">
            Real-time conversations from buyers
          </p>
        </div>
        <div className="flex justify-center py-20 text-foreground/40">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1 -6.219 -8.56" />
            </svg>
            <span className="text-sm">Loading conversations…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Desktop header only (hidden on mobile chat view) ── */}
      <div
        className={`${!isWideScreen && mobileChatOpen ? "hidden sm:block" : "block"}`}
      >
        <p className="text-2xl font-black text-foreground">Messages</p>
        <p className="text-xs text-foreground/40 mt-0.5">
          Real-time conversations from buyers
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-sm">
          {error}
        </div>
      )}

      {threads.length === 0 ? (
        <Empty msg="No messages yet. When buyers contact you, they'll appear here." />
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-0 sm:gap-4 -mx-4 sm:mx-0"
          style={{ minHeight: "calc(100dvh - 220px)" }}
        >
          {/* ── Thread sidebar ── */}
          <div
            className={`flex flex-col gap-1 overflow-y-auto rounded-none sm:rounded-2xl bg-card ${mobileChatOpen ? "hidden" : "block"} sm:block`}
            style={{
              border: "none",
              padding: "8px 0",
              minHeight: "100%",
              maxHeight: "none",
            }}
          >
            {threads.map((t) => {
              const isActive = active?.key === t.key;
              const unreadCount = getUnread(t);
              return (
                <button
                  key={t.key}
                  onClick={() => openThread(t)}
                  className={`flex items-start gap-3 p-3 px-4 sm:px-3 rounded-none sm:rounded-xl text-left transition-all ${isActive ? "bg-primary/10 border border-primary/25" : "hover:bg-border/30 border border-transparent"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-black shrink-0 border-2 border-primary/20">
                    {(t.buyerName?.[0] || "B").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground truncate">
                        {t.buyerName}
                      </p>
                      {unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 ml-1">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-foreground/40 truncate">
                      {t.listingName}
                    </p>
                    <p className="text-[10px] truncate mt-0.5 text-foreground/50">
                      {t.lastText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Chat panel ── */}
          {active ? (
            <div
              className={`flex flex-col rounded-none sm:rounded-2xl overflow-hidden bg-card flex-1 ${isWideScreen || mobileChatOpen ? "block" : "hidden"}`}
              style={{
                border: isWideScreen
                  ? "1.5px solid hsl(var(--border))"
                  : "none",
                minHeight: 0,
              }}
            >
              {/* ── Chat header: Back arrow + Profile (mobile) / Profile only (desktop) ── */}
              <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border bg-background/95 backdrop-blur-sm shadow-sm shrink-0">
                {/* Back arrow — mobile only */}
                {!isWideScreen && (
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-border/50 transition-colors shrink-0"
                    aria-label="Back to conversations"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18 -6 -6 6 -6" />
                    </svg>
                  </button>
                )}

                {/* Avatar — centered on mobile via mx-auto, normal on desktop */}
                <div className="sm:mx-0 mx-auto w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-black border-2 border-primary/20 shrink-0">
                  {(active.buyerName?.[0] || "B").toUpperCase()}
                </div>

                {/* Name + listing — right side */}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {active.buyerName}
                  </p>
                  <p className="text-xs text-foreground/50 truncate">
                    {active.listingName}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={chatAreaRef}
                className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background/30"
                style={{ minHeight: 0 }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.from === "seller" ? "justify-end" : "justify-start"}`}
                  >
                    {m.from === "buyer" && (
                      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center text-[9px] font-black shrink-0 mr-2 mt-1">
                        {(active.buyerName?.[0] || "B").toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`max-w-[95%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.from === "seller" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-foreground rounded-bl-sm border border-border"}`}
                    >
                      <p>{m.text}</p>
                      <p
                        className={`text-[10px] mt-1 ${m.from === "seller" ? "text-primary-foreground/55 text-right" : "text-foreground/35"}`}
                      >
                        {m.createdAt?.toDate
                          ? new Date(m.createdAt.toDate()).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "just now"}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              <div className="relative flex gap-2 py-3 px-4 border-t border-border shrink-0 bg-background z-10">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendReply()
                  }
                  placeholder="Type a reply…"
                  className="relative z-10 flex-1 px-4 py-2.5 rounded-xl text-sm bg-background border border-border focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/30"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  {sending ? (
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1 -6.219 -8.56" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m22 2 -7 20 -4 -9 -9 -4Z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center text-foreground/30 text-sm rounded-2xl bg-card"
              style={{
                border: "1.5px dashed hsl(var(--border))",
                minHeight: "400px",
              }}
            >
              <div className="text-center space-y-2">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mx-auto text-foreground/15"
                >
                  <path d="M21 15a2 2 0 0 1 -2 2H7l-4 4V5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main SellerDashboard ──────────────────────────────────────────────────────
const SellerDashboard = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState("overview");
  const [listings, setListings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [messageCount, setMessageCount] = useState(0);
  const { state: logoutState, handleLogout } = useLogout(logout, navigate);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get("tab");
    if (p && NAV_ITEMS.find((n) => n.id === p)) setTab(p);
  }, [location.search]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [tab]);

  useEffect(() => {
    if (!user?.uid) {
      setMessageCount(0);
      return;
    }

    const messagesQuery = query(
      collection(db, "messages"),
      where("sellerUid", "==", user.uid),
      where("from", "==", "buyer"),
      where("read", "==", false),
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snap) => {
        setMessageCount(snap.size);
      },
      (err) => {
        console.error("Unread message badge listener error:", err);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const fetchListings = async () => {
    if (!user) return;
    const uid = user.uid;
    try {
      const snap = await getDocs(
        query(
          collection(db, "listings"),
          where("sellerUid", "==", uid),
          orderBy("createdAt", "desc"),
        ),
      );
      let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (results.length === 0 && profile?.name) {
        const snap2 = await getDocs(
          query(
            collection(db, "listings"),
            where("sellerName", "==", profile.name),
          ),
        );
        results = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      results.sort(
        (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
      );
      setListings(results);
    } catch (err) {
      console.error("fetchListings:", err);
      if (err.code === "resource-exhausted")
        setTimeout(() => fetchListings(), 5000);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [user, profile]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, "listings", deleteConfirm));
      setDeleteConfirm(null);
      fetchListings();
    } catch (err) {
      console.error("Delete error:", err);
      if (err.code === "permission-denied")
        alert("Permission denied. Cannot delete this item.");
    }
  };

  const openAdd = () => {
    setEditTarget(null);
    setShowModal(true);
  };
  const openEdit = (l) => {
    setEditTarget(l);
    setShowModal(true);
  };
  const initials = getInitials(profile?.name);
  const displayName = formatDisplayName(profile?.name);

  return (
    <div
      className="flex-1 min-h-screen bg-background flex flex-col"
      style={{ paddingTop: `${NAVBAR_H}px` }}
    >
      <div className="flex flex-1 min-h-screen items-stretch">
        {/* ── Desktop Sidebar — full height, scrolls with page (NOT sticky) ── */}
        <aside
          className="hidden md:flex md:flex-col w-64 xl:w-72 shrink-0 bg-card"
          style={{
            minHeight: "100vh",
            height: "auto",
            overflowY: "auto",
            borderRight: "1px solid hsl(var(--border)/0.35)",
            alignSelf: "stretch",
          }}
        >
          {/* Nav items */}
          <div className="px-4 pt-5 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/35">
              Menu
            </p>
          </div>
          <nav className="flex-1 px-3 pt-2 space-y-3 pb-4 mb-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-left transition-all duration-150 ${tab === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:text-foreground hover:bg-border/40"}`}
              >
                <span className={tab === item.id ? "opacity-90" : "opacity-70"}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.id === "messages" && messageCount > 0 && (
                  <span className="min-w-[24px] h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center px-2">
                    {messageCount > 9 ? "9+" : messageCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div
            className="shrink-0 px-3 pb-5 space-y-2 mt-auto"
            style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}
          >
            <div className="flex items-center gap-3 px-3 py-3 mt-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/15 text-primary flex items-center justify-center text-sm font-black border-2 border-primary/20 shrink-0">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-foreground/40 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
            <LogoutButton onLogout={handleLogout} state={logoutState} />
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl w-full mx-auto h-full">
            {tab === "overview" && (
              <OverviewPanel
                profile={profile}
                listings={listings}
                setTab={setTab}
                onAddNew={openAdd}
              />
            )}
            {tab === "listings" && (
              <ItemsPanel
                listings={listings}
                onAddNew={openAdd}
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
              />
            )}
            {tab === "orders" && <OrdersPanel />}
            {tab === "rewards" && <RewardsPanel profile={profile} />}
            {tab === "referrals" && <ReferralsPanel profile={profile} />}
            {tab === "profile" && <ProfilePanel profile={profile} />}
            {tab === "messages" && <MessagesPanel sellerUid={user?.uid} />}
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <ListingModal
          existing={editTarget}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
          onSaved={fetchListings}
          sellerProfile={profile}
          currentUserUid={user?.uid}
        />
      )}
      {deleteConfirm && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default SellerDashboard;
