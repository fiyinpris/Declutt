import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const buildProfile = (uid, email, name, role) => ({
    uid,
    email,
    name,
    role,
    createdAt: new Date().toISOString(),
    rewards: 0,
    referralCode: uid.slice(0, 8).toUpperCase(),
    referredBy: null,
  });

  const loadProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        setProfile(snap.data());
        return snap.data();
      }
    } catch (e) {
      console.error("loadProfile:", e);
    }
    setProfile(null);
    return null;
  };

  /* ── Email/password register ── */
  const register = async ({ email, password, name, role }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const data = buildProfile(cred.user.uid, email, name, role);
    await setDoc(doc(db, "users", cred.user.uid), data);
    setProfile(data);
    return { cred, role };
  };

  /* ── Email/password login ── */
  const login = async ({ email, password }) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const prof = await loadProfile(cred.user.uid);
    return { cred, role: prof?.role };
  };

  /* ── Password reset ── */
  const resetPassword = async (email) => {
    const actionCodeSettings = {
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined,
      handleCodeInApp: true,
    };
    return sendPasswordResetEmail(auth, email, actionCodeSettings);
  };

  /* ── Google sign-in ── */
  const loginWithGoogle = async (roleIfNew = "buyer") => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const uid = cred.user.uid;

    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const prof = snap.data();
      setProfile(prof);
      return { cred, role: prof.role, isNew: false };
    }
    // First-time Google user
    const name =
      cred.user.displayName || cred.user.email?.split("@")[0] || "User";
    const data = buildProfile(uid, cred.user.email, name, roleIfNew);
    await setDoc(doc(db, "users", uid), data);
    setProfile(data);
    return { cred, role: roleIfNew, isNew: true };
  };

  /* ── Logout ── */
  const logout = () => signOut(auth);

  /* ── Auth state listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) await loadProfile(firebaseUser.uid);
      else setProfile(null);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        register,
        login,
        resetPassword,
        loginWithGoogle,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
