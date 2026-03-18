"use client";

import { startTransition, useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import { ANIMATED_HEADER_ROUTES } from "@/components/headerAnimationRoutes";
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
  { label: "Submit", href: "mailto:edop@poly.rpi.edu?subject=Submitting%20Edop%3A%20%22%5BARTICLE%20TITLE%20HERE%5D%22&body=Thank%20you%20for%20submitting%20an%20Editorial%2FOpinion%20article%20to%20%F0%9D%98%9B%F0%9D%98%A9%F0%9D%98%A6%20%F0%9D%98%97%F0%9D%98%B0%F0%9D%98%AD%F0%9D%98%BA%F0%9D%98%B5%F0%9D%98%A6%F0%9D%98%A4%F0%9D%98%A9%F0%9D%98%AF%F0%9D%98%AA%F0%9D%98%A4%21%20Please%20replace%20%5BARTICLE%20TITLE%20HERE%5D%20in%20the%20subject%20line%20with%20the%20title%20of%20your%20article%2C%20and%20sign%20this%20email%20with%20your%20name.%20Attach%20your%20article%20as%20a%20PDF.%20Thanks%21%0A%0A%F0%9D%98%9B%F0%9D%98%A9%F0%9D%98%A6%20%F0%9D%98%97%F0%9D%98%B0%F0%9D%98%AD%F0%9D%98%BA%F0%9D%98%B5%F0%9D%98%A6%F0%9D%98%A4%F0%9D%98%A9%F0%9D%98%AF%F0%9D%98%AA%F0%9D%98%A4" },
];

const DRAWER_WIDTH = 0.78; // fraction of viewport
const SWIPE_THRESHOLD = 50;
const EDGE_ZONE = 24;
const HOME_DARK_MODE_PROMPT_COOKIE = "home-dark-mode-prompt-seen";

function triggerThemeTransition(x: number, y: number, apply: () => void) {
  const root = document.documentElement;
  const maxR = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  root.style.setProperty("--theme-x", `${x}px`);
  root.style.setProperty("--theme-y", `${y}px`);
  root.style.setProperty("--theme-r", `${maxR}px`);

  if ("startViewTransition" in document && typeof document.startViewTransition === "function") {
    root.classList.add("theme-switching");
    const t = document.startViewTransition(() => apply());
    t.finished.then(() => root.classList.remove("theme-switching"));
  } else {
    apply();
  }
}

function MobileMenuDrawer({
  isOpen,
  onClose,
  onOpen,
  primaryNavItems,
  secondaryNavItems,
  handleLinkClick,
  isDarkMode,
  onThemeToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  primaryNavItems: { label: string; href: string }[];
  secondaryNavItems: { label: string; href: string }[];
  handleLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}) {
  const [dragX, setDragX] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const getDrawerPx = useCallback(() => {
    if (typeof window === "undefined") return 300;
    return window.innerWidth * DRAWER_WIDTH;
  }, []);

  useEffect(() => {
    if (isOpen) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= EDGE_ZONE) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
        isDraggingRef.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      if (dy > Math.abs(dx) && !isDraggingRef.current) {
        touchStartRef.current = null;
        return;
      }
      if (dx > 10) {
        isDraggingRef.current = true;
        e.preventDefault();
        setDragX(Math.min(dx, getDrawerPx()));
      }
    };

    const onTouchEnd = () => {
      if (isDraggingRef.current && dragX !== null) {
        if (dragX > SWIPE_THRESHOLD) {
          onOpen();
        }
        setDragX(null);
      }
      touchStartRef.current = null;
      isDraggingRef.current = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, dragX, onOpen, getDrawerPx]);

  useEffect(() => {
    if (!isOpen) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      isDraggingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      if (dy > Math.abs(dx) && !isDraggingRef.current) {
        touchStartRef.current = null;
        return;
      }
      if (dx < -10) {
        isDraggingRef.current = true;
        e.preventDefault();
        const drawerPx = getDrawerPx();
        setDragX(Math.max(0, drawerPx + dx));
      }
    };

    const onTouchEnd = () => {
      if (isDraggingRef.current && dragX !== null) {
        if (dragX < getDrawerPx() - SWIPE_THRESHOLD) {
          onClose();
        }
        setDragX(null);
      }
      touchStartRef.current = null;
      isDraggingRef.current = false;
    };

    const panel = panelRef.current;
    if (!panel) return;
    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });
    panel.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
      panel.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, dragX, onClose, getDrawerPx]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const showDrawer = isOpen || dragX !== null;
  if (!showDrawer) return null;

  const drawerPx = getDrawerPx();
  const translateX = dragX !== null ? dragX - drawerPx : isOpen ? 0 : -drawerPx;
  const progress = dragX !== null ? dragX / drawerPx : isOpen ? 1 : 0;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: `rgba(0,0,0,${0.4 * progress})` }}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="absolute top-0 left-0 bottom-0 bg-bg-main shadow-2xl will-change-transform"
        style={{
          width: `${DRAWER_WIDTH * 100}vw`,
          transform: `translateX(${translateX}px)`,
          transition: dragX !== null ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="safe-area-mobile-drawer flex h-full flex-col overflow-y-auto">
          <button
            onClick={onClose}
            className="mb-8 flex h-10 w-10 items-center justify-center self-end text-text-main"
          >
            <X className="h-6 w-6" />
          </button>

          <nav className="flex flex-col gap-1">
            {primaryNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className="font-display text-[32px] font-bold uppercase tracking-[0.04em] text-text-main transition-colors hover:text-accent py-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 border-t border-rule pt-6 flex flex-col gap-3">
            {secondaryNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className="font-meta text-[15px] font-medium tracking-[0.04em] text-text-muted transition-colors hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-8 border-t border-rule pt-6 flex items-center gap-4">
            <button
              onClick={onThemeToggle}
              className={`flex items-center gap-2 font-meta text-[14px] font-medium transition-colors ${
                isDarkMode
                  ? "cursor-pointer text-text-muted hover:text-white"
                  : "cursor-pointer text-text-muted hover:text-black"
              }`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDarkMode ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header({ compact = false }: { compact?: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [showDarkModePrompt, setShowDarkModePrompt] = useState(false);
  const { animationKey, phase, isAnimating, triggerTransition, suckDurationMs, shootDurationMs } = useHeaderTransition();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark.svg" : "/logo-light.svg";
  const mobileLogoSrc = isDarkMode ? "/logo-dark-mobile.svg" : "/logo-light-mobile.svg";
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const shouldEnableAnimatedHeaderTransition =
    phase !== "idle" || ANIMATED_HEADER_ROUTES.has(currentPath);
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const prefetchLink = (href: string) => {
    if (!href.startsWith("/")) return;

    try {
      router.prefetch(href);
    } catch {
      // Prefetch failures should not block navigation.
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (href.startsWith("mailto:")) return;

    e.preventDefault();
    setIsMobileMenuOpen(false);

    const currentRoute = pathname ?? window.location.pathname;
    if (!ANIMATED_HEADER_ROUTES.has(href)) {
      startTransition(() => {
        router.push(href);
      });
      return;
    }

    triggerTransition({
      href,
      currentPath: currentRoute,
      navigate: (nextHref) => {
        startTransition(() => {
          router.push(nextHref);
        });
      },
      prefetch: prefetchLink,
    });
  };

  useEffect(() => {
    if (compact || currentPath !== "/" || isDarkMode || showDarkModePrompt) return;
    if (typeof window === "undefined" || !window.matchMedia("(min-width: 1024px)").matches) return;
    if (document.cookie.includes(`${HOME_DARK_MODE_PROMPT_COOKIE}=1`)) return;

    document.cookie = `${HOME_DARK_MODE_PROMPT_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
    const showTimeout = window.setTimeout(() => {
      setShowDarkModePrompt(true);
    }, 0);

    const timeout = window.setTimeout(() => {
      setShowDarkModePrompt(false);
    }, 7000);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(timeout);
    };
  }, [compact, currentPath, isDarkMode, showDarkModePrompt]);

  return (
    <>
      <header className={`${compact ? "sticky top-0" : ""} safe-area-top z-50 bg-bg-main lg:hidden`}>
        <div className="mobile-chrome-header-inner safe-area-mobile-header-x mx-auto flex h-[56px] max-w-[1280px] items-center justify-between">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex h-9 w-9 items-center justify-center overflow-hidden text-text-main">
            <span className="relative block h-5 w-5">
              <Menu
                className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
                  isMobileMenuOpen ? "-translate-x-6 opacity-0" : "translate-x-0 opacity-100"
                }`}
              />
              <X
                className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
                  isMobileMenuOpen ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
                }`}
              />
            </span>
          </button>
          <Link
            href="/"
            onClick={(e) => handleLinkClick(e, "/")}
            onMouseEnter={() => prefetchLink("/")}
            onFocus={() => prefetchLink("/")}
            className="relative block h-[56px] w-full max-w-[300px]"
          >
            <Image src={mobileLogoSrc} alt="The Polytechnic" fill className="object-contain" priority />
          </Link>
          <button onClick={() => setIsSearchOverlayOpen(true)} className="flex h-9 w-9 items-center justify-center text-text-main">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </header>

      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpen={() => setIsMobileMenuOpen(true)}
        primaryNavItems={primaryNavItems}
        secondaryNavItems={secondaryNavItems}
        handleLinkClick={handleLinkClick}
        isDarkMode={isDarkMode}
        onThemeToggle={() => {
          triggerThemeTransition(window.innerWidth, 0, () => {
            setIsMobileMenuOpen(false);
            toggleDarkMode();
          });
        }}
      />

      <header className="hidden lg:block">
        <div className={`${compact ? "fixed" : "relative"} top-0 left-0 right-0 z-50 bg-bg-main/95 backdrop-blur-md`}>
          <div className="font-meta relative mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 pt-1.5 pb-0.5 md:px-6 xl:px-[30px]">
            <div className="flex items-center gap-5 text-[11px] font-medium uppercase tracking-[0.1em] text-text-main">
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  onMouseEnter={() => prefetchLink(item.href)}
                  onFocus={() => prefetchLink(item.href)}
                  className="transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">
              <span className="text-text-main">{currentDate}</span>
              <span className="text-accent font-semibold">Vol. XCI No. 22</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                    isDarkMode
                      ? "border-rule text-text-main hover:border-white hover:bg-white hover:text-black"
                      : "border-rule text-text-main hover:border-black hover:bg-black hover:text-white"
                  }`}
                  onClick={(e) => {
                    setShowDarkModePrompt(false);
                    const rect = e.currentTarget.getBoundingClientRect();
                    triggerThemeTransition(
                      rect.left + rect.width / 2,
                      rect.top + rect.height / 2,
                      () => toggleDarkMode(),
                    );
                  }}
                >
                  {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>

                {showDarkModePrompt && (
                  <div className="absolute right-0 top-full z-[110] mt-3 w-[280px]">
                    <div className="absolute -top-[7px] right-2 h-4 w-4 rotate-45 border-l border-t border-border-main bg-bg-main" />
                    <div className="relative rounded-md border border-border-main bg-bg-main px-4 py-3 shadow-lg">
                      <button
                        onClick={() => setShowDarkModePrompt(false)}
                        className="absolute right-2 top-2 font-meta text-[11px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-main"
                        aria-label="Dismiss dark mode prompt"
                      >
                        Close
                      </button>
                      <p className="pr-12 font-meta text-[13px] leading-[1.35] text-text-main">
                        Try dark mode. You won&apos;t regret it. It&apos;s better than light mode.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                className="group relative flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-text-main" 
                onClick={() => setIsSearchOverlayOpen(true)}
              >
                <span 
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-full p-[1px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude"
                  }}
                >
                  <span className="absolute left-1/2 top-1/2 aspect-square w-[300%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)]" />
                </span>
                
                <Search className="relative z-10 h-3.5 w-3.5 shrink-0" />
                <span className="relative z-10 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em]">Search</span>
              </button>

            </div>
          </div>
        </div>

        {!compact && (
          <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-6 xl:px-[30px]">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes terryWrapDraw {
                0% { stroke-dashoffset: 648; }
                35% { stroke-dashoffset: 0; }
                95% { stroke-dashoffset: -648; }
                100% { stroke-dashoffset: -648; }
              }
                35% { stroke-dashoffset: 0; }
                40% { stroke-dashoffset: 0; }
                75% { stroke-dashoffset: -648; }
                100% { stroke-dashoffset: -648; }
              }
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
              .animate-terry-suck {
                animation: terrySuck ${suckDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
                transform-origin: 468px 0.5px;
              }
            `}} />

            <div className="relative flex items-end justify-between gap-8 pb-0.5">
              <div
                className={`absolute -left-1 right-0 bottom-0 h-px bg-rule-strong ${
                  shouldEnableAnimatedHeaderTransition && isAnimating ? "opacity-0" : "opacity-100"
                }`}
              />

              <div 
                key={`static-${animationKey}`} 
                className={`absolute -left-1 right-0 bottom-0 h-px bg-rule-strong ${
                  shouldEnableAnimatedHeaderTransition && phase === "sucking"
                    ? "animate-terry-suck"
                    : "opacity-0"
                }`} 
              />
              
              {shouldEnableAnimatedHeaderTransition && phase === "shooting" && (
                <div key={`animated-${animationKey}`} className="absolute inset-x-0 bottom-0 h-px overflow-visible pointer-events-none text-rule-strong">
                  <svg className="absolute left-0 bottom-0 w-full h-px overflow-visible">
                    <path
                      d="M 464 0.5 V -89.5 H -4 V 0.5"
                      stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="square"
                      style={{
                        strokeDasharray: 648,
                        strokeDashoffset: 648,
                        animation: `terryWrapDraw ${shootDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                      }}
                    />
                    <line
                      x1="-4" y1="0.5" x2="100%" y2="0.5"
                      pathLength="100"
                      stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="square"
                      style={{
                        strokeDasharray: 100,
                        strokeDashoffset: 100,
                        animation: `terryShootDraw ${shootDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                      }}
                    />
                  </svg>
                </div>
              )}

              <Link 
                href="/"
                onClick={(e) => handleLinkClick(e, "/")}
                onMouseEnter={() => prefetchLink("/")}
                onFocus={() => prefetchLink("/")}
                className={`relative -top-2 block h-[76px] w-[456px] max-w-full shrink-0 ${isAnimating ? 'cursor-default' : 'cursor-pointer'}`}
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
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item.href)}
                    onMouseEnter={() => prefetchLink(item.href)}
                    onFocus={() => prefetchLink(item.href)}
                    className="relative py-0.5 text-[16px] font-semibold uppercase tracking-[0.08em] text-text-main hover:text-accent transition-colors"
                  >
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
