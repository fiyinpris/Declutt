/*
 * The site owner. Their account is treated as an administrator when its email is VERIFIED
 * by Firebase Auth — the same check firestore.rules makes on the signed-in token
 * (request.auth.token.email + email_verified), so the frontend can't be tricked into it.
 * Accounts with users/{uid}.role == "admin" (set in the Firebase console) are admins too.
 */
export const OWNER_EMAIL = "fiyinolaleke@gmail.com";

export const isOwnerAccount = (user) =>
  !!user?.emailVerified && user?.email?.toLowerCase() === OWNER_EMAIL;

export const isAdminUser = (user, profile) =>
  profile?.role === "admin" || isOwnerAccount(user);
