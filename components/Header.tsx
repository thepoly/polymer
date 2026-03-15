"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";

const primaryNavItems = [
  { label: "News", href: "/news" },
  { label: "Features", href: "/features" },
  { label: "Opinion", href: "/opinion" },
  { label: "Sports", href: "/sports" },
  { label: "Editorial", href: "/editorial" },
];

const secondaryNavItems = [
  { label: "About", href: "/about" },
  { label: "Archives", href: "/archives" },
  { label: "Contact", href: "/contact" },
  { label: "Submit", href: "/submit" },
];

const mobileNavItems = [
  ...primaryNavItems,
  { label: "Staff", href: "/staff" },
  { label: "Checkmate", href: "/checkmate" },
  ...secondaryNavItems,
];

type HeaderWeather = {
  available: boolean;
  city: string;
  state: string;
  shortForecast?: string;
  temperature?: number;
  temperatureUnit?: string;
};

export default function Header({ compact = false }: { compact?: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [weather, setWeather] = useState<HeaderWeather | null>(null);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let isActive = true;

    const loadWeather = async () => {
      try {
        const response = await fetch("/api/weather", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as HeaderWeather;
        if (isActive) {
          setWeather(data);
        }
      } catch {
        if (isActive) {
          setWeather({
            available: false,
            city: "Troy",
            state: "NY",
          });
        }
      }
    };

    loadWeather();
    const interval = window.setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const weatherLine =
    weather?.available && weather.shortForecast && typeof weather.temperature === "number"
      ? `${weather.shortForecast} ${weather.temperature}°`
      : "Weather unavailable";

  const weatherLocation = weather ? `${weather.city}, ${weather.state}` : "Troy, NY";

  return (
    <>
      <header className={`${compact ? "sticky top-0" : ""} z-50 border-b border-header-border bg-header-nav lg:hidden`}>
        <div className="font-cinzel border-b border-header-border/70 bg-header-nav px-4 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-header-nav-text">
          <div className="relative mx-auto flex max-w-[1280px] items-center justify-center gap-2.5">
            <span className="text-text-muted">{currentDate}</span>
            <span className="text-header-border">|</span>
            <span className="text-accent">Vol. XCI No. 22</span>
          </div>
        </div>

        <div className="mx-auto flex h-[56px] max-w-[1280px] items-center justify-between gap-3 px-3 sm:h-[64px]">
          <button
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-main/70 bg-bg-main text-header-nav-text transition-colors hover:border-accent hover:text-accent"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="relative block h-[40px] w-full max-w-[220px] sm:h-[48px] sm:max-w-[260px]">
            <Image
              src="/logo.svg"
              alt="The Polytechnic"
              fill
              style={{ filter: "var(--logo-filter)" }}
              className="object-contain"
              priority
            />
          </Link>

          <button
            onClick={() => setIsSearchOverlayOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-main/70 bg-bg-main text-header-nav-text transition-colors hover:border-accent hover:text-accent"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-[100px] z-[60] overflow-y-auto border-t border-header-border bg-header-nav sm:top-[110px]">
            <div className="mx-auto flex max-w-[1280px] flex-col px-6 pb-8 pt-6">
              <div className="font-cinzel mb-6 border-b border-border-main pb-4 text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
                <span>{weatherLocation}</span>
              </div>

              <nav className="flex flex-col border-t border-border-main">
                {mobileNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between border-b border-border-main py-4 text-2xl font-bold tracking-tight text-header-nav-text transition-colors hover:text-accent"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                    <ArrowUpRight className="h-5 w-5 text-text-muted" />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      <header className="hidden lg:block">
        <div className={`${compact ? "fixed" : "relative"} top-0 left-0 right-0 z-50 border-b border-header-border bg-header-nav/80 backdrop-blur-md`}>
          <div className="font-cinzel relative mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 py-2.5 md:px-6 xl:px-[30px]">
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.08em] text-header-nav-text">
              <Link href="/about" className="transition-colors hover:text-accent">
                About
              </Link>
              <Link href="/archives" className="transition-colors hover:text-accent">
                Archives
              </Link>
              <Link href="/staff" className="transition-colors hover:text-accent">
                Staff
              </Link>
              <Link href="/contact" className="transition-colors hover:text-accent">
                Contact
              </Link>
              <Link href="/submit" className="transition-colors hover:text-accent">
                Submit
              </Link>
            </div>

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.08em]">
              <span className="text-text-muted">{currentDate}</span>
              <span className="text-header-border">|</span>
              <span className="text-accent">Vol. XCI No. 22</span>
            </div>

            <button
              className="flex items-center cursor-pointer"
              onClick={() => setIsSearchOverlayOpen(true)}
              aria-label="Search"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-header-nav-text" />
              <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.08em] text-header-nav-text ml-2">
                Search
              </span>
            </button>
          </div>
        </div>

        {compact && <div className="h-[40px]" />}

        {!compact && (
          <>
            <div className="mx-auto grid max-w-[1280px] grid-cols-[200px_minmax(0,1fr)_200px] items-center gap-4 px-4 py-3 md:px-6 xl:px-[30px]">
              <div className="flex flex-col gap-1.5 justify-center">
                <p className="font-copy text-[22px] leading-none text-text-main">{weatherLine}</p>
                <p className="font-ui text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                  {weatherLocation}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <Link href="/" className="relative block h-[80px] w-[520px] max-w-full">
                  <Image
                    src="/logo.svg"
                    alt="The Polytechnic"
                    fill
                    style={{ filter: "var(--header-logo-invert)" }}
                    className="object-contain"
                    priority
                  />
                </Link>
                <p className="font-copy mt-1 text-[14px] leading-none text-text-muted">
                  Serving the Rensselaer community since 1885.
                </p>
              </div>

              <div />
            </div>

            <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-[30px]">
              <nav className="flex flex-wrap items-center justify-center gap-x-8 border-t border-b border-header-border py-2">
                {primaryNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="font-ui relative py-0.5 text-[15px] font-semibold tracking-[0.02em] text-header-nav-text transition-colors duration-200 hover:text-accent after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-accent after:opacity-0 after:transition-opacity after:duration-200 after:content-[''] hover:after:opacity-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </>
        )}
      </header>

      {isSearchOverlayOpen && (
        <SearchOverlay onClose={() => setIsSearchOverlayOpen(false)} />
      )}
    </>
  );
}
