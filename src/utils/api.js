import { auth } from "../firebase";

/*
 * Calls the Declutt server functions in /api (Vercel). The signed-in user's Firebase ID token
 * goes with every request, and the server checks it — the browser never decides prices,
 * payments or who may change an order.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const api = async (path, { method = "GET", body } = {}) => {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  let r;
  try {
    r = await fetch(`/api/${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("You seem to be offline. Check your connection and try again.", 0);
  }
  const type = r.headers.get("content-type") || "";
  // The local Vite dev server has no /api, so it answers with the app's HTML instead
  if (!type.includes("application/json"))
    throw new ApiError(
      r.ok || r.status === 404
        ? "Checkout runs on the live site (it needs the Declutt server). Try it on your deployed Vercel site."
        : "The server didn't respond properly. Please try again.",
      r.status,
    );
  const data = await r.json();
  if (!r.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", r.status, data);
  return data;
};

export const apiPost = (path, body) => api(path, { method: "POST", body: body || {} });
