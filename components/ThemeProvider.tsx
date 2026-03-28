"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
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

export default function ThemeProvider({
  children,
  initialDarkMode = false,
}: {
  children: React.ReactNode;
  initialDarkMode?: boolean;
}) {
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);
  const konamiIndexRef = useRef(0);

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
        setIsDarkMode((prevMode) => !prevMode);
        nextIndex = 0;
      }

      konamiIndexRef.current = nextIndex;
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const themeColor = isDarkMode ? "#0a0a0a" : "#ffffff";

    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      document.cookie = "theme=dark; path=/; max-age=31536000"; // 1 year
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      document.cookie = "theme=light; path=/; max-age=31536000";
    }

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
      isStandalonePwa ? "black-translucent" : isDarkMode ? "black" : "default",
    );
  }, [isDarkMode, isStandalonePwa]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
