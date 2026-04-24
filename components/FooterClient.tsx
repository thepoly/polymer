"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { toRoman } from "@/lib/toRoman";

export default function FooterClient({ volume, edition }: { volume?: number | null; edition?: number | null }) {
  const { isDarkMode, logoSrcs } = useTheme();
  const logoSrc = isDarkMode ? logoSrcs.mobileDark : logoSrcs.mobileLight;
  const [lineVisible, setLineVisible] = useState(false);
  const logoRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const target = logoRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 1) {
            setLineVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 1 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <footer className="safe-area-bottom mt-3 bg-bg-main">
      <div className="safe-area-mobile-page-x mx-auto max-w-[1280px] md:px-6 xl:px-[30px]">
        <div
          className="relative -left-2 h-[1.5px] w-[calc(100%+0.5rem)] bg-rule-strong origin-left"
          style={{
            transform: lineVisible ? "scaleX(1)" : "scaleX(0)",
            transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
      <div className="safe-area-mobile-page-x mx-auto max-w-[1280px] px-6 pt-6 pb-8 md:px-6 xl:px-[30px]">
        <div className="flex flex-col items-center gap-6">
          <Link ref={logoRef} href="/" className="relative block h-[52px] w-[320px]">
            <Image
              src={logoSrc}
              alt="The Polytechnic"
              fill
              className="object-contain"
            />
          </Link>

          <div className="flex justify-center gap-7">
            <Link href="/about" className="font-meta text-[12px] font-medium uppercase tracking-[0.12em] text-text-main hover:text-accent transition-colors">About</Link>
            <Link href="/archive" className="font-meta text-[12px] font-medium uppercase tracking-[0.12em] text-text-main hover:text-accent transition-colors">Archives</Link>
            <Link href="/contact" className="font-meta text-[12px] font-medium uppercase tracking-[0.12em] text-text-main hover:text-accent transition-colors">Contact</Link>
            <Link href="/privacy" className="font-meta text-[12px] font-medium uppercase tracking-[0.12em] text-text-main hover:text-accent transition-colors">Privacy</Link>
          </div>

          <div className="font-meta flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted">
            <span>Troy, New York</span>
            <span className="text-text-muted opacity-40">·</span>
            <span className="text-accent font-semibold">
              {`Vol. ${volume ? toRoman(volume) : '0'} No. ${edition ?? 0}`}
            </span>
          </div>
          <Link href="/copyright" className="font-copy text-[11px] text-text-muted text-center leading-relaxed underline underline-offset-2 hover:text-accent transition-colors">
            &copy; {new Date().getFullYear()} <i>The Rensselaer Polytechnic</i>. All rights reserved.
          </Link>
        </div>
      </div>
    </footer>
  );
}
