"use client";

import { startTransition, useState, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { toRoman } from "@/lib/toRoman";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Cloudy, Menu, Moon, Search, Sun, Wind, X } from "lucide-react";
import { SearchOverlayTrigger } from "@/components/SearchOverlay";
import { openSearchOverlay } from "@/components/SearchOverlayHost";
import { MobileMenuDrawer, primaryNavItems, secondaryNavItems, isExternalHref } from "@/components/MobileMenuDrawer";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import {
  shouldAnimateHeaderTransition,
  shouldRenderAnimatedHeader,
} from "@/components/headerAnimationRoutes";
// import MaraudersFootsteps from "@/components/MaraudersFootsteps";
import { useTheme } from "@/components/ThemeProvider";
import type { ThemeLogoSrcs, HeaderAnimationConfig } from "@/lib/getTheme";
import LiveStrip, { type LiveArticleStripEntry } from "@/components/LiveStrip";
import { HEADER_WAVE_CONVERGE, HEADER_WAVE_SVG_H, generateWaveFleet } from "@/lib/headerWaveFleet";
import { BAR_SLIDE_MS, measureBar, slideBar, type BarSpot } from "@/components/slidingBar";
const HOME_DARK_MODE_PROMPT_COOKIE = "home-dark-mode-prompt-seen";

/**
 * The section bar on the page before this one, so the next page's bar can
 * slide over from it. Each page draws its own header, so this lives outside
 * the component: it survives moving between pages, not a reload. Undefined
 * until a header has drawn on a desktop-width screen; null when that page
 * wasn't in a section (the bar then grows in where it lands).
 */
let lastSectionBar: BarSpot | null | undefined;

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

const DEFAULT_HEADER_ANIMATION: HeaderAnimationConfig = {
  enabled: true,
  waveColor1: '#0044ff',
  waveColor2: '#0088ff',
  waveColor3: '#38bdf8',
  waveCount: 4,
  lineWeight: 1,
  wrapAround: false,
};

export type HeaderWeather = { temperature: number; unit: 'F' | 'C'; shortForecast: string } | null

function pickWeatherIcon(forecast: string): React.ComponentType<{ className?: string }> {
  const f = (forecast || '').toLowerCase();
  if (/thunder|t-storm/.test(f)) return CloudLightning;
  if (/snow|flurries|sleet/.test(f)) return CloudSnow;
  if (/drizzle/.test(f)) return CloudDrizzle;
  if (/rain|shower/.test(f)) return CloudRain;
  if (/fog|mist|haze/.test(f)) return CloudFog;
  if (/wind/.test(f)) return Wind;
  if (/mostly cloudy|overcast/.test(f)) return Cloudy;
  if (/partly cloudy|partly sunny|mostly sunny|few clouds/.test(f)) return Cloud;
  if (/cloud/.test(f)) return Cloudy;
  if (/sunny|clear|fair/.test(f)) return Sun;
  return Cloud;
}

export default function Header({ compact = false, mobileTight = false, logoSrcs, headerAnimation = DEFAULT_HEADER_ANIMATION, volume, edition, liveEntries, weather }: { compact?: boolean; mobileTight?: boolean; logoSrcs?: HeaderLogoSrcs; headerAnimation?: HeaderAnimationConfig; volume?: number | null; edition?: number | null; liveEntries?: LiveArticleStripEntry[]; weather?: HeaderWeather }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDarkModePrompt, setShowDarkModePrompt] = useState(false);
  const currentDate = useCurrentDate();
  const { animationKey, phase, isAnimating, navigateImmediately, triggerTransition, suckDurationMs, shootDurationMs } = useHeaderTransition();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const logoSrc = isDarkMode ? (logoSrcs?.desktopDark ?? "/logo-dark.svg") : (logoSrcs?.desktopLight ?? "/logo-light.svg");
  const mobileLogoSrc = isDarkMode ? (logoSrcs?.mobileDark ?? "/logo-dark-mobile.svg") : (logoSrcs?.mobileLight ?? "/logo-light-mobile.svg");
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  // The section you're in (its front page or anything under it)
  const activeSectionHref =
    primaryNavItems.find((item) => currentPath === item.href || currentPath.startsWith(`${item.href}/`))?.href ?? null;
  const sectionNavRef = useRef<HTMLElement>(null);

  // Slide the section bar over from where it was on the last page. The bar
  // rests inside the active link (plain CSS); this only animates it in.
  useLayoutEffect(() => {
    const nav = sectionNavRef.current;
    const bar = nav?.querySelector<HTMLElement>("[data-slide-bar]") ?? null;
    const measure = (): BarSpot | null => (nav && bar ? measureBar(bar) : null);
    // Below desktop width the section links are hidden: nothing to slide,
    // and a slide on the next page would start from a bogus spot
    if (!nav || nav.getBoundingClientRect().width === 0) {
      lastSectionBar = undefined;
      return;
    }
    const here = measure();
    const previous = lastSectionBar;
    lastSectionBar = here;

    // From the last page's bar, or (from a page outside the sections) a
    // point in the middle of this one, so it grows out both ways. The red
    // ink comes from a red copy of the links (see slidingBar.ts).
    const from: BarSpot | null =
      previous === null && here ? { left: here.left + here.width / 2, width: 0 } : (previous ?? null);
    if (from) slideBar(nav, from, previous === null ? BAR_SLIDE_MS * 0.75 : BAR_SLIDE_MS);

    if (!bar) return;
    // Measure again once the web font is in and on resize, so the next
    // page slides from where the bar really is
    let cancelled = false;
    const save = () => {
      if (cancelled) return;
      const spot = measure();
      if (spot && spot.width > 0) lastSectionBar = spot;
    };
    document.fonts?.ready.then(save);
    window.addEventListener("resize", save);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", save);
    };
  }, [activeSectionHref]);

  const shouldEnableAnimatedHeaderTransition =
    headerAnimation.enabled !== false &&
    (phase !== "idle" || shouldRenderAnimatedHeader(currentPath));
  // The rule starts flush with the page content (x = 0), so it lines up with
  // everything below it; the wrap-around box's left side starts there too
  const logoOutlineLeftX = 0;
  const logoBaselineY = 0.5;
  const logoOutlineRightX = 460;
  const logoOutlineTopY = -89.5;
  const { waveColor1, waveColor2, waveColor3, waveCount, lineWeight, wrapAround } = headerAnimation;
  const waveFleet = generateWaveFleet(waveCount);
  const shootWrapPathLength = wrapAround ? (logoOutlineRightX - logoOutlineLeftX) + (logoBaselineY - logoOutlineTopY) * 2 : 0;
  const shootWrapPathD = wrapAround ? `M ${logoOutlineRightX} ${logoBaselineY} V ${logoOutlineTopY} H ${logoOutlineLeftX} V ${logoBaselineY}` : '';

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
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                className="relative -top-[2px] flex h-9 w-9 items-center justify-center overflow-hidden text-text-main"
              >
                <span aria-hidden="true" className="relative block h-5 w-5">
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
              aria-label="The Polytechnic, home page"
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
              <button onClick={() => openSearchOverlay()} aria-label="Search" className="relative -top-[2px] flex h-9 w-9 items-center justify-center text-text-main">
                <span aria-hidden="true" className="relative block h-5 w-5">
                  <Search className="absolute inset-0 m-auto h-4 w-4" />
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 border-y border-black dark:border-[#DDDDDD]">
          <div className="font-meta safe-area-mobile-header-x mx-auto flex max-w-[1280px] items-center justify-center gap-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em]">
            <span className="text-text-main" suppressHydrationWarning>{currentDate}</span>
            <span className="text-accent font-semibold dark:text-text-main">
                {`Vol. ${volume ? toRoman(volume) : '0'} No. ${edition ?? 0}`}
              </span>
          </div>
        </div>
      </header>

      <MobileMenuDrawer
        id="mobile-menu"
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
          {/* Three columns (links | date | weather + controls), so the date
              stays centred without being laid over the links: at 1024px an
              absolutely centred date ran into "Submit". Vol./No. waits for
              xl, where there's room for it. */}
          <div className="font-meta relative mx-auto grid max-w-[1280px] grid-cols-[1fr_auto_minmax(0,1fr)] items-center gap-6 px-4 pt-1.5 pb-0.5 md:px-6 xl:px-[30px]">
            <div className="flex items-center gap-5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.1em] text-text-main">
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

            <div className="flex items-center gap-2.5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.1em]">
              <span className="text-text-main" suppressHydrationWarning>{currentDate}</span>
              <span className="hidden text-accent font-semibold dark:text-text-main xl:inline">
                {`Vol. ${volume ? toRoman(volume) : '0'} No. ${edition ?? 0}`}
              </span>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-6">
            {weather && (() => {
              const WeatherIcon = pickWeatherIcon(weather.shortForecast);
              const t = Math.max(0, Math.min(1, (weather.temperature - 25) / (80 - 25)));
              // hue 220 (blue) → 360 (red) going through indigo/purple/magenta
              const hue = 220 + 140 * t;
              // darker in light mode for contrast, brighter in dark mode
              const lightness = isDarkMode ? 68 : 42;
              const tempColor = `hsl(${hue.toFixed(0)}, 72%, ${lightness}%)`;
              return (
                // Centred in the space between the date and the controls; a
                // long forecast is cut short before the temperature is
                <div
                  className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] whitespace-nowrap text-text-main"
                  title={weather.shortForecast ? `Troy, NY — ${weather.shortForecast}` : 'Troy, NY'}
                >
                  <WeatherIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {weather.shortForecast && <span className="min-w-0 truncate">{weather.shortForecast}</span>}
                  <span className="shrink-0" style={{ color: tempColor }}>{`${Math.round(weather.temperature)}°`}</span>
                </div>
              );
            })()}

            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <button
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                    isDarkMode
                      ? "border-rule text-text-main hover:border-white hover:bg-white hover:text-black"
                      : "border-rule text-text-main hover:border-black hover:bg-black hover:text-white"
                  }`}
                  aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
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
                  {isDarkMode ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
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
              
              <SearchOverlayTrigger onClick={() => openSearchOverlay()} />

            </div>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-6 xl:px-[30px]">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes terrySuck {
                from { transform: scaleX(1); opacity: 1; }
                to { transform: scaleX(0); opacity: 1; }
              }
              .animate-terry-suck {
                animation: terrySuck ${suckDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
                transform-origin: 464px 0.5px;
              }
              ${wrapAround ? `
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
              ` : ''}
              @keyframes headerWaveDraw {
                0%   { stroke-dashoffset: 100; }
                93%  { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes headerWaveCrystallize {
                0%   { opacity: 1; }
                65%  { opacity: 1; }
                85%  { opacity: 0.4; }
                100% { opacity: 0; }
              }

            `}} />

            <div className="relative">
            <div className="flex items-end justify-between gap-8 pb-0.5">
              <div
                className={`absolute left-0 right-0 bottom-0 h-px overflow-visible pointer-events-none ${
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
                    strokeWidth={lineWeight}
                    fill="none"
                    strokeLinecap="square"
                  />
                </svg>
              </div>

              <div
                key={`static-${animationKey}`}
                className={`absolute left-0 right-0 bottom-0 h-px overflow-visible pointer-events-none ${
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
                    strokeWidth={lineWeight}
                    fill="none"
                    strokeLinecap="square"
                  />
                </svg>
              </div>

              {shouldEnableAnimatedHeaderTransition && phase === "shooting" && (
                <div
                  key={`animated-${animationKey}`}
                  className={`absolute left-0 right-0 bottom-0 h-px overflow-visible pointer-events-none ${
                    isDarkMode ? "text-[#DDDDDD]" : "text-rule-strong"
                  }`}
                >
                  <svg className="absolute left-0 bottom-0 w-full h-px overflow-visible">
                    {wrapAround && (
                      <path
                        d={shootWrapPathD}
                        stroke="currentColor" strokeWidth={lineWeight} fill="none" strokeLinecap="square"
                        style={{
                          strokeDasharray: shootWrapPathLength,
                          strokeDashoffset: shootWrapPathLength,
                          animation: `terryWrapDraw ${shootDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                        }}
                      />
                    )}
                    {wrapAround ? (
                      <line
                        x1={logoOutlineLeftX} y1={logoBaselineY} x2="100%" y2={logoBaselineY}
                        pathLength="100"
                        stroke="currentColor" strokeWidth={lineWeight} fill="none" strokeLinecap="square"
                        style={{
                          strokeDasharray: 100,
                          strokeDashoffset: 100,
                          animation: `terryShootDraw ${shootDurationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                        }}
                      />
                    ) : (
                      <line
                        x1={logoOutlineLeftX} y1={logoBaselineY} x2="100%" y2={logoBaselineY}
                        stroke="currentColor" strokeWidth={lineWeight} fill="none" strokeLinecap="square"
                      />
                    )}
                  </svg>

                  {/* Wave fleet — draws in via dashoffset, crystallizes out */}
                  <svg
                    className="absolute"
                    viewBox={`-4 0 ${HEADER_WAVE_CONVERGE} ${HEADER_WAVE_SVG_H}`}
                    preserveAspectRatio="none"
                    height={HEADER_WAVE_SVG_H}
                    style={{
                      left: 0,
                      width: '100%',
                      bottom: `-${HEADER_WAVE_SVG_H / 2}px`,
                      animation: `headerWaveCrystallize ${shootDurationMs}ms ease-out forwards`,
                      willChange: 'opacity',
                    }}
                  >
                    <defs>
                      <linearGradient id={`header-wave-gradient-${animationKey}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor={waveColor1} stopOpacity="0.9" />
                        <stop offset="25%"  stopColor={waveColor2} stopOpacity="0.9" />
                        <stop offset="50%"  stopColor={waveColor3} stopOpacity="0.9" />
                        <stop offset="75%"  stopColor={waveColor2} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={waveColor1} stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    {waveFleet.map((wave, i) => (
                      <path
                        key={i}
                        d={wave.d}
                        pathLength="100"
                        stroke={`url(#header-wave-gradient-${animationKey})`}
                        strokeWidth={lineWeight}
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
                aria-label="The Polytechnic, home page"
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

              <nav ref={sectionNavRef} className="group/sections font-meta relative mr-4 flex flex-wrap items-center justify-end gap-x-7 gap-y-1.5 pb-0">
                {/* Red copy of the links, shown only while the bar slides:
                    cut to the bar's span, it turns each letter red as the bar
                    passes under (see above). Same layout as the links. */}
                <div
                  aria-hidden="true"
                  data-slide-ink
                  className="pointer-events-none absolute inset-0 z-10 hidden flex-wrap items-center justify-end gap-x-7 gap-y-1.5 group-data-[sliding]/sections:flex"
                >
                  {primaryNavItems.map((item) => (
                    <span
                      key={item.label}
                      className="py-0.5 text-[16px] font-semibold uppercase tracking-[0.08em] text-accent"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
                {primaryNavItems.map((item) => {
                  // The section you're in is set in red with a bar on the
                  // rule, in place of a big title on the section page itself.
                  // The bar slides over between sections (see above); while
                  // it does, the red comes from the copy above instead.
                  const active = item.href === activeSectionHref;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={(e) => handleLinkClick(e, item.href)}
                      onMouseEnter={() => prefetchLink(item.href)}
                      onFocus={() => prefetchLink(item.href)}
                      // No color fade on the active link: it swaps with the
                      // red copy the instant a slide ends
                      className={`relative py-0.5 text-[16px] font-semibold uppercase tracking-[0.08em] ${
                        active
                          ? "text-accent group-data-[sliding]/sections:text-text-main"
                          : "text-text-main transition-colors hover:text-accent"
                      }`}
                    >
                      {item.label}
                      {active && (
                        // z-20: the bar hangs below the header into whatever
                        // comes next (the sports score strip starts on the
                        // rule), which would otherwise paint over its lower half
                        <span
                          aria-hidden="true"
                          data-slide-bar
                          className="pointer-events-none absolute -bottom-[4px] left-0 right-0 z-20 h-[4px] bg-accent"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
            {liveEntries && liveEntries.length > 0 && (
              <div className="relative">
                <div
                  className={`absolute left-0 right-0 top-0 h-px overflow-visible pointer-events-none ${
                    isDarkMode ? "text-[#DDDDDD]" : "text-rule-strong"
                  }`}
                >
                  <svg className="absolute left-0 top-0 w-full h-px overflow-visible">
                    <line
                      x1={logoOutlineLeftX}
                      y1={logoBaselineY}
                      x2="100%"
                      y2={logoBaselineY}
                      stroke="currentColor"
                      strokeWidth={lineWeight}
                      fill="none"
                      strokeLinecap="square"
                    />
                  </svg>
                </div>
                <LiveStrip entries={liveEntries} />
              </div>
            )}
            </div>
          </div>
        )}
      </header>

      {/* Where "Skip to content" (components/SkipLink.tsx) lands: the page
          starts right after the header, wherever a page draws it */}
      <div id="main-content" tabIndex={-1} className="outline-none" />

      {/* <MaraudersFootsteps /> */}
    </>
  );
}
