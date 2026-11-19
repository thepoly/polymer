/**
 * Light or dark: the reader's own pick if they've made one, otherwise their
 * device's setting (prefers-color-scheme), followed live.
 *
 * Cookies (all path=/, one year):
 * - `theme` (dark | light): the reader's pick. Written only when they pick
 *   (the toggle or the Konami code). The Android and iOS shells read it at
 *   launch to colour their bars, and fall back to the system setting
 *   without it.
 * - `theme-picked=1`: marks `theme` as a real pick. Before this, `theme` was
 *   written on every visit, so a `theme=light` without the marker is just the
 *   old default and is cleared; `theme=dark` was always a deliberate switch.
 * - `theme-system` (dark | light): the device setting seen on the last
 *   visit. Not a pick: it only lets the server draw the right logos, which
 *   it can't otherwise know, so a dark-mode device doesn't get light logos
 *   until the page hydrates.
 */
export const THEME_COOKIE = "theme";
export const THEME_PICKED_COOKIE = "theme-picked";
export const THEME_SYSTEM_COOKIE = "theme-system";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemeChoice = "dark" | "light" | null;

export function resolveThemeChoice(theme: string | undefined, picked: string | undefined): ThemeChoice {
  if (picked === "1" && (theme === "dark" || theme === "light")) return theme;
  if (theme === "dark") return "dark";
  return null;
}

export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before the first paint when the reader hasn't picked, so
 * the page comes up in the device's theme rather than the server's guess.
 * Only fixed constants go into it, written in as they are (no escaping
 * helper, which CodeQL rightly treats as unsafe for inline scripts); keep
 * it that way: nothing from a request or a reader belongs in here.
 */
export const SYSTEM_THEME_SCRIPT =
  '(function(){try{' +
  `var d=window.matchMedia("${SYSTEM_DARK_QUERY}").matches,r=document.documentElement;` +
  'r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";' +
  `document.cookie="${THEME_SYSTEM_COOKIE}="+(d?"dark":"light")+"; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax"` +
  '}catch(e){}})();';
