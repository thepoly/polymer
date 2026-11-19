"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ThemeLogoSrcs } from "@/lib/getTheme";
import {
  COOKIE_MAX_AGE,
  SYSTEM_DARK_QUERY,
  THEME_COOKIE,
  THEME_PICKED_COOKIE,
  THEME_SYSTEM_COOKIE,
  type ThemeChoice,
} from "@/lib/themePreference";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  logoSrcs: ThemeLogoSrcs;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const FALLBACK_LOGO_SRCS: ThemeLogoSrcs = {
  desktopLight: "/logo-light.svg",
  desktopDark: "/logo-dark.svg",
  mobileLight: "/logo-light-mobile.svg",
  mobileDark: "/logo-dark-mobile.svg",
};
const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
  "Enter",
];

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

function setCookie(name: string, value: string | null) {
  try {
    document.cookie = value === null
      ? `${name}=; path=/; max-age=0; SameSite=Lax`
      : `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    /* iOS Private Browsing */
  }
}

function subscribeToSystemTheme(callback: () => void) {
  const query = window.matchMedia(SYSTEM_DARK_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSystemDark() {
  return window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

/**
 * Light or dark: the reader's pick, or else their device's setting, followed
 * live (see lib/themePreference.ts for the cookies). The layout's head script
 * has already set the right class before hydration.
 */
export default function ThemeProvider({
  children,
  initialChoice = null,
  initialSystemDark = false,
  logoSrcs = FALLBACK_LOGO_SRCS,
}: {
  children: React.ReactNode;
  /** The reader's pick from their cookies, or null to follow the device */
  initialChoice?: ThemeChoice;
  /** The server's guess at the device setting (the last one seen) */
  initialSystemDark?: boolean;
  logoSrcs?: ThemeLogoSrcs;
}) {
  const [choice, setChoice] = useState<ThemeChoice>(initialChoice);
  // Hydrates with the server's guess (so the markup matches), then reads the
  // device and re-renders if the guess was wrong
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, getSystemDark, () => initialSystemDark);
  const isDarkMode = choice ? choice === "dark" : systemDark;
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);
  const konamiIndexRef = useRef(0);

  // A pick is remembered; with none, the old auto-written `theme` cookie is
  // cleared so the app shells fall back to the device setting too
  useEffect(() => {
    if (choice) {
      setCookie(THEME_COOKIE, choice);
      setCookie(THEME_PICKED_COOKIE, "1");
    } else {
      setCookie(THEME_COOKIE, null);
      setCookie(THEME_PICKED_COOKIE, null);
    }
  }, [choice]);

  // Keep the server's guess at the device setting current
  useEffect(() => {
    setCookie(THEME_SYSTEM_COOKIE, systemDark ? "dark" : "light");
  }, [systemDark]);

  const isDarkModeRef = useRef(isDarkMode);
  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  // Picking is always relative to what's showing now
  const toggleDarkMode = useCallback(() => {
    setChoice(isDarkModeRef.current ? "light" : "dark");
  }, []);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const navigatorWithStandalone = window.navigator as Navigator & {
      standalone?: boolean;
    };

    const updateStandaloneState = () => {
      const standalone = standaloneQuery.matches || navigatorWithStandalone.standalone === true;
      setIsStandalonePwa(standalone);
      document.documentElement.classList.toggle("standalone-pwa", standalone);
      document.body.classList.toggle("standalone-pwa", standalone);
    };

    updateStandaloneState();

    standaloneQuery.addEventListener("change", updateStandaloneState);
    window.addEventListener("pageshow", updateStandaloneState);

    return () => {
      standaloneQuery.removeEventListener("change", updateStandaloneState);
      window.removeEventListener("pageshow", updateStandaloneState);
    };
  }, []);

  useEffect(() => {
    const normalizeKonamiKey = (key: string) => {
      if (key.startsWith("Arrow")) return key;
      if (key === "Enter") return key;
      return key.length === 1 ? key.toLowerCase() : key;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = normalizeKonamiKey(event.key);
      const currentIndex = konamiIndexRef.current;

      // Prevent page scroll when entering the down/down part of the code.
      if (key === "ArrowDown" && (currentIndex === 2 || currentIndex === 3)) {
        event.preventDefault();
      }

      let nextIndex = 0;
      if (key === KONAMI_CODE[currentIndex]) {
        nextIndex = currentIndex + 1;
      } else if (key === KONAMI_CODE[0]) {
        nextIndex = 1;
      }

      if (nextIndex === KONAMI_CODE.length) {
        toggleDarkMode();
        nextIndex = 0;
      }

      konamiIndexRef.current = nextIndex;
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDarkMode]);

  // Colours fade between themes while .theme-fading is on <html> (see
  // globals.css); every way of switching theme passes through here. Only when
  // the theme actually changes: comparing with the last one seen (rather than
  // skipping the first run) also holds when StrictMode runs effects twice.
  const lastThemeRef = useRef(isDarkMode);
  useEffect(() => {
    if (lastThemeRef.current === isDarkMode) return;
    lastThemeRef.current = isDarkMode;
    const root = document.documentElement;
    root.classList.add("theme-fading");
    const timeout = window.setTimeout(() => root.classList.remove("theme-fading"), 350);
    return () => {
      window.clearTimeout(timeout);
      root.classList.remove("theme-fading");
    };
  }, [isDarkMode]);

  useEffect(() => {
    // From the device itself, not systemDark: on the hydration pass that's
    // still the server's guess, and acting on a wrong guess would undo the
    // head script for a frame
    const isDark = choice ? choice === "dark" : getSystemDark();
    const themeColor = isDark ? "#0a0a0a" : "#ffffff";

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";

    let themeMeta = document.querySelector('meta[name="theme-color"][data-runtime-theme-color="true"]');
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      themeMeta.setAttribute("data-runtime-theme-color", "true");
      document.head.appendChild(themeMeta);
    }

    themeMeta.setAttribute("content", themeColor);

    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusBarMeta) {
      statusBarMeta = document.createElement("meta");
      statusBarMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
      document.head.appendChild(statusBarMeta);
    }
    statusBarMeta.setAttribute(
      "content",
      isStandalonePwa ? "black-translucent" : isDark ? "black" : "default",
    );

    // Android app bridge: drive the native status + nav bars from the in-app
    // theme so they follow the site toggle rather than the phone's ui mode.
    // window.PolyTheme may attach slightly after initial hydration, so we
    // retry briefly until the interface shows up. No-op on browsers and iOS.
    let cancelled = false;
    let attempts = 0;
    const pushTheme = () => {
      if (cancelled) return;
      const polyTheme = (window as unknown as { PolyTheme?: { setDark?: (d: boolean) => void } }).PolyTheme;
      if (polyTheme?.setDark) {
        try {
          polyTheme.setDark(isDark);
        } catch {
          /* swallow */
        }
        return;
      }
      if (attempts++ < 30) {
        window.setTimeout(pushTheme, 100);
      }
    };
    pushTheme();

    return () => {
      cancelled = true;
    };
    // systemDark: re-run when the device setting changes
  }, [choice, systemDark, isStandalonePwa]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, logoSrcs }}>
      {children}
    </ThemeContext.Provider>
  );
}
