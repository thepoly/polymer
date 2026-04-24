'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
type MaterialIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type NavItem = {
  label: string;
  href: string;
  icon?: MaterialIcon;
  render?: () => React.ReactNode;
  match?: string;
};

const ICON_SIZE = 24;

function materialIcon(d: string): MaterialIcon {
  const Icon: MaterialIcon = (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill="currentColor"
      {...props}
    >
      <path d={d} />
    </svg>
  );
  Icon.displayName = 'MaterialIcon';
  return Icon;
}

const BreakingNewsIcon = materialIcon(
  'M282-291q9-9 9-21t-9-21q-9-9-21-9t-21 9q-9 9-9 21t9 21q9 9 21 9t21-9Zm-51-161h60v-231h-60v231Zm219 175h279v-60H450v60Zm0-175h279v-60H450v60Zm0-171h279v-60H450v60ZM132-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h696q24 0 42 18t18 42v600q0 24-18 42t-42 18H132Zm0-60h696v-600H132v600Zm0 0v-600 600Z',
);
const FestivalIcon = materialIcon(
  'M85-80q23-67 35-145t15-172q-42-13-68.5-52T40-536v-60q115-40 235-118.5T480-880q85 87 205 165.5T920-596v60q0 48-26 87t-68 52q2 90 14.5 169T876-80H85Zm105-516h580q-73-37-145-87T480-798q-69 62-142 113t-148 89Zm393 145q32 0 52-25.5t20-59.5H510q0 34 20.5 59.5T583-451Zm-205 0q32 0 52-25.5t20-59.5H305q0 34 20.5 59.5T378-451Zm-205 0q32 0 52-25.5t20-59.5H100q0 34 20.5 59.5T173-451Zm-8 311h133q8-51 14-111t11-149q-11-5-25.5-17.5T278-441q-17 20-37.5 32T195-392q-3 72-10.5 133.5T165-140Zm195 0h241q-8-52-13-112t-9-141q-33-2-60.5-16.5T477-449q-14 25-39 39.5T382-393q-4 64-8.5 127T360-140Zm302 0h134q-14-61-21-123.5T766-392q-24-5-42.5-16.5T688-441q-10 14-24 25t-26 16q3 57 8.5 120.5T662-140Zm126-311q32 0 52-25.5t20-59.5H715q0 34 20.5 59.5T788-451Z',
);
const FormatQuoteIcon = materialIcon(
  'm248-240 94-162q-5 1-11 1.5t-11 .5q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 21-5.5 41T458-480L320-240h-72Zm360 0 94-162q-5 1-11 1.5t-11 .5q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 21-5.5 41T818-480L680-240h-72ZM376.5-503.5Q400-527 400-560t-23.5-56.5Q353-640 320-640t-56.5 23.5Q240-593 240-560t23.5 56.5Q287-480 320-480t56.5-23.5Zm360 0Q760-527 760-560t-23.5-56.5Q713-640 680-640t-56.5 23.5Q600-593 600-560t23.5 56.5Q647-480 680-480t56.5-23.5ZM680-560Zm-360 0Z',
);
const SportsHockeyIcon = materialIcon(
  'M80-160v-85q0-18 11-29t29-11h20v125H80Zm104 0v-125h175l43-94 49 97-46 101q-5 11-14.5 16t-21.5 5H184Zm636 0v-125h20q18 0 29 11t11 29v85h-60Zm-44 0H591q-12 0-21.5-5T555-181L273-800h93l114 250 114-250h93L527-447l74 162h175v125Z',
);

const navItems: NavItem[] = [
  { label: 'News', href: '/news', icon: BreakingNewsIcon },
  { label: 'Features', href: '/features', icon: FestivalIcon },
  {
    label: 'Home',
    href: '/',
    match: '/',
    render: () => (
      <Image
        src="/poly-logo-circle.png"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
        priority={false}
      />
    ),
  },
  { label: 'Opinion', href: '/opinion', icon: FormatQuoteIcon },
  { label: 'Sports', href: '/sports', icon: SportsHockeyIcon },
];

function isActive(pathname: string, item: NavItem): boolean {
  const match = item.match ?? item.href;
  if (match === '/') return pathname === '/';
  return pathname === match || pathname.startsWith(`${match}/`);
}

// Only render inside the Android / iOS Capacitor shell; on the mobile web
// the regular hamburger + drawer remain the nav affordance. Capacitor injects
// window.Capacitor after the page loads, so we poll briefly instead of
// checking once on mount.
function useInNativeApp() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const detect = () => {
      const w = window as unknown as { Capacitor?: unknown; PolyTheme?: unknown };
      return Boolean(w.Capacitor) || Boolean(w.PolyTheme);
    };
    const tick = () => {
      if (cancelled) return;
      if (detect()) {
        setInApp(true);
        return;
      }
      if (attempts++ < 30) {
        window.setTimeout(tick, 100);
      }
    };
    // setTimeout 0 defers the first setState out of the effect's sync body.
    const kick = window.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(kick);
    };
  }, []);
  return inApp;
}

export default function BottomNav() {
  const pathname = usePathname() ?? '/';
  const inApp = useInNativeApp();

  // Reserve space on the body only while the nav is mounted so web visitors
  // don't get unexplained extra padding.
  useEffect(() => {
    if (!inApp) return;
    document.body.classList.add('has-bottom-nav');
    return () => document.body.classList.remove('has-bottom-nav');
  }, [inApp]);

  if (!inApp) return null;

  return (
    <nav
      aria-label="Primary"
      // No bottom border: the nav's background is the same as the Android
      // navigation-bar color (MainActivity keeps both pinned to the theme),
      // so the strip visually continues into the system nav. A single line
      // on top marks where the nav starts.
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-main bg-bg-main md:hidden transition-colors duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-[640px] grid-cols-5">
        {navItems.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.label} className="contents">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-accent' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <span className="flex h-7 items-center justify-center">
                  {item.render
                    ? item.render()
                    : Icon
                    ? <Icon width={ICON_SIZE} height={ICON_SIZE} aria-hidden="true" />
                    : null}
                </span>
                <span className="font-meta text-[10px] font-semibold uppercase tracking-[0.08em] leading-none">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
