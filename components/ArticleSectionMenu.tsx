'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { MobileMenuDrawer } from '@/components/MobileMenuDrawer';
import { useTheme } from '@/components/ThemeProvider';
import { openSearchOverlay } from '@/components/SearchOverlayHost';

type Props = {
  onThemeToggle: () => void;
  overPhotofeatureHero: boolean;
  swipeToOpen: boolean;
};

export default function ArticleSectionMenu({ onThemeToggle, overPhotofeatureHero, swipeToOpen }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (!open) return;

    const closeOnResize = () => setOpen(false);

    window.addEventListener('resize', closeOnResize);
    return () => {
      window.removeEventListener('resize', closeOnResize);
    };
  }, [open]);

  return (
    <div className="fixed top-[calc(var(--safe-area-top)+0.375rem)] left-[calc(var(--safe-area-left)+0.5rem)] z-[52] md:left-[calc(var(--safe-area-left)+1rem)] lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
        className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-text-main hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${overPhotofeatureHero ? 'sm:bg-black/55 sm:text-white sm:hover:text-white' : ''}`}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>
      <MobileMenuDrawer
        id={menuId}
        returnFocusRef={buttonRef}
        isOpen={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        handleLinkClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          setOpen(false);
        }}
        isDarkMode={isDarkMode}
        onThemeToggle={onThemeToggle}
        onSearchOpen={() => {
          setOpen(false);
          openSearchOverlay();
        }}
        swipeToOpen={swipeToOpen}
      />
    </div>
  );
}
