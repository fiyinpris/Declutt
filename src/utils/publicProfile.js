import { useCallback, useSyncExternalStore } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/*
 * publicProfiles/{uid} = { name, photoURL } — the small part of a profile other signed-in users
 * may see (the users/{uid} document also holds private details, so it stays owner-only).
 * Chats read the other person's photo from here.
 */

/** Keep the public copy in step with the user's profile. Writes only when something changed. */
export const syncPublicProfile = async (uid, { name, photoURL }) => {
  if (!uid) return;
  const next = { name: name || "", photoURL: photoURL || null };
  try {
    const ref = doc(db, "publicProfiles", uid);
    const snap = await getDoc(ref);
    const cur = snap.exists() ? snap.data() : null;
    if (cur && cur.name === next.name && (cur.photoURL || null) === next.photoURL)
      return;
    await setDoc(ref, next);
  } catch (e) {
    console.error("Public profile sync failed:", e);
  }
};

// One shared realtime listener per uid, so every avatar for a person updates together
const entries = new Map(); // uid → { data, subs:Set, unsub }

const subscribeTo = (uid, cb) => {
  let e = entries.get(uid);
  if (!e) {
    e = { data: null, subs: new Set(), unsub: null };
    entries.set(uid, e);
  }
  e.subs.add(cb);
  if (!e.unsub) {
    e.unsub = onSnapshot(
      doc(db, "publicProfiles", uid),
      (s) => {
        e.data = s.exists() ? s.data() : null;
        e.subs.forEach((fn) => fn());
      },
      (err) => console.error("Public profile listener:", err),
    );
  }
  return () => {
    e.subs.delete(cb);
    if (!e.subs.size && e.unsub) {
      e.unsub(); // keep e.data cached so the photo shows instantly next time
      e.unsub = null;
    }
  };
};

/** { name, photoURL } for any user, or null while loading / if they have none. */
export const usePublicProfile = (uid) => {
  const subscribe = useCallback(
    (cb) => (uid ? subscribeTo(uid, cb) : () => {}),
    [uid],
  );
  return useSyncExternalStore(subscribe, () =>
    uid ? (entries.get(uid)?.data ?? null) : null,
  );
};
