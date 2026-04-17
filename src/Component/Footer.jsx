// src/Component/Footer.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DecluttLogo from "./DecluttLogo";

/* Icons */
const SunIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const Footer = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <footer className="border-t border-border bg-background mt-10">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
          {/* Logo */}
          <div className="flex flex-col gap-3">
            <Link to="/">
              <DecluttLogo />
            </Link>
            <p className="text-sm text-foreground/60">
              Buy and sell easily. Give your items a second life.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Explore</h4>
            <Link to="/listings" className="block text-sm mb-2">
              Browse
            </Link>
            <Link to="/categories" className="block text-sm mb-2">
              Categories
            </Link>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <Link to="/about" className="block text-sm mb-2">
              About
            </Link>
            <Link to="/contact" className="block text-sm mb-2">
              Contact
            </Link>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <Link to="/privacy" className="block text-sm mb-2">
              Privacy
            </Link>
            <Link to="/terms" className="block text-sm mb-2">
              Terms
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* ✅ Theme toggle (restored) */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="relative flex items-center w-14 h-7 rounded-full border border-border bg-card"
            >
              <span
                className="absolute w-5 h-5 rounded-full bg-primary flex items-center justify-center transition-all"
                style={{ left: isDark ? "calc(100% - 1.5rem)" : "2px" }}
              >
                {isDark ? <MoonIcon /> : <SunIcon />}
              </span>
            </button>

            <span className="text-xs text-foreground/50">
              {isDark ? "Dark mode" : "Light mode"}
            </span>
          </div>

          {/* Copyright */}
          <p className="text-xs text-foreground/40">
            © {new Date().getFullYear()} Declutt. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
