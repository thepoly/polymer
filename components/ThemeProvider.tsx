"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default function ThemeProvider({
  children,
  initialDarkMode = true,
}: {
  children: React.ReactNode;
  initialDarkMode?: boolean;
}) {
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [keySequence, setKeySequence] = useState<string[]>([]);

  const konamiCode = [
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
        return newSequence.slice(-konamiCode.length);
      });
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keySequence]);

  useEffect(() => {
    if (keySequence.length === konamiCode.length && keySequence.every((key, index) => key === konamiCode[index])) {
      setIsDarkMode((prev) => !prev);
      setKeySequence([]); 
    }
  }, [keySequence]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.cookie = "theme=dark; path=/; max-age=31536000"; // 1 year
    } else {
      document.documentElement.classList.remove("dark");
      document.cookie = "theme=light; path=/; max-age=31536000";
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
