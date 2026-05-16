import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../context/AuthContext";

// ── Tiny helpers ────────────────────────────────────────────────────────────
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
const LOCATIONS = [
  "OAU Campus",
  "Ile-Ife Town",
  "Lagere",
  "Mayfair",
  "Obafemi Awolowo Way",
  "Moore Plantation",
  "Parakin",
  "Ede Road",
  "Other",
];
const CONDITIONS = ["Brand new", "Like new", "Good", "Fair", "For parts"];

const Spinner = () => (
  <svg
    className="animate-spin"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const Badge = ({ label, color = "primary" }) => (
  <span
    className={`inline-block text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-${color}/10 text-${color} border border-${color}/20`}
  >
    {label}
  </span>
);

// ── Add / Edit Listing Modal ─────────────────────────────────────────────────
const ListingModal = ({ onClose, onSaved, existing = null }) => {
  const fileRef = useRef();
  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    price: existing?.price || "",
    category: existing?.category || CATEGORIES[0],
    condition: existing?.condition || CONDITIONS[0],
    location: existing?.location || LOCATIONS[0],
    sellerName: existing?.sellerName || "",
    sellerContact: existing?.sellerContact || "",
    available: existing?.available ?? true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(existing?.imageUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.sellerName) {
      setError("Name, price, and seller name are required.");
      return;
    }
    if (!existing && !imageFile) {
      setError("Please upload a product image.");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = existing?.imageUrl || "";
      if (imageFile) {
        const sRef = storageRef(
          storage,
          `listings/${Date.now()}_${imageFile.name}`,
        );
        await uploadBytes(sRef, imageFile);
        imageUrl = await getDownloadURL(sRef);
      }
      const payload = {
        ...form,
        price: Number(form.price),
        imageUrl,
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
      setError("Failed to save listing. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
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

        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4"
        >
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Image upload */}
          <Field label="Product image">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer overflow-hidden transition-colors flex items-center justify-center bg-background"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
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
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <span className="text-xs font-medium">
                    Click to upload photo
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="hidden"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Product name">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Dell Laptop"
              />
            </Field>
            <Field label="Price (₦)">
              <input
                className={inputCls}
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="5000"
                min="0"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the item condition, specs, etc."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                className={selectCls}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Condition">
              <select
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

          <Field label="Location (seller's area)">
            <select
              className={selectCls}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            >
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Seller name">
              <input
                className={inputCls}
                value={form.sellerName}
                onChange={(e) => set("sellerName", e.target.value)}
                placeholder="Name"
              />
            </Field>
            <Field label="Seller contact">
              <input
                className={inputCls}
                value={form.sellerContact}
                onChange={(e) => set("sellerContact", e.target.value)}
                placeholder="08012345678"
              />
            </Field>
          </div>

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
                {form.available ? "Available" : "Sold / Unavailable"}
              </span>
            </div>
          </Field>
        </form>

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
            className="flex-1 main-button py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
          >
            {saving ? (
              <>
                <Spinner />
                {existing ? "Saving…" : "Adding…"}
              </>
            ) : existing ? (
              "Save changes"
            ) : (
              "Add listing"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Listing Row / Card ───────────────────────────────────────────────────────
const ListingRow = ({ listing, onEdit, onDelete }) => (
  <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200">
    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-border/30">
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt={listing.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">
          No img
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-semibold text-foreground truncate">
          {listing.name}
        </p>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${listing.available ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-foreground/8 text-foreground/40 border-border"}`}
        >
          {listing.available ? "Available" : "Sold"}
        </span>
      </div>
      <p className="text-xs text-foreground/50 mt-0.5 truncate">
        {listing.category} · {listing.location} · {listing.condition}
      </p>
    </div>
    <p className="text-sm font-bold text-primary shrink-0">
      ₦{Number(listing.price).toLocaleString()}
    </p>
    <div className="flex gap-1.5 shrink-0">
      <button
        onClick={() => onEdit(listing)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-foreground/50 hover:text-primary hover:border-primary/40 transition-colors"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        onClick={() => onDelete(listing.id)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-foreground/50 hover:text-red-500 hover:border-red-500/40 transition-colors"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  </div>
);

// ── Main AdminDashboard ──────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "listings", id));
    setDeleteConfirm(null);
    fetchListings();
  };

  const filtered = listings.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      l.name?.toLowerCase().includes(q) ||
      l.category?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q);
    const matchCat = filterCat === "All" || l.category === filterCat;
    return matchSearch && matchCat;
  });

  const stats = [
    { label: "Total listings", value: listings.length },
    { label: "Available", value: listings.filter((l) => l.available).length },
    { label: "Sold", value: listings.filter((l) => !l.available).length },
    {
      label: "Categories",
      value: new Set(listings.map((l) => l.category)).size,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
              <svg
                width="14"
                height="14"
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
            </div>
            <span className="text-sm font-bold text-foreground">
              Admin Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground/50 hidden sm:block">
              {profile?.name}
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="text-xs font-medium text-foreground/50 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-red-500/30"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-card border border-border rounded-xl px-4 py-4"
            >
              <p className="text-2xl font-black text-foreground">{s.value}</p>
              <p className="text-xs text-foreground/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search listings…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground/70 focus:outline-none focus:border-primary/50 transition-all"
            >
              <option>All</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setEditTarget(null);
              setShowModal(true);
            }}
            className="main-button text-sm px-5 py-2.5 flex items-center gap-2 whitespace-nowrap shrink-0"
          >
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
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add listing
          </button>
        </div>

        {/* Listings list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-foreground/40">
              <Spinner />
              <span className="text-sm">Loading listings…</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-foreground/30 text-sm">No listings found.</p>
            <button
              onClick={() => {
                setEditTarget(null);
                setShowModal(true);
              }}
              className="mt-4 text-primary text-sm font-medium hover:underline"
            >
              Add the first one →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((l) => (
              <ListingRow
                key={l.id}
                listing={l}
                onEdit={(l) => {
                  setEditTarget(l);
                  setShowModal(true);
                }}
                onDelete={(id) => setDeleteConfirm(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ListingModal
          existing={editTarget}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
          onSaved={fetchListings}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center">
            <p className="text-base font-bold text-foreground mb-2">
              Delete listing?
            </p>
            <p className="text-sm text-foreground/50 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground/70 hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
