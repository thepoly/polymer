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

  // Calculate the drawer width in pixels
  const getDrawerPx = useCallback(() => {
    if (typeof window === "undefined") return 300;
    return window.innerWidth * DRAWER_WIDTH;
  }, []);

  // Edge swipe to open
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

  // Swipe to close when open
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

  // Prevent body scroll when open
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
      {/* Backdrop — blurred right gap */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: `rgba(0,0,0,${0.4 * progress})` }}
        onClick={onClose}
      />

      {/* Drawer panel */}
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
          {/* Close button */}
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
              className="flex items-center gap-2 font-meta text-[14px] font-medium text-text-muted hover:text-accent transition-colors"
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

  return (
    <>
      {/* ── MOBILE HEADER ── */}
      <header className={`${compact ? "sticky top-0" : ""} safe-area-top z-50 bg-bg-main lg:hidden`}>
        <div className="safe-area-mobile-header-x mx-auto flex h-[56px] max-w-[1280px] items-center justify-between">
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

      {/* ── MOBILE MENU DRAWER ── */}
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

      {/* ── DESKTOP HEADER ── */}
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
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full border border-rule text-text-main hover:border-accent hover:text-accent"
                onClick={(e) => {
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
              .animate-terry-suck {
                animation: terrySuck ${suckDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
                transform-origin: 440px 0.5px;
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
                      d="M 436 0.5 V -89.5 H -4 V 0.5"
                      stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="square"
                      style={{
                        strokeDasharray: 620,
                        strokeDashoffset: 620,
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
