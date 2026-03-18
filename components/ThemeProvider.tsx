"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
  const [keySequence, setKeySequence] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Detect "Up Up" followed by "Down" to prevent scrolling
      const lastTwo = keySequence.slice(-2);
      const lastThree = keySequence.slice(-3);
      
      if (event.key === "ArrowDown") {
        const isFirstDownAfterUpUp = lastTwo.length === 2 && lastTwo[0] === "ArrowUp" && lastTwo[1] === "ArrowUp";
        const isSecondDownAfterUpUp = lastThree.length === 3 && lastThree[0] === "ArrowUp" && lastThree[1] === "ArrowUp" && lastThree[2] === "ArrowDown";
        
        if (isFirstDownAfterUpUp || isSecondDownAfterUpUp) {
          event.preventDefault();
        }
      }

      setKeySequence((prev) => {
        const newSequence = [...prev, event.key];
        const trimmedSequence = newSequence.slice(-KONAMI_CODE.length);

        if (trimmedSequence.length === KONAMI_CODE.length && trimmedSequence.every((key, index) => key === KONAMI_CODE[index])) {
          setIsDarkMode((prevMode) => !prevMode);
          return [];
        }

        return trimmedSequence;
      });
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keySequence]);

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
    statusBarMeta.setAttribute("content", "black-translucent");
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
