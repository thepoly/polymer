'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { primaryNavItems } from '@/components/MobileMenuDrawer';

export default function ArticleSectionMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const closeOnResize = () => setOpen(false);

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative hidden md:block lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center cursor-pointer rounded -ml-2 text-text-main hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>
      {open && (
        <nav
          id={menuId}
          aria-label="Article section navigation"
          className="absolute left-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-border-main bg-bg-main py-2 shadow-lg"
        >
          {[{ label: 'Home', href: '/' }, ...primaryNavItems].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 font-meta text-[15px] text-text-main hover:bg-rule hover:text-accent focus-visible:bg-rule focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
