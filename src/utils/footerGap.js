import { useLayoutEffect, useState } from "react";

/**
 * Dashboards use a full-height sidebar. The site layout (footer margin / page padding) can leave a
 * strip of empty space between the dashboard and the <footer>, so the sidebar looks like it stops
 * short. This measures that strip and pulls the footer up by exactly that amount, so the sidebar
 * runs all the way down to the footer on every screen size. Returns the px to use as -marginBottom.
 */
export const useCloseFooterGap = (ref, max = 220) => {
  const [pull, setPull] = useState(0);

  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const root = ref.current;
        const footer = document.querySelector("footer");
        if (!root || !footer) return;
        const gap = Math.round(footer.getBoundingClientRect().top - root.getBoundingClientRect().bottom);
        setPull((p) => {
          const next = Math.max(0, Math.min(max, p + gap));
          return next === p ? p : next;
        });
      });
    };
    measure();
    const t = setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(document.body);
      if (ref.current) ro.observe(ref.current);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, [ref, max]);

  return pull;
};
