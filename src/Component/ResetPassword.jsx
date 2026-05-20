import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setMessage(
        "A password reset email has been sent. Please check your inbox or spam folder."
      );
    } catch (err) {
      const code = err.code || "";
      if (code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up first.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (
        code === "auth/missing-android-pkg-name" ||
        code === "auth/missing-continue-uri" ||
        code === "auth/invalid-continue-uri"
      ) {
        setError(
          "Password reset link configuration is invalid. Please contact support."
        );
      } else {
        setError(`Unable to send reset email (${code}). Please try again later.`);
        console.error("resetPassword error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-16 sm:py-20 bg-background relative overflow-hidden">
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mt-5">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-bold text-foreground">
            Declutt
          </Link>
        </div>

        <div className="bg-card rounded-3xl shadow-2xl overflow-hidden" style={{ border: "2px solid hsl(var(--border))" }}>
          <div className="px-6 sm:px-8 py-6 space-y-5">
            <div>
              <h1 className="text-lg font-bold text-foreground">Reset password</h1>
              <p className="text-sm text-foreground/50 mt-0.5">
                Enter the email associated with your account and we will send you a reset link.
              </p>
            </div>

            {message && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 text-green-600 text-sm" style={{ border: "2px solid hsl(134 55% 44% / 0.25)" }}>
                {message}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 text-red-500 text-sm" style={{ border: "2px solid hsl(0 84% 60% / 0.25)" }}>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-foreground/30 bg-background border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full main-button py-3 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full text-sm text-primary font-semibold hover:underline underline-offset-4"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
