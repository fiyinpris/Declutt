import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ── Icons ─────────────────────────────────────────────────────────── */
const EyeIcon = ({ open }) =>
  open ? (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/* ── Logo ─────────────────────────────────────────────────────────── */
const DecluttLogo = () => (
  <span className="relative inline-block font-bold text-foreground text-2xl">
    De
    <span className="text-primary relative inline-block">
      clutt
      <svg
        viewBox="0 0 80 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-12px",
          left: "-12px",
          width: "calc(100% + 24px)",
          height: "calc(100% + 22px)",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <path
          d="M 24,4 C 40,0 64,0 72,12 C 78,20 75,32 64,37 C 50,42 16,40 4,37"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  </span>
);

/* ── Role card ───────────────────────────────────────────────────── */
const RoleCard = ({ role, selected, onSelect }) => {
  const isBuyer = role === "buyer";
  return (
    <button
      type="button"
      onClick={() => onSelect(role)}
      className="flex-1 relative flex flex-col items-center gap-2 px-3 py-4 rounded-2xl transition-all duration-200 text-center focus:outline-none"
      style={{
        border: selected
          ? "2.5px solid hsl(var(--primary))"
          : "2.5px solid hsl(var(--border))",
        background: selected ? "hsl(var(--primary)/0.08)" : "hsl(var(--card))",
        boxShadow: selected ? "0 0 0 4px hsl(var(--primary)/0.08)" : "none",
      }}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${selected ? "bg-primary/20 text-primary" : "bg-border/50 text-foreground/40"}`}
      >
        {isBuyer ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        )}
      </div>
      <p
        className={`text-sm font-bold capitalize ${selected ? "text-primary" : "text-foreground/60"}`}
      >
        {role}
      </p>
      <p className="text-[11px] text-foreground/45 leading-snug">
        {isBuyer ? "Browse & buy items" : "List & sell items"}
      </p>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  );
};

/* ── Error map ───────────────────────────────────────────────────── */
const friendlyError = (code) => {
  const map = {
    "auth/email-already-in-use":
      "An account with this email already exists. Try logging in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/popup-closed-by-user":
      "Google sign-in was cancelled. Please try again.",
    "auth/popup-blocked":
      "Popup was blocked. Please allow popups for this site.",
    "auth/cancelled-popup-request": null, // ignore
    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
  };
  return map[code] ?? `Sign-up failed (${code}). Please try again.`;
};

/* ── Divider ─────────────────────────────────────────────────────── */
const Divider = ({ label = "or" }) => (
  <div className="flex items-center gap-3 my-1">
    <div className="flex-1 h-px bg-border" />
    <span className="text-xs text-foreground/35 font-medium">{label}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

/* ── Main ────────────────────────────────────────────────────────── */
const Signup = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [role, setRole] = useState("buyer");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const set = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  /* ── Email/password submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!form.password) {
      setError("Please enter a password.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { role: r } = await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        role,
      });
      navigate(r === "seller" ? "/seller" : "/buyer");
    } catch (err) {
      const msg = friendlyError(err.code);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Google submit ── */
  const handleGoogle = async () => {
    setGLoading(true);
    setError("");
    try {
      const { role: r } = await loginWithGoogle(role);
      navigate(r === "seller" ? "/seller" : "/buyer");
    } catch (err) {
      const msg = friendlyError(err.code);
      if (msg) setError(msg);
    } finally {
      setGLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-foreground/30 bg-background focus:outline-none transition-all duration-200";
  const borderCls =
    "border-[2px] border-border focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-16 sm:py-20 bg-background relative overflow-hidden">
      {/* Background grid */}
      <div
        className="hero-grid absolute inset-0 opacity-30 pointer-events-none"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 40%, black 35%, transparent 75%)",
          maskImage:
            "radial-gradient(ellipse at 50% 40%, black 35%, transparent 75%)",
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary)/0.1) 0%, transparent 65%)",
        }}
      />

      {/* Card ─ logo + subtitle INSIDE */}
      <div className="relative z-10 w-full max-w-105">
        <div
          className="bg-card rounded-3xl shadow-2xl overflow-hidden"
          style={{ border: "2px solid hsl(var(--border))" }}
        >
          {/* Card header */}
          <div className="px-6 sm:px-8 pt-8 pb-6 border-b-2 border-border text-center">
            <Link to="/">
              <DecluttLogo />
            </Link>
            <p className="mt-2 text-sm text-foreground/50">
              Join thousands of Nigerians buying &amp; selling smarter
            </p>
          </div>

          {/* Card body */}
          <div className="px-6 sm:px-8 py-6 space-y-5">
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Create your account
              </h1>
              <p className="text-sm text-foreground/50 mt-0.5">
                Already have one?{" "}
                <Link
                  to="/login"
                  className="text-primary font-semibold hover:underline underline-offset-4"
                >
                  Log in
                </Link>
              </p>
            </div>

            {/* Role selector */}
            <div>
              <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-2">
                I want to…
              </p>
              <div className="flex gap-3">
                <RoleCard
                  role="buyer"
                  selected={role === "buyer"}
                  onSelect={setRole}
                />
                <RoleCard
                  role="seller"
                  selected={role === "seller"}
                  onSelect={setRole}
                />
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={gLoading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-background font-semibold text-sm text-foreground/80 hover:text-foreground hover:bg-border/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ border: "2px solid hsl(var(--border))" }}
            >
              {gLoading ? (
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
              ) : (
                <GoogleIcon />
              )}
              {gLoading ? "Connecting…" : `Continue with Google as ${role}`}
            </button>

            <Divider label="or sign up with email" />

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 text-red-500 text-sm"
                style={{ border: "2px solid hsl(0 84% 60% / 0.25)" }}
              >
                <svg
                  width="16"
                  height="16"
                  className="shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/55 uppercase tracking-widest">
                  Full name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={set}
                  placeholder="Adaeze Okafor"
                  autoComplete="name"
                  className={`${inputCls} ${borderCls}`}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/55 uppercase tracking-widest">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={set}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`${inputCls} ${borderCls}`}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/55 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={set}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className={`${inputCls} ${borderCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/35 hover:text-foreground/70 transition-colors"
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/55 uppercase tracking-widest">
                  Confirm password
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  name="confirm"
                  value={form.confirm}
                  onChange={set}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`${inputCls} ${borderCls}`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full main-button py-3 text-sm font-bold mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>{" "}
                    Creating account…
                  </>
                ) : (
                  "Create account — it's free"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 border-t-2 border-border text-center">
            <p className="text-xs text-foreground/35">
              By creating an account, you agree to our{" "}
              <span className="text-primary cursor-pointer hover:underline">
                Terms
              </span>{" "}
              &amp;{" "}
              <span className="text-primary cursor-pointer hover:underline">
                Privacy Policy
              </span>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
