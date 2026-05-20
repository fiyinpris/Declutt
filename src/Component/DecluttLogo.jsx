import React from "react";

const DecluttLogo = ({ className = "" }) => (
  <span className={`relative inline-block font-bold text-foreground ${className}`}>
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

export default DecluttLogo;