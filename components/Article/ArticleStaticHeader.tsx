'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import SearchOverlay from '@/components/SearchOverlay';

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

export default function ArticleStaticHeader() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const logoSrc = isDarkMode ? '/logo-dark-mobile.svg' : '/logo-light-mobile.svg';

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-bg-main border-b border-border-main">
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
