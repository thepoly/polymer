'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Moon, Search, Sun } from 'lucide-react';
import SearchOverlay from '@/components/SearchOverlay';
import { useTheme } from '@/components/ThemeProvider';

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

export default function MobileScrollHeader() {
  const [visible, setVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isDarkMode, toggleDarkMode, logoSrcs } = useTheme();

  const logoSrc = isDarkMode
    ? logoSrcs?.mobileDark ?? '/logo-dark-mobile.svg'
    : logoSrcs?.mobileLight ?? '/logo-light-mobile.svg';

  useEffect(() => {
    let rafId = 0;
    const update = () => {
      rafId = 0;
      setVisible(window.scrollY > SHOW_THRESHOLD);
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
  }, []);

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-bg-main border-b border-border-main safe-area-top transition-transform duration-300 ease-out md:hidden ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!visible}
      >
        <div className="relative flex items-center h-[56px] px-4">
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <div className="relative h-[56px] w-[180px]">
              <Image
                src={logoSrc}
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority={false}
              />
            </div>
          </Link>

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
