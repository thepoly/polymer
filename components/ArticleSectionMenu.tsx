'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { MobileMenuDrawer } from '@/components/MobileMenuDrawer';
import { useTheme } from '@/components/ThemeProvider';
import { openSearchOverlay } from '@/components/SearchOverlayHost';

export default function ArticleSectionMenu({ onThemeToggle }: { onThemeToggle: () => void }) {
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
    <div className="relative hidden md:block lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center cursor-pointer rounded -ml-2 text-text-main hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
        swipeToOpen={false}
      />
    </div>
  );
}
