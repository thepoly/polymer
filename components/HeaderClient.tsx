"use client";

import { startTransition, useState, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import SearchOverlay, { SearchOverlayTrigger } from "@/components/SearchOverlay";
import { MobileMenuDrawer, primaryNavItems, secondaryNavItems, isExternalHref } from "@/components/MobileMenuDrawer";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import {
  shouldAnimateHeaderTransition,
  shouldRenderAnimatedHeader,
} from "@/components/headerAnimationRoutes";
// import MaraudersFootsteps from "@/components/MaraudersFootsteps";
import { useTheme } from "@/components/ThemeProvider";
import type { ThemeLogoSrcs } from "@/lib/getTheme";
const HOME_DARK_MODE_PROMPT_COOKIE = "home-dark-mode-prompt-seen";

// Header wave fleet: waves fan out from a single start point, converge back at the end.
const HEADER_WAVE_LAMBDA = 320;
const HEADER_WAVE_SVG_H = 16;
const HEADER_WAVE_CONVERGE = 4 * HEADER_WAVE_LAMBDA; // 1280px — where waves fully pinch
const HEADER_WAVE_FLEET = (() => {
  const half = HEADER_WAVE_LAMBDA / 2;
  const cp = Math.round(0.3642 * half);
  const baseline = HEADER_WAVE_SVG_H / 2;
  const startX = -4;
  const rampUp = HEADER_WAVE_LAMBDA * 0.6;
  const rampDown = HEADER_WAVE_LAMBDA * 1.2;

  // Envelope: 0 at start, ramps to 1, back to 0 at converge point, stays 0 after
  const envelope = (x: number) => {
    const t = x - startX;
    if (t <= 0) return 0;
    if (t < rampUp) return t / rampUp;
    if (t < HEADER_WAVE_CONVERGE - rampDown) return 1;
    if (t < HEADER_WAVE_CONVERGE) return (HEADER_WAVE_CONVERGE - t) / rampDown;
    return 0;
  };

  const specs = [
    { cy: 2,    A: 3.2, opacity: 0.4,  delay: 0.10 },
    { cy: 6,    A: 4.0, opacity: 0.7,  delay: 0.05 },
    { cy: 10,   A: 4.6, opacity: 1,    delay: 0 },
    { cy: 14,   A: 3.2, opacity: 0.4,  delay: 0.08 },
  ];

  const convergeEndX = startX + HEADER_WAVE_CONVERGE;
  // Generate enough half-periods to reach past the convergence, then truncate
  const maxHalves = Math.ceil(HEADER_WAVE_CONVERGE / half) + 2;

  return specs.map(({ cy, A, opacity, delay }) => {
    let d = `M ${startX},${baseline}`;

    for (let n = 0; n < maxHalves; n++) {
      const x0 = startX + n * half;
      const x1 = startX + (n + 1) * half;

      // Stop once we've passed the convergence point
      if (x0 >= convergeEndX) break;

      const e0 = envelope(x0);
      const e1 = envelope(x1);
      const eMid = envelope((x0 + x1) / 2);

      const y0 = baseline + (cy - baseline) * e0;
      const y1 = baseline + (cy - baseline) * e1;
      const peakA = A * eMid;
      const sign = n % 2 === 0 ? -1 : 1;

      d += ` C ${x0 + cp},${y0 + sign * peakA} ${x1 - cp},${y1 + sign * peakA} ${x1},${y1}`;
    }

    // Snap to the exact convergence point on the baseline
    d += ` L ${convergeEndX},${baseline}`;

    return { d, opacity, delay };
  });
})();

function formatCurrentDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function subscribeToHydration(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const timeout = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timeout);
}

function useCurrentDate() {
  return useSyncExternalStore(subscribeToHydration, formatCurrentDate, () => "");
}

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

export type HeaderLogoSrcs = ThemeLogoSrcs

export default function Header({ compact = false, mobileTight = false, logoSrcs }: { compact?: boolean; mobileTight?: boolean; logoSrcs?: HeaderLogoSrcs }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [showDarkModePrompt, setShowDarkModePrompt] = useState(false);
  const currentDate = useCurrentDate();
  const { animationKey, phase, isAnimating, navigateImmediately, triggerTransition, suckDurationMs, shootDurationMs } = useHeaderTransition();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const logoSrc = isDarkMode ? (logoSrcs?.desktopDark ?? "/logo-dark.svg") : (logoSrcs?.desktopLight ?? "/logo-light.svg");
  const mobileLogoSrc = isDarkMode ? (logoSrcs?.mobileDark ?? "/logo-dark-mobile.svg") : (logoSrcs?.mobileLight ?? "/logo-light-mobile.svg");
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const shouldEnableAnimatedHeaderTransition =
    phase !== "idle" || shouldRenderAnimatedHeader(currentPath);
  const logoOutlineLeftX = -4;
  const logoOutlineRightX = 464;
  const logoOutlineTopY = -89.5;
  const logoBaselineY = 0.5;
  const shootWrapPathLength = (logoOutlineRightX - logoOutlineLeftX) + (logoBaselineY - logoOutlineTopY) * 2;
  const shootWrapPathD = `M ${logoOutlineRightX} ${logoBaselineY} V ${logoOutlineTopY} H ${logoOutlineLeftX} V ${logoBaselineY}`;

  const openSearchOverlay = () => {
    setIsSearchOverlayOpen(true);
  };

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
    if (!href.startsWith("/")) return;
    const currentRoute = pathname ?? window.location.pathname;

    if (isAnimating) {
      e.preventDefault();
      setIsMobileMenuOpen(false);
      navigateImmediately({
        href,
        navigate: (nextHref) => {
          startTransition(() => {
            router.push(nextHref);
          });
        },
      });
      return;
    }

    e.preventDefault();
    setIsMobileMenuOpen(false);

    if (!shouldAnimateHeaderTransition(currentRoute, href)) {
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
      <header className={`${compact ? "sticky top-0" : ""} ${mobileTight ? "mobile-header-tight" : ""} safe-area-top z-50 bg-bg-main lg:hidden`}>
        <div className="mobile-chrome-header-inner safe-area-mobile-header-x mx-auto max-w-[1280px]">
            <div className="grid h-[56px] grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex justify-start">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="relative -top-[2px] flex h-9 w-9 items-center justify-center overflow-hidden text-text-main">
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
            </div>
            <Link
              href="/"
              onClick={(e) => handleLinkClick(e, "/")}
              onMouseEnter={() => prefetchLink("/")}
              onFocus={() => prefetchLink("/")}
              className="relative block h-[56px] w-[min(72vw,300px)] justify-self-center"
            >
              <Image
                src={mobileLogoSrc}
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority
              />
            </Link>
            <div className="flex justify-end">
              <button onClick={openSearchOverlay} className="relative -top-[2px] flex h-9 w-9 items-center justify-center text-text-main">
                <span className="relative block h-5 w-5">
                  <Search className="absolute inset-0 m-auto h-4 w-4" />
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 border-y border-black dark:border-[#DDDDDD]">
          <div className="font-meta safe-area-mobile-header-x mx-auto flex max-w-[1280px] items-center justify-center gap-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em]">
            <span className="text-text-main" suppressHydrationWarning>{currentDate}</span>
            <span className="text-accent font-semibold dark:text-text-main">Vol. XCI No. 22</span>
          </div>
        </div>
      </header>

      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpen={() => setIsMobileMenuOpen(true)}
        handleLinkClick={handleLinkClick}
        isDarkMode={isDarkMode}
        onThemeToggle={() => {
          triggerThemeTransition(window.innerWidth, 0, () => {
            setIsMobileMenuOpen(false);
            toggleDarkMode();
          });
        }}
        onSearchOpen={() => {
          setIsMobileMenuOpen(false);
          openSearchOverlay();
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
                  onMouseEnter={() => !isExternalHref(item.href) && prefetchLink(item.href)}
                  onFocus={() => !isExternalHref(item.href) && prefetchLink(item.href)}
                  target={isExternalHref(item.href) ? "_blank" : undefined}
                  rel={isExternalHref(item.href) ? "noopener noreferrer" : undefined}
                  className="transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.1em]">
              <span className="text-text-main" suppressHydrationWarning>{currentDate}</span>
              <span className="text-accent font-semibold dark:text-text-main">Vol. XCI No. 22</span>
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
              
              <SearchOverlayTrigger onClick={openSearchOverlay} />

            </div>
          </div>
        </div>

        {!compact && (
          <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-6 xl:px-[30px]">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes terryWrapDraw {
                0% { stroke-dashoffset: ${shootWrapPathLength}; }
                35% { stroke-dashoffset: 0; }
                40% { stroke-dashoffset: 0; }
                75% { stroke-dashoffset: -${shootWrapPathLength}; }
                100% { stroke-dashoffset: -${shootWrapPathLength}; }
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
              @keyframes headerWaveDraw {
                0%   { stroke-dashoffset: 100; }
                35%  { stroke-dashoffset: 100; }
                93%  { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes headerWaveCrystallize {
                0%   { opacity: 1; }
                65%  { opacity: 1; }
                85%  { opacity: 0.4; }
                100% { opacity: 0; }
              }
              @keyframes headerRainbowHue {
                from { filter: hue-rotate(0deg); }
                to   { filter: hue-rotate(360deg); }
              }
            `}} />

            <div className="relative flex items-end justify-between gap-8 pb-0.5">
              <div
                className={`absolute -left-1 right-0 bottom-0 h-px overflow-visible pointer-events-none ${
                  isDarkMode ? "text-[#DDDDDD]" : "text-rule-strong"
                } ${
                  isAnimating ? "opacity-0" : "opacity-100"
                }`}
              >
                <svg className="absolute left-0 bottom-0 w-full h-px overflow-visible">
                  <line
                    x1={logoOutlineLeftX}
                    y1={logoBaselineY}
                    x2="100%"
                    y2={logoBaselineY}
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    strokeLinecap="square"
                  />
                </svg>
              </div>

              <div
                key={`static-${animationKey}`}
                className={`absolute -left-1 right-0 bottom-0 h-px overflow-visible pointer-events-none ${
                  isDarkMode ? "text-[#DDDDDD]" : "text-rule-strong"
                } ${
                  shouldEnableAnimatedHeaderTransition && phase === "sucking"
                    ? "animate-terry-suck"
                    : "opacity-0"
                }`}
              >
                <svg className="absolute left-0 bottom-0 w-full h-px overflow-visible">
                  <line
                    x1={logoOutlineLeftX}
                    y1={logoBaselineY}
                    x2="100%"
                    y2={logoBaselineY}
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    strokeLinecap="square"
                  />
                </svg>
              </div>
              
              {shouldEnableAnimatedHeaderTransition && phase === "shooting" && (
                <div
                  key={`animated-${animationKey}`}
                  className={`absolute -left-1 right-0 bottom-0 h-px overflow-visible pointer-events-none ${
                    isDarkMode ? "text-[#DDDDDD]" : "text-rule-strong"
                  }`}
                >
                  {/* Wrap path (around logo) + base line drawing underneath */}
                  <svg className="absolute left-0 bottom-0 w-full h-px overflow-visible">
                    <path
                      d={shootWrapPathD}
                      stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="square"
                      style={{
                        strokeDasharray: shootWrapPathLength,
                        strokeDashoffset: shootWrapPathLength,
                        animation: `terryWrapDraw ${shootDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                      }}
                    />
                    <line
                      x1={logoOutlineLeftX} y1={logoBaselineY} x2="100%" y2={logoBaselineY}
                      pathLength="100"
                      stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="square"
                      style={{
                        strokeDasharray: 100,
                        strokeDashoffset: 100,
                        animation: `terryShootDraw ${shootDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                      }}
                    />
                  </svg>

                  {/* Rainbow wave fleet — draws in via dashoffset, crystallizes to static line */}
                  <svg
                    className="absolute"
                    viewBox={`-4 0 ${HEADER_WAVE_CONVERGE} ${HEADER_WAVE_SVG_H}`}
                    preserveAspectRatio="none"
                    height={HEADER_WAVE_SVG_H}
                    style={{
                      left: '-4px',
                      width: 'calc(100% + 4px)',
                      bottom: `-${HEADER_WAVE_SVG_H / 2}px`,
                      animation: `headerRainbowHue 4s linear infinite, headerWaveCrystallize ${shootDurationMs}ms ease-out forwards`,
                      willChange: 'filter, opacity',
                    }}
                  >
                      <defs>
                        <linearGradient id={`header-wave-rainbow-${animationKey}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%"   stopColor="#ff4040" stopOpacity="0.9" />
                          <stop offset="14%"  stopColor="#ff9900" stopOpacity="0.9" />
                          <stop offset="28%"  stopColor="#ffee00" stopOpacity="0.9" />
                          <stop offset="42%"  stopColor="#44dd44" stopOpacity="0.9" />
                          <stop offset="57%"  stopColor="#22cccc" stopOpacity="0.9" />
                          <stop offset="71%"  stopColor="#4488ff" stopOpacity="0.9" />
                          <stop offset="85%"  stopColor="#cc44ff" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#ff4040" stopOpacity="0.9" />
                        </linearGradient>
                      </defs>
                      {HEADER_WAVE_FLEET.map((wave, i) => (
                        <path
                          key={i}
                          d={wave.d}
                          pathLength="100"
                          stroke={`url(#header-wave-rainbow-${animationKey})`}
                          strokeWidth="1"
                          strokeLinecap="round"
                          fill="none"
                          opacity={wave.opacity}
                          style={{
                            strokeDasharray: 100,
                            strokeDashoffset: 100,
                            animation: `headerWaveDraw ${shootDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) ${wave.delay * shootDurationMs}ms forwards`,
                          }}
                        />
                      ))}
                  </svg>
                </div>
              )}

              <Link
                href="/"
                onClick={(e) => handleLinkClick(e, "/")}
                onMouseEnter={() => prefetchLink("/")}
                onFocus={() => prefetchLink("/")}
                className="relative -top-2 block h-[76px] w-[456px] max-w-full shrink-0 cursor-pointer"
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

      {/* <MaraudersFootsteps /> */}
      {isSearchOverlayOpen && <SearchOverlay onClose={() => setIsSearchOverlayOpen(false)} />}
    </>
  );
}
