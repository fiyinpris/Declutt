import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DecluttLogo } from "./Navbar"; // re-uses the shared logo component

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const Footer = () => {
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

  const footerLinks = {
    Explore: [
      { label: "Listings", to: "/listings" },
      { label: "Categories", to: "/categories" },
      { label: "New Arrivals", to: "/listings?sort=new" },
    ],
    Company: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Blog", to: "/blog" },
    ],
    Legal: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-16 2xl:px-24 py-10 sm:py-12 lg:py-16">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand — uses shared DecluttLogo with arc underline */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
            <Link
              to="/"
              className="w-fit hover:opacity-80 transition-opacity duration-200"
            >
              <DecluttLogo className="text-xl" />
            </Link>
            <p className="text-sm text-foreground/55 leading-relaxed max-w-sm text-left">
              Buy and sell the things you no longer need. Give your clutter a
              second life — and someone else a great deal.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section} className="flex flex-col gap-3 text-left">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
                {section}
              </h4>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-foreground/60 hover:text-primary transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="relative flex items-center w-16 h-8 rounded-full border border-border bg-card transition-all duration-300 hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span
                className="absolute flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-300 ease-in-out"
                style={{ left: isDark ? "calc(100% - 1.75rem)" : "2px" }}
              >
                {isDark ? <MoonIcon /> : <SunIcon />}
              </span>
            </button>
            <span className="text-xs text-foreground/50">
              {isDark ? "Dark" : "Light"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <p className="text-xs text-foreground/40">
              © {new Date().getFullYear()} Declutт. All rights reserved.
            </p>
            <p className="text-xs text-foreground/30">
              Made with care for a cleaner world.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
