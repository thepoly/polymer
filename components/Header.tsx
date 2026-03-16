"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, Moon, Search, Sun, X } from "lucide-react";
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
  const [animationKey, setAnimationKey] = useState(0);
  const [isSucking, setIsSucking] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); // The global lock
  const { isDarkMode, toggleDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark.svg" : "/logo-light.svg";
  const glowColor = isDarkMode ? "white" : "black";
  const glowColorRef = useRef(glowColor);

  useEffect(() => {
    glowColorRef.current = glowColor;
  }, [glowColor]);

  const handleLogoClick = (e: React.MouseEvent) => {
    // Bail if we're not on home or if an animation is already in flight
    if (window.location.pathname !== "/" || isAnimating) return;

    e.preventDefault();
    setIsAnimating(true);
    setIsSucking(true);
    
    // 1. Wait for "suck" to finish (400ms)
    setTimeout(() => {
      setIsSucking(false);
      setAnimationKey(prev => prev + 1);
      
      // 2. Wait for the SVG "shoot" to finish (2000ms) 
      // Total lock time: 2400ms
      setTimeout(() => {
        setIsAnimating(false);
      }, 2000);
    }, 400); 
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <>
      {/* ── MOBILE HEADER ── */}
      <header className={`${compact ? "sticky top-0" : ""} z-50 border-b border-rule-strong bg-bg-main lg:hidden`}>
        <div className="font-meta border-b border-rule px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-main">
          <div className="relative mx-auto flex max-w-[1280px] items-center justify-center gap-2.5">
            <span>{currentDate}</span>
            <span className="text-accent font-semibold">Vol. XCI No. 22</span>
          </div>
        </div>
        <div className="mx-auto flex h-[56px] max-w-[1280px] items-center justify-between px-3">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex h-9 w-9 items-center justify-center text-text-main">
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" onClick={handleLogoClick} className="relative block h-[40px] w-full max-w-[220px]">
            <Image src={logoSrc} alt="The Polytechnic" fill className="object-contain" priority />
          </Link>
          <button onClick={() => setIsSearchOverlayOpen(true)} className="flex h-9 w-9 items-center justify-center text-text-main">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── DESKTOP HEADER ── */}
      <header className="hidden lg:block">
        <div className={`${compact ? "fixed" : "relative"} top-0 left-0 right-0 z-50 bg-bg-main/95 backdrop-blur-md`}>
          <div className="font-meta relative mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 pt-1.5 pb-0.5 md:px-6 xl:px-[30px]">
            <div className="flex items-center gap-5 text-[11px] font-medium uppercase tracking-[0.1em] text-text-main">
              {secondaryNavItems.map((item) => (
                <Link key={item.label} href={item.href} className="transition-colors hover:text-accent">{item.label}</Link>
              ))}
            </div>

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">
              <span className="text-text-main">{currentDate}</span>
              <span className="text-accent font-semibold">Vol. XCI No. 22</span>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex h-7 w-7 items-center justify-center rounded-full border border-rule text-text-main hover:border-accent hover:text-accent" onClick={toggleDarkMode}>
                {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button className="flex items-center cursor-pointer gap-1.5 rounded-full border border-rule px-2.5 h-7 text-text-main hover:border-accent hover:text-accent" onClick={() => setIsSearchOverlayOpen(true)}>
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em]">Search</span>
              </button>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-6 xl:px-[30px]">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes terryWrapDraw {
                0% { stroke-dashoffset: 620; }
                35% { stroke-dashoffset: 0; }
                40% { stroke-dashoffset: 0; }
                75% { stroke-dashoffset: -620; }
                100% { stroke-dashoffset: -620; }
              }
              @keyframes terryShootDraw {
                0% { stroke-dashoffset: 100; }
                35% { stroke-dashoffset: 100; }
                95% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes terrySuck {
                from { transform: scaleX(1); opacity: 1; }
                to { transform: scaleX(0); opacity: 1; }
              }
              @keyframes svgContainerFade {
                0%, 95% { opacity: 1; visibility: visible; }
                100% { opacity: 0; visibility: hidden; }
              }
              @keyframes staticLineFade {
                0%, 95% { opacity: 0; }
                100% { opacity: 1; }
              }
              .animate-terry-wrap {
                stroke-dasharray: 620;
                stroke-dashoffset: 620;
                animation: terryWrapDraw 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
              }
              .animate-terry-shoot {
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
                animation: terryShootDraw 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
              }
              .animate-terry-suck {
                animation: terrySuck 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                transform-origin: 440px 0.5px;
              }
            `}} />

            <div className="relative flex items-end justify-between gap-8 pb-1.5">
              <div 
                key={`static-${animationKey}`} 
                className={`absolute -left-1 right-0 bottom-0 h-px bg-rule-strong ${
                  isSucking 
                    ? "animate-terry-suck" 
                    : "opacity-0 animate-[staticLineFade_2s_forwards]"
                }`} 
              />
              
              {!isSucking && (
                <div key={`animated-${animationKey}`} className="absolute inset-x-0 bottom-0 h-px overflow-visible pointer-events-none animate-[svgContainerFade_2s_forwards] text-rule-strong">
                  <svg className="absolute left-0 bottom-0 w-full h-px overflow-visible">
                    <path
                      d="M 436 0.5 V -89.5 H -4 V 0.5"
                      className="animate-terry-wrap"
                      stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="square"
                    />
                    <line
                      x1="-4" y1="0.5" x2="100%" y2="0.5"
                      pathLength="100"
                      className="animate-terry-shoot"
                      stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="square"
                    />
                  </svg>
                </div>
              )}

              <Link 
                href="/" onClick={handleLogoClick} 
                className={`relative -top-2 block h-[70px] w-[432px] max-w-full shrink-0 ${isAnimating ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <Image 
                  src={logoSrc} 
                  alt="The Polytechnic" 
                  fill 
                  className="object-contain object-left"
                  priority 
                />
              </Link>

              <nav className="font-meta relative mr-4 flex flex-wrap items-center justify-end gap-x-7 gap-y-1.5 pb-0">
                {primaryNavItems.map((item) => (
                  <Link key={item.label} href={item.href} className="relative py-0.5 text-[16px] font-semibold uppercase tracking-[0.08em] text-text-main hover:text-accent transition-colors">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      {isSearchOverlayOpen && <SearchOverlay onClose={() => setIsSearchOverlayOpen(false)} />}
    </>
  );
}