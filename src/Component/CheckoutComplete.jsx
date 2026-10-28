import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cartHelpers } from "../utils/Cart";
import { api } from "../utils/api";
import { PENDING_CHECKOUT_KEY } from "../utils/orders";
import { Ico, Spin } from "./Ico";

/*
 * /checkout/complete
 *   ?reference=… (Paystack sends the buyer back here) → the server confirms the payment
 *   ?placed=…    pay-on-delivery order placed
 */
const FAILED = ["failed", "abandoned", "reversed"];

// Bought from the cart → take those lines out now that payment went through
const clearBought = (uid, reference) => {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_CHECKOUT_KEY) || "null");
    if (p?.checkoutId !== reference) return;
    if (p.fromCart) p.ids.forEach((id) => cartHelpers.remove(uid, id));
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    /* nothing to clear */
  }
};

const Badge = ({ tone, children }) => (
  <div
    className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${tone === "good" ? "bg-emerald-500/12 text-emerald-600" : tone === "bad" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}
  >
    {children}
  </div>
);

const CheckoutComplete = () => {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const placed = params.get("placed");
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const [result, setResult] = useState(placed ? { state: "placed" } : null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!reference) return;
    let alive = true;
    api(`checkout-verify?reference=${encodeURIComponent(reference)}`)
      .then((r) => {
        if (!alive) return;
        if (r.status === "paid") {
          clearBought(uid, reference);
          setResult({ state: "paid", orders: r.orderIds?.length || 1 });
        } else setResult({ state: FAILED.includes(r.status) ? "failed" : "pending" });
      })
      .catch((e) => alive && setResult({ state: "error", message: e.message }));
    return () => {
      alive = false;
    };
  }, [reference, attempt, uid]);

  // Paystack sometimes needs a few seconds (e.g. bank transfers) — check again a few times
  useEffect(() => {
    if (result?.state !== "pending" || attempt >= 6) return;
    const t = setTimeout(() => setAttempt((a) => a + 1), 5000);
    return () => clearTimeout(t);
  }, [result, attempt]);

  const ordersLink =
    profile?.role === "seller" ? "/seller?tab=orders&view=purchases" : "/buyer?tab=orders";
  const state = reference || placed ? result?.state || "checking" : "missing";

  return (
    <div className="max-w-lg mx-auto px-4 pt-24 sm:pt-28 pb-14 sm:pb-20 text-center">
      <div className="bg-card border border-border rounded-3xl px-5 py-10 sm:px-8 space-y-4">
        {state === "checking" && (
          <>
            <Badge>
              <Spin s={26} />
            </Badge>
            <h1 className="text-xl font-black text-foreground">Confirming your payment…</h1>
          </>
        )}

        {(state === "paid" || state === "placed") && (
          <>
            <Badge tone="good">
              <Ico s={30} w={2.5} r>
                <path d="M20 6 9 17l-5-5" />
              </Ico>
            </Badge>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              {state === "paid" ? "Payment successful" : "Order placed"}
            </h1>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
              <Link to={ordersLink} className="main-button text-sm px-5 py-2.5 font-semibold">
                Track my order
              </Link>
              <Link
                to="/listings"
                className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground/70 hover:border-primary/40 hover:text-primary transition-colors"
              >
                Continue shopping
              </Link>
            </div>
          </>
        )}

        {state === "pending" && (
          <>
            <Badge>
              <Spin s={26} />
            </Badge>
            <h1 className="text-xl font-black text-foreground">Waiting for your bank…</h1>
            <p className="text-sm text-foreground/55">You don't need to pay again.</p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAttempt((a) => a + 1);
              }}
              className="main-button text-sm px-5 py-2.5 font-semibold"
            >
              Check again
            </button>
          </>
        )}

        {(state === "failed" || state === "error") && (
          <>
            <Badge tone="bad">
              <Ico s={28} w={2.5} r>
                <path d="M18 6 6 18M6 6l12 12" />
              </Ico>
            </Badge>
            <h1 className="text-xl font-black text-foreground">
              {state === "failed" ? "Payment wasn't completed" : "We couldn't confirm your payment"}
            </h1>
            <p className="text-sm text-foreground/55 leading-relaxed">
              {state === "failed"
                ? "No order was placed."
                : result?.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
              {state === "error" && (
                <button
                  type="button"
                  onClick={() => {
                setResult(null);
                setAttempt((a) => a + 1);
              }}
                  className="main-button text-sm px-5 py-2.5 font-semibold"
                >
                  Check again
                </button>
              )}
              <Link
                to="/checkout"
                className={
                  state === "failed"
                    ? "main-button text-sm px-5 py-2.5 font-semibold"
                    : "px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground/70 hover:text-primary"
                }
              >
                Back to checkout
              </Link>
            </div>
          </>
        )}

        {state === "missing" && (
          <>
            <h1 className="text-xl font-black text-foreground">Nothing to show here</h1>
            <Link to="/listings" className="main-button inline-flex text-sm px-5 py-2.5 font-semibold">
              Browse listings
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutComplete;
