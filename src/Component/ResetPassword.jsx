import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const actionCode = searchParams.get("oobCode");
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [codeValid, setCodeValid] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (mode !== "reset" || !actionCode) {
      setCodeValid(null);
      return;
    }

    setVerifying(true);
    verifyPasswordResetCode(auth, actionCode)
      .then((emailAddress) => {
        setEmail(emailAddress);
        setError("");
        setCodeValid(true);
      })
      .catch((err) => {
        console.error("verifyPasswordResetCode error:", err);
        setError(
          "This password reset link is invalid or expired. Please request a new link."
        );
        setCodeValid(false);
      })
      .finally(() => setVerifying(false));

  }, [mode, actionCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (mode === "reset") {
      if (!newPassword.trim()) {
        setError("Please enter your new password.");
        return;
      }
      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (!actionCode) {
        setError("Reset link is missing. Please request a new reset email.");
        return;
      }

      setLoading(true);
      try {
        await confirmPasswordReset(auth, actionCode, newPassword.trim());
        setMessage(
          "Your password has been reset successfully. You can now log in with your new password."
        );
        setError("");
      } catch (err) {
        console.error("confirmPasswordReset error:", err);
        setError(
          "Unable to reset your password. The link may be invalid or expired."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

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
              <h1 className="text-lg font-bold text-foreground">
                {mode === "reset" ? "Enter a new password" : "Reset password"}
              </h1>
              <p className="text-sm text-foreground/50 mt-0.5">
                {mode === "reset"
                  ? codeValid === false
                    ? "This link appears to be invalid or expired. Request a new password reset email."
                    : "Create a new password for your account."
                  : "Enter the email associated with your account and we will send you a reset link."}
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
              {mode === "reset" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground/55 uppercase tracking-widest">
                      Account email
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-foreground/30 bg-slate-100/70 border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground/55 uppercase tracking-widest">
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      autoComplete="new-password"
                      className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-foreground/30 bg-background border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || verifying || codeValid === false}
                    className="w-full main-button py-3 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading || verifying ? (
                      <>
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        {verifying ? "Verifying…" : "Saving…"}
                      </>
                    ) : (
                      "Set new password"
                    )}
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
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
