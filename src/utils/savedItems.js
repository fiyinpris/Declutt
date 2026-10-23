import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/*
 * Saved items are stored in Firestore (collection "savedItems", doc id `${uid}_${listingId}`)
 * so they survive refreshes, logouts and device changes. localStorage
 * (`declutt_saved_<uid>`, the same key the site already used) is kept as an instant cache,
 * and the "saved-updated" window event is still fired so existing listeners keep working.
 */
const COLL = "savedItems";
const lsKey = (uid) => `declutt_saved_${uid || "guest"}`;
const remoteIds = {}; // uid -> Set of listing ids last seen in Firestore

export const getSaved = (uid) => {
  try {
    const v = JSON.parse(localStorage.getItem(lsKey(uid)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const writeLocal = (uid, items) => {
  try {
    localStorage.setItem(lsKey(uid), JSON.stringify(items));
  } catch (e) {
    console.error("saved cache error:", e);
  }
  window.dispatchEvent(new CustomEvent("saved-updated", { detail: { uid } }));
};

const slim = (l) => ({
  id: l.id,
  name: l.name || "",
  price: Number(l.price) || 0,
  imageUrl: l.imageUrl || null,
  category: l.category || "",
  sellerUid: l.sellerUid || null,
  sellerName: l.sellerName || "",
});

const ref = (uid, id) => doc(db, COLL, `${uid}_${id}`);

const pushAdd = (uid, item) => {
  if (!uid) return;
  setDoc(ref(uid, item.id), {
    ...slim(item),
    uid,
    savedAt: serverTimestamp(),
  }).catch((e) => console.error("Saved item sync failed:", e));
};

const pushRemove = (uid, id) => {
  if (!uid) return;
  deleteDoc(ref(uid, id)).catch((e) =>
    console.error("Saved item remove failed:", e),
  );
};

// Make Firestore match the local list (covers saves made by code that only touches localStorage).
const syncDiff = (uid) => {
  const r = remoteIds[uid];
  if (!uid || !r) return;
  const local = getSaved(uid);
  const ids = new Set(local.map((i) => i.id));
  local.forEach((i) => {
    if (!r.has(i.id)) pushAdd(uid, i);
  });
  r.forEach((id) => {
    if (!ids.has(id)) pushRemove(uid, id);
  });
};

const createSaveNotification = async (listing, buyerName, buyerUid) => {
  if (!listing.sellerUid) return;
  try {
    await addDoc(collection(db, "notifications"), {
      type: "saved",
      listingId: listing.id,
      listingName: listing.name,
      listingImageUrl: listing.imageUrl || null,
      listingPrice: Number(listing.price) || null,
      sellerUid: listing.sellerUid,
      sellerName: listing.sellerName || "Seller",
      buyerUid,
      buyerName: buyerName || "Buyer",
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Notification creation error:", e);
  }
};

/** Toggle save. Returns true if the item is now saved. */
export const toggleSaved = (uid, listing, buyerName) => {
  const saved = getSaved(uid);
  if (saved.some((i) => i.id === listing.id)) {
    writeLocal(
      uid,
      saved.filter((i) => i.id !== listing.id),
    );
    pushRemove(uid, listing.id);
    return false;
  }
  const item = slim(listing);
  writeLocal(uid, [...saved, item]);
  pushAdd(uid, item);
  if (uid) createSaveNotification(listing, buyerName, uid);
  return true;
};

export const removeSaved = (uid, id) => {
  writeLocal(
    uid,
    getSaved(uid).filter((i) => i.id !== id),
  );
  pushRemove(uid, id);
};

export const isSavedLocal = (uid, id) => getSaved(uid).some((i) => i.id === id);

const sig = (a) =>
  a
    .map((i) => i.id)
    .sort()
    .join("|");

/** Live list of saved items for a user (oldest first; reverse for newest first). */
export const useSavedItems = (uid) => {
  const [items, setItems] = useState(() => getSaved(uid));

  useEffect(() => {
    setItems(getSaved(uid));
    const onEvt = () => {
      setItems(getSaved(uid));
      syncDiff(uid);
    };
    window.addEventListener("saved-updated", onEvt);

    let unsub = () => {};
    if (uid) {
      unsub = onSnapshot(
        query(collection(db, COLL), where("uid", "==", uid)),
        (snap) => {
          const remote = snap.docs
            .map((d) => d.data())
            .sort(
              (a, b) =>
                (a.savedAt?.seconds ?? Infinity) -
                (b.savedAt?.seconds ?? Infinity),
            );
          const first = !remoteIds[uid];
          remoteIds[uid] = new Set(remote.map((i) => i.id));
          const local = getSaved(uid);
          let next = remote;
          // First load: keep anything saved earlier on this device (older localStorage-only saves)
          if (first)
            next = [
              ...remote,
              ...local.filter((i) => !remoteIds[uid].has(i.id)),
            ];
          const clean = next.map(({ savedAt, uid: _u, ...rest }) => rest);
          if (sig(clean) !== sig(local)) writeLocal(uid, clean);
          else setItems(local);
          syncDiff(uid);
        },
        (err) => {
          if (err?.code === "permission-denied")
            console.warn(
              'Saved items are only cached on this device: add a Firestore rule for the "savedItems" collection to sync them across devices.',
            );
          else console.error("Saved items listener:", err);
        },
      );
    }
    return () => {
      window.removeEventListener("saved-updated", onEvt);
      unsub();
    };
  }, [uid]);

  const remove = useCallback((id) => removeSaved(uid, id), [uid]);
  return { items, remove };
};
