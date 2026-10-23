import { useSyncExternalStore } from "react";

// Mirrors --background in index.css; used for the mobile browser toolbar colour
const TOOLBAR = { light: "hsl(30 14% 80%)", dark: "hsl(30 28% 8%)" };

const subscribe = (cb) => {
  window.addEventListener("theme-changed", cb);
  return () => window.removeEventListener("theme-changed", cb);
};
const isDarkNow = () => document.documentElement.classList.contains("dark");

export const toggleTheme = () => {
  const next = !isDarkNow();
  document.documentElement.classList.toggle("dark", next);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", next ? TOOLBAR.dark : TOOLBAR.light);
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {
    /* private mode: the theme still applies for this visit */
  }
  window.dispatchEvent(new Event("theme-changed"));
};

/** Light/dark theme shared by the footer switch and the phone account sheet. */
export const useTheme = () => ({
  isDark: useSyncExternalStore(subscribe, isDarkNow),
  toggleTheme,
});
