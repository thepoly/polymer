'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { MobileMenuDrawer } from '@/components/MobileMenuDrawer';
import SearchOverlay from '@/components/SearchOverlay';
import { useTheme } from '@/components/ThemeProvider';

const SHOW_THRESHOLD = 220;

export default function MobileScrollHeader() {
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isDarkMode, logoSrcs, toggleDarkMode } = useTheme();
  const router = useRouter();

  const mobileLogoSrc = isDarkMode
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!href.startsWith('/')) return;
    e.preventDefault();
    setMenuOpen(false);
    router.push(href);
  };

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-bg-main border-b border-border-main safe-area-top transition-transform duration-300 ease-out lg:hidden ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!visible}
      >
        <div className="mx-auto max-w-[1280px] px-4">
          <div className="grid h-[56px] grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex justify-start">
              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-9 w-9 items-center justify-center text-text-main"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
            <Link
              href="/"
              className="relative block h-[56px] w-[min(60vw,240px)] justify-self-center"
            >
              <Image
                src={mobileLogoSrc}
                alt="The Polytechnic"
                fill
                className="object-contain"
                priority={false}
              />
            </Link>
            <div className="flex justify-end">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center text-text-main"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <MobileMenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpen={() => setMenuOpen(true)}
        handleLinkClick={handleNavClick}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleDarkMode}
        onSearchOpen={() => {
          setMenuOpen(false);
          setSearchOpen(true);
        }}
      />

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
