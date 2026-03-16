"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlignCenter, ArrowUpRight, Menu, Moon, Search, Sun, X } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";
import { useTheme } from "@/components/ThemeProvider";

const primaryNavItems = [
  { label: "News", href: "/news" },
  { label: "Features", href: "/features" },
  { label: "Opinion", href: "/opinion" },
  { label: "Sports", href: "/sports" },
];

const secondaryNavItems = [
  { label: "About", href: "/about" },
  { label: "Archives", href: "/archives" },
  { label: "Staff", href: "/staff" },
  { label: "Contact", href: "/contact" },
  { label: "Submit", href: "/submit" },
];

const mobileNavItems = [
  ...primaryNavItems,
  { label: "Checkmate", href: "/checkmate" },
  ...secondaryNavItems,
];

export default function Header({ compact = false }: { compact?: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isCenteredDesktopHeader, setIsCenteredDesktopHeader] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("desktop-header-layout") === "centered";
  });
  const { isDarkMode, toggleDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark.svg" : "/logo-light.svg";
  const glowColor = isDarkMode ? "white" : "black";
  const glowColorRef = useRef(glowColor);

  useEffect(() => {
    glowColorRef.current = glowColor;
  }, [glowColor]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const toggleDesktopHeaderLayout = () => {
    setIsCenteredDesktopHeader((current) => {
      const next = !current;
      window.localStorage.setItem("desktop-header-layout", next ? "centered" : "flush");
      return next;
    });
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      {/* ── MOBILE HEADER ── */}
      <header className={`${compact ? "sticky top-0" : ""} z-50 border-b border-rule-strong bg-bg-main lg:hidden`}>
        <div className="font-meta border-b border-rule px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-main">
          <div className="relative mx-auto flex max-w-[1280px] items-center justify-center gap-2.5">
            <span>{currentDate}</span>
            <span className="text-text-muted/30">|</span>
            <span className="text-accent font-semibold">Vol. XCI No. 22</span>
          </div>
        </div>

        <div className="mx-auto flex h-[56px] max-w-[1280px] items-center justify-between gap-3 px-3 sm:h-[64px]">
          <button
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center text-text-main transition-colors hover:text-accent"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="relative block h-[40px] w-full max-w-[220px] sm:h-[48px] sm:max-w-[260px]">
            <Image
              src={logoSrc}
              alt="The Polytechnic"
              fill
              className="object-contain"
              priority
            />
          </Link>

          <button
            onClick={() => setIsSearchOverlayOpen(true)}
            className="flex h-9 w-9 items-center justify-center text-text-main transition-colors hover:text-accent"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-[100px] z-[60] overflow-y-auto border-t border-rule-strong bg-bg-main sm:top-[110px]">
            <div className="mx-auto flex max-w-[1280px] flex-col px-6 pb-8 pt-6">
              <nav className="flex flex-col">
                {mobileNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="font-meta flex items-center justify-between border-b border-rule py-4 text-lg font-semibold uppercase tracking-[0.06em] text-text-main transition-colors hover:text-accent"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                    <ArrowUpRight className="h-4 w-4 text-text-muted" />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* ── DESKTOP HEADER ── */}
      <header className="hidden lg:block">
        {/* Top bar: secondary nav + date + search */}
        <div className={`${compact ? "fixed" : "relative"} top-0 left-0 right-0 z-50 bg-bg-main/95 backdrop-blur-md`}>
          <div className="font-meta relative mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 pt-1.5 pb-0.5 md:px-6 xl:px-[30px]">
            <div className="flex items-center gap-5 text-[11px] font-medium uppercase tracking-[0.1em] text-text-main">
              {secondaryNavItems.map((item) => (
                <Link key={item.label} href={item.href} className="transition-colors hover:text-accent">
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">
              <span className="text-text-main">{currentDate}</span>
              <span className="text-text-muted/30">|</span>
              <span className="text-accent font-semibold">Vol. XCI No. 22</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full border border-rule text-text-main transition-colors hover:border-accent hover:text-accent"
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>

              <button
                className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  isCenteredDesktopHeader
                    ? "border-accent text-accent"
                    : "border-rule text-text-main hover:border-accent hover:text-accent"
                }`}
                onClick={toggleDesktopHeaderLayout}
                aria-label={isCenteredDesktopHeader ? "Switch to flush header layout" : "Switch to centered header layout"}
              >
                <AlignCenter className="h-3.5 w-3.5" />
                <span>Center</span>
              </button>

              <button
                className="flex items-center cursor-pointer gap-1.5 rounded-full border border-rule px-2.5 h-7 text-text-main transition-colors hover:border-accent hover:text-accent"
                onClick={() => setIsSearchOverlayOpen(true)}
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em]">
                  Search
                </span>
              </button>
            </div>
          </div>
        </div>

        {compact && <div className="h-[38px]" />}

        {!compact && (
          <>
            {isCenteredDesktopHeader ? (
              <>
                <div className="mx-auto flex max-w-[1280px] flex-col items-center px-4 pt-7 pb-5 md:px-6 xl:px-[30px]">
                  <Link href="/" className="relative block h-[80px] w-[520px] max-w-full">
                    <Image
                      src={logoSrc}
                      alt="The Polytechnic"
                      fill
                      className="object-contain"
                      priority
                    />
                  </Link>
                </div>

                <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-[30px]">
                  <div className="relative">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-rule-strong" />
                    <nav
                      className="font-meta relative flex flex-wrap items-center justify-center gap-x-10 py-2"
                      ref={(nav) => {
                        if (!nav) return;
                        const glow = nav.querySelector("[data-glow-bottom]") as HTMLElement;
                        if (!glow) return;

                        let active = false;

                        const links = nav.querySelectorAll("a");
                        links.forEach((link) => {
                          link.addEventListener("mouseenter", () => {
                            const navRect = nav.getBoundingClientRect();
                            const linkRect = link.getBoundingClientRect();
                            const center = linkRect.left + linkRect.width / 2 - navRect.left;
                            const width = linkRect.width + 60;

                            const c = glowColorRef.current;
                            const bg = `radial-gradient(ellipse at center, ${c} 0%, transparent 70%)`;

                            if (!active) {
                              glow.style.transition = "none";
                              glow.style.background = bg;
                              glow.style.left = `${center}px`;
                              glow.style.width = "0px";
                              glow.style.opacity = "1";
                              void glow.offsetHeight;
                              glow.style.transition = "left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease";
                              glow.style.left = `${center - width / 2}px`;
                              glow.style.width = `${width}px`;
                              active = true;
                            } else {
                              glow.style.background = bg;
                              glow.style.left = `${center - width / 2}px`;
                              glow.style.width = `${width}px`;
                              glow.style.opacity = "1";
                            }
                          });
                        });

                        nav.addEventListener("mouseleave", () => {
                          active = false;
                          glow.style.opacity = "0";
                        });
                      }}
                    >
                      <span
                        data-glow-bottom
                        className="pointer-events-none absolute bottom-0 translate-y-1/2 h-px"
                        style={{ background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`, opacity: 0, width: 0, transition: "left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease" }}
                      />
                      {primaryNavItems.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="relative py-0.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-text-main"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-6 xl:px-[30px]">
                <div className="relative flex items-end justify-between gap-8 pb-1.5">
                  <div className="absolute inset-x-0 bottom-0 h-px bg-rule-strong" />
                  <Link href="/" className="relative -top-2 block h-[70px] w-[432px] max-w-full shrink-0">
                    <Image
                      src={logoSrc}
                      alt="The Polytechnic"
                      fill
                      className="object-contain object-left"
                      priority
                    />
                  </Link>

                  <nav
                    className="font-meta relative mr-4 flex flex-wrap items-center justify-end gap-x-7 gap-y-1.5 pb-0"
                    ref={(nav) => {
                      if (!nav) return;
                      const glow = nav.querySelector("[data-glow-bottom]") as HTMLElement;
                      if (!glow) return;

                      let active = false;

                      const links = nav.querySelectorAll("a");
                      links.forEach((link) => {
                        link.addEventListener("mouseenter", () => {
                          const navRect = nav.getBoundingClientRect();
                          const linkRect = link.getBoundingClientRect();
                          const center = linkRect.left + linkRect.width / 2 - navRect.left;
                          const width = linkRect.width + 60;

                          const c = glowColorRef.current;
                          const bg = `radial-gradient(ellipse at center, ${c} 0%, transparent 70%)`;

                          if (!active) {
                            glow.style.transition = "none";
                            glow.style.background = bg;
                            glow.style.left = `${center}px`;
                            glow.style.width = "0px";
                            glow.style.opacity = "1";
                            void glow.offsetHeight;
                            glow.style.transition = "left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease";
                            glow.style.left = `${center - width / 2}px`;
                            glow.style.width = `${width}px`;
                            active = true;
                          } else {
                            glow.style.background = bg;
                            glow.style.left = `${center - width / 2}px`;
                            glow.style.width = `${width}px`;
                            glow.style.opacity = "1";
                          }
                        });
                      });

                      nav.addEventListener("mouseleave", () => {
                        active = false;
                        glow.style.opacity = "0";
                      });
                    }}
                  >
                    <span
                      data-glow-bottom
                      className="pointer-events-none absolute bottom-0 translate-y-1/2 h-px"
                      style={{ background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`, opacity: 0, width: 0, transition: "left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease" }}
                    />
                    {primaryNavItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="relative py-0.5 text-[16px] font-semibold uppercase tracking-[0.08em] text-text-main"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>
            )}
          </>
        )}
      </header>

      {isSearchOverlayOpen && (
        <SearchOverlay onClose={() => setIsSearchOverlayOpen(false)} />
      )}
    </>
  );
}
