// Small SVG helpers used by the dashboards and chat. Rendering is identical to the
// inline <svg> markup used before (24x24 viewBox, currentColor stroke).
export const Ico = ({ s = 18, w = 2, r, fill = "none", className, children }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={w}
    strokeLinecap={r ? "round" : undefined}
    strokeLinejoin={r ? "round" : undefined}
    className={className}
  >
    {children}
  </svg>
);

export const Spin = ({ s = 15 }) => (
  <Ico s={s} className="animate-spin shrink-0">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </Ico>
);
