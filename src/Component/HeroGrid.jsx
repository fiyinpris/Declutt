// Same grid treatment as the home page hero: sits behind the heading text and fades out at
// the edges (radial mask), so it never runs into the navbar or the page edges.
const MASK = "radial-gradient(ellipse at 50% 50%, black 55%, transparent 85%)";

const HeroGrid = ({ inset = "0 -40px -24px" }) => (
  <div
    aria-hidden="true"
    className="hero-grid absolute z-0 pointer-events-none"
    style={{ inset, WebkitMaskImage: MASK, maskImage: MASK }}
  />
);

export default HeroGrid;
