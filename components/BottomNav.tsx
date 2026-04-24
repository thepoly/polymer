'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Newspaper, Sparkles, Trophy, type LucideIcon } from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  render?: () => React.ReactNode;
  match?: string;
};

const ICON_SIZE = 22;

const navItems: NavItem[] = [
  { label: 'News', href: '/news', icon: Newspaper },
  { label: 'Features', href: '/features', icon: Sparkles },
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
  { label: 'Opinion', href: '/opinion', icon: MessageSquare },
  { label: 'Sports', href: '/sports', icon: Trophy },
];

function isActive(pathname: string, item: NavItem): boolean {
  const match = item.match ?? item.href;
  if (match === '/') return pathname === '/';
  return pathname === match || pathname.startsWith(`${match}/`);
}

// Only render inside the Android / iOS Capacitor shell; on the mobile web
// the regular hamburger + drawer remain the nav affordance.
function useInNativeApp() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    const isNative = typeof window !== 'undefined' && Boolean((window as unknown as { Capacitor?: unknown }).Capacitor);
    setInApp(isNative);
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
                    ? <Icon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />
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
