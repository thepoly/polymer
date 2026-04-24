'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import SearchOverlay from '@/components/SearchOverlay';

const SHOW_THRESHOLD = 220;

function triggerThemeTransition(x: number, y: number, apply: () => void) {
  const root = document.documentElement;
  const maxR = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  root.style.setProperty('--theme-x', `${x}px`);
  root.style.setProperty('--theme-y', `${y}px`);
  root.style.setProperty('--theme-r', `${maxR}px`);

  if ('startViewTransition' in document && typeof document.startViewTransition === 'function') {
    root.classList.add('theme-switching');
    const t = document.startViewTransition(() => apply());
    t.finished.then(() => root.classList.remove('theme-switching'));
  } else {
    apply();
  }
}

// `alwaysVisible` — used on pages (like article pages) where the sticky
// header should be pinned at the top from the start. When false (default),
// the header slides in after the user scrolls past SHOW_THRESHOLD.
export default function ArticleStaticHeader({ alwaysVisible = false }: { alwaysVisible?: boolean } = {}) {
  const { isDarkMode, toggleDarkMode, logoSrcs } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolledPastThreshold, setScrolledPastThreshold] = useState(false);

  const logoSrc = isDarkMode ? logoSrcs.mobileDark : logoSrcs.mobileLight;
  const visible = alwaysVisible || scrolledPastThreshold;

  useEffect(() => {
    if (alwaysVisible) return;
    let rafId = 0;
    const update = () => {
      rafId = 0;
      setScrolledPastThreshold(window.scrollY > SHOW_THRESHOLD);
    };
    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [alwaysVisible]);

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-bg-main border-b border-border-main safe-area-top transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!visible}
      >
        <div className="relative flex items-center h-[56px] px-4 md:px-6">
          {/* Center: logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <div className="relative h-[56px] w-[180px]">
              <Image
                src={logoSrc}
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Right: theme toggle + search */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                triggerThemeTransition(
                  rect.left + rect.width / 2,
                  rect.top + rect.height / 2,
                  () => toggleDarkMode(),
                );
              }}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
                isDarkMode
                  ? 'text-text-main hover:bg-white hover:text-black'
                  : 'text-text-main hover:bg-black hover:text-white'
              }`}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
                isDarkMode
                  ? 'text-text-main hover:bg-white/10'
                  : 'text-text-main hover:bg-black/6'
              }`}
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
