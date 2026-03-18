"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

export default function Footer() {
  const { isDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark.svg" : "/logo-light.svg";
  const [lineVisible, setLineVisible] = useState(false);

  useEffect(() => {
    const checkIfAtBottom = () => {
      const viewportBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight;

      if (viewportBottom >= pageBottom - 2) {
        setLineVisible(true);
      }
    };

    checkIfAtBottom();
    window.addEventListener("scroll", checkIfAtBottom, { passive: true });
    window.addEventListener("resize", checkIfAtBottom);

    return () => {
      window.removeEventListener("scroll", checkIfAtBottom);
      window.removeEventListener("resize", checkIfAtBottom);
    };
  }, []);

  return (
    <footer className="safe-area-bottom mt-12 bg-bg-main">
      <div className="safe-area-mobile-page-x mx-auto max-w-[1280px] md:px-6 xl:px-[30px]">
        <div
          className="h-[1.5px] bg-rule-strong origin-left"
          style={{
            transform: lineVisible ? "scaleX(1)" : "scaleX(0)",
            transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
      <div className="safe-area-mobile-page-x mx-auto max-w-[1280px] pt-4 pb-2 md:px-6 xl:px-[30px]">
        <div className="flex flex-col items-center gap-4 pb-6 md:flex-row md:justify-between">
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="relative block h-[44px] w-[230px] sm:h-[52px] sm:w-[280px]">
              <Image
                src={logoSrc}
                alt="The Polytechnic"
                fill
                className="object-contain"
              />
            </Link>
          </div>

          <div className="font-meta flex flex-col items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted md:items-end">
            <span className="relative -top-1">Troy, New York</span>
            <span className="text-accent font-semibold">Vol. XCI No. 22</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
