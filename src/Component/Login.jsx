import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

const Divider = ({ label = "or" }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-px bg-border" />
    <span className="text-xs text-foreground/35 font-medium">{label}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const friendlyError = (code) => {
  const map = {
    "auth/invalid-credential":
      "Incorrect email or password. Please check and try again.",
    "auth/user-not-found":
      "No account found with this email. Please sign up first.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Contact support.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/popup-closed-by-user":
      "Google sign-in was cancelled. Please try again.",
    "auth/popup-blocked":
      "Popup was blocked. Please allow popups for this site.",
    "auth/cancelled-popup-request": null,
  };
  return map[code] ?? `Login failed (${code}). Please try again.`;
};

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const set = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  // ── After login → always go HOME ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate("/"); // ← always go to home
    } catch (err) {
      const msg = friendlyError(err.code);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    setError("");
    try {
      await loginWithGoogle("buyer");
      navigate("/"); // ← always go to home
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
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary)/0.1) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md mt-5">
        <div className="text-center mb-6">
          <Link to="/">
            <DecluttLogo />
          </Link>
        </div>
        <div
          className="bg-card rounded-3xl shadow-2xl overflow-hidden"
          style={{ border: "2px solid hsl(var(--border))" }}
        >
          <div className="px-6 sm:px-8 py-6 space-y-5">
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Log in to your account
              </h1>
              <p className="text-sm text-foreground/50 mt-0.5">
                Don't have one?{" "}
                <Link
                  to="/signup"
                  className="text-primary font-semibold hover:underline underline-offset-4"
                >
                  Create one free
                </Link>
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={gLoading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-background font-semibold text-sm text-foreground/80 hover:text-foreground hover:bg-border/30 transition-all duration-200 disabled:opacity-60"
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
              {gLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <Divider label="or continue with email" />

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

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground/55 uppercase tracking-widest">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-primary font-medium hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={set}
                    placeholder="••••••••"
                    autoComplete="current-password"
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
              <button
                type="submit"
                disabled={loading}
                className="w-full main-button py-3 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>
          <div className="px-6 sm:px-8 py-4 border-t-2 border-border text-center">
            <p className="text-xs text-foreground/35">
              By signing in, you agree to our{" "}
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

export default Login;
