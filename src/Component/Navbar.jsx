import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/* ── Animated wavy underline — draws on hover, stays full when active ───── */
const NavUnderline = ({ active, hovered }) => {
  // Total path length of the wave (pre-measured for viewBox 0 0 60 6)
  const pathLength = 64;
  const offset = active ? 0 : hovered ? pathLength * 0.45 : pathLength;
  return (
    <svg
      viewBox="0 0 60 6"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute -bottom-1.5 left-0 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,3 C10,0 20,6 30,3 C40,0 50,6 60,3"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={offset}
        style={{
          transition: active
            ? "stroke-dashoffset 0.35s cubic-bezier(0.4,0,0.2,1)"
            : hovered
              ? "stroke-dashoffset 0.25s cubic-bezier(0.4,0,0.2,1)"
              : "stroke-dashoffset 0.2s ease",
        }}
      />
    </svg>
  );
};

/* ── Nav link with hover + active underline draw animation ──────────────── */
const NavLink = ({ to, label, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative text-sm font-medium transition-colors duration-200 pb-1 ${
        isActive ? "text-primary" : "text-foreground/70 hover:text-primary"
      }`}
    >
      {label}
      <NavUnderline active={isActive} hovered={hovered} />
    </Link>
  );
};

/* ── DecluttLogo — partial arc with breathing room around "clutt" ──────── */
export const DecluttLogo = ({ className = "" }) => (
  <span
    className={`relative inline-block font-bold text-foreground ${className}`}
  >
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

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const NAV_LINKS = [
    { label: "Home", to: "/" },
    { label: "Listings", to: "/listings" },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ];

  const isActive = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <>
      {/* ── Navbar bar ─────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-md border-b border-border/60 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-16 2xl:px-24 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="text-xl sm:text-2xl shrink-0">
            <DecluttLogo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                label={l.label}
                isActive={isActive(l.to)}
              />
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <Link
              to="/login"
              className="px-4 py-1.5 text-sm font-medium text-foreground/70 hover:text-primary transition-colors duration-200 rounded-full border border-border hover:border-primary/50"
            >
              Log in
            </Link>
            <Link to="/signup" className="main-button text-sm px-4 py-1.5">
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger — right side */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* ── Mobile drawer — slides from RIGHT ──────────────────────────── */}
      <div
        className="md:hidden fixed inset-0 z-40 transition-all duration-300"
        style={{
          pointerEvents: menuOpen ? "auto" : "none",
          background: menuOpen ? "rgba(0,0,0,0.45)" : "transparent",
          backdropFilter: menuOpen ? "blur(2px)" : "none",
          transition: "background 0.3s ease, backdrop-filter 0.3s ease",
        }}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <div
        className="md:hidden fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-background border-l border-border shadow-2xl"
        style={{
          width: "65vw",
          maxWidth: "320px",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <Link to="/" className="text-xl">
            <DecluttLogo />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col flex-1 px-4 py-6 gap-1 overflow-y-auto">
          {NAV_LINKS.map((l, i) => {
            const active = isActive(l.to);
            return (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border-b border-border/50 last:border-0 ${
                  active
                    ? "text-primary bg-primary/8"
                    : "text-foreground/80 hover:text-primary hover:bg-primary/8"
                }`}
                style={{
                  transform: menuOpen ? "translateX(0)" : "translateX(16px)",
                  opacity: menuOpen ? 1 : 0,
                  transition: `transform 0.3s ease ${i * 40}ms, opacity 0.3s ease ${i * 40}ms, color 0.2s, background 0.2s`,
                }}
              >
                <span>{l.label}</span>
                {/* Wavy underline indicator for active on mobile */}
                {active && (
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="shrink-0 px-4 py-5 border-t border-border flex flex-col gap-3">
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-full border border-border text-foreground hover:border-primary hover:text-primary transition-all duration-200"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            onClick={() => setMenuOpen(false)}
            className="main-button w-full text-center text-sm py-2.5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </>
  );
};
