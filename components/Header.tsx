"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";

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

const desktopUtilityItems = [
  { label: "Contact", href: "/contact" },
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

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [weather, setWeather] = useState<HeaderWeather | null>(null);

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
      <header className="sticky top-0 z-50 border-b border-header-border bg-header-nav lg:hidden">
        <div className="font-ui border-b border-header-border/70 bg-header-nav px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-header-nav-text">
          <div className="relative mx-auto flex max-w-[1280px] items-center justify-end gap-3">
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 truncate text-center">
              {currentDate}
            </span>
            <span className="shrink-0">Vol. XCI No. 22</span>
          </div>
        </div>

        <div className="mx-auto flex h-[74px] max-w-[1280px] items-center justify-between gap-3 px-3 sm:h-[90px]">
          <button
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border-main/70 bg-bg-main text-header-nav-text transition-colors hover:border-accent hover:text-accent"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="relative block h-[46px] w-full max-w-[260px] sm:h-[62px]">
            <Image
              src="/logo.svg"
              alt="The Polytechnic"
              fill
              style={{ filter: "var(--logo-filter)" }}
              className="object-contain"
              priority
            />
          </Link>

          <Link
            href="/submit"
            className="rounded-full border border-accent bg-accent px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#b30018]"
          >
            Submit
          </Link>
        </div>

        <div className="border-t border-header-border/70 px-4 pb-3 pt-2.5 text-center">
          <p className="font-copy text-[12px] text-text-muted">
            Serving the Rensselaer community since 1885.
          </p>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-[140px] z-[60] overflow-y-auto border-t border-header-border bg-header-nav sm:top-[156px]">
            <div className="mx-auto flex max-w-[1280px] flex-col px-6 pb-8 pt-6">
              <div className="mb-8 flex items-center justify-between border-b border-border-main pb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                <span>{weatherLocation}</span>
                <span>Vol. XCI No. 22</span>
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

      <header className="hidden border-b border-header-border bg-header-nav lg:block">
        <div className="border-b border-header-border bg-header-nav">
          <div className="font-ui relative mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 py-2.5 md:px-6 xl:px-[30px]">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.24em] text-header-nav-text">
              <Link href="/about" className="transition-colors hover:text-accent">
                About
              </Link>
              <Link href="/archives" className="transition-colors hover:text-accent">
                Archives
              </Link>
              <Link href="/staff" className="transition-colors hover:text-accent">
                Staff
              </Link>
            </div>

            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
              {currentDate}
            </div>

            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.24em] text-header-nav-text">
              <Link
                href="/submit"
                className="rounded-full border border-accent bg-accent px-3 py-2 text-white transition-colors hover:bg-[#b30018]"
              >
                Submit
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1280px] grid-cols-[240px_minmax(0,1fr)_240px] items-center gap-8 px-4 py-6 md:px-6 xl:px-[30px]">
          <div className="flex min-h-[112px] flex-col justify-between border-r border-header-border pr-6">
            <div className="font-ui flex items-center gap-2 text-text-muted">
              <Search className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Search</span>
            </div>

            <div className="space-y-2">
              <p className="font-copy text-[28px] leading-none text-text-main">{weatherLine}</p>
              <p className="font-ui text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                {weatherLocation}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center px-2">
            <Link href="/" className="relative block h-[112px] w-[620px] max-w-full">
              <Image
                src="/logo.svg"
                alt="The Polytechnic"
                fill
                style={{ filter: "var(--header-logo-invert)" }}
                className="object-contain"
                priority
              />
            </Link>
            <p className="font-copy mt-2 text-[16px] leading-none text-text-muted">
              Serving the Rensselaer community since 1885.
            </p>
          </div>

          <div className="flex min-h-[112px] flex-col items-end justify-center border-l border-header-border pl-6 text-right">
            <p className="font-ui text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              Vol. XCI No. 22
            </p>
          </div>
        </div>

        <div className="border-y-[3px] border-double border-header-border">
          <div className="font-ui mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-4 py-3 md:px-6 xl:px-[30px]">
            <nav className="flex flex-wrap items-center gap-x-7 gap-y-2">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[14px] font-bold uppercase tracking-[0.18em] text-header-nav-text transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
              {desktopUtilityItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[12px] font-bold uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
