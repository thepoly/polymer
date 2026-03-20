'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import SearchOverlay from '@/components/SearchOverlay';
import { useTheme } from '@/components/ThemeProvider';

export default function OpinionHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const logoSrc = isDarkMode ? '/logo-dark.svg' : '/logo.svg';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg-main border-b border-rule transition-colors duration-300">
        <div className="relative flex items-center h-[58px] px-4 md:px-6">
          {/* Center: Logo (absolutely centered) */}
          <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative h-[34px] w-[220px] md:h-[38px] md:w-[250px]">
              <Image
                src={logoSrc}
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Right: Search button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="ml-auto p-2 hover:bg-rule/30 rounded transition-colors"
            aria-label="Open search"
          >
            <Search className="w-5 h-5 text-text-main" />
          </button>
        </div>
      </header>

      {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}
    </>
  );
}
