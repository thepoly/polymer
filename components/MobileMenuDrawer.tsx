'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { SearchOverlayTrigger } from '@/components/SearchOverlay';

export const primaryNavItems = [
  { label: 'News', href: '/news' },
  { label: 'Features', href: '/features' },
  { label: 'Opinion', href: '/opinion' },
  { label: 'Sports', href: '/sports' },
];

export const secondaryNavItems = [
  { label: 'About', href: '/about' },
  { label: 'Archives', href: '/archive' },
  { label: 'Staff', href: '/staff' },
  { label: 'Contact', href: '/contact' },
  { label: 'Submit', href: 'mailto:edop@poly.rpi.edu?subject=Submitting%20Edop%3A%20%22%5BARTICLE%20TITLE%20HERE%5D%22&body=Thank%20you%20for%20submitting%20an%20Editorial%2FOpinion%20article%20to%20%F0%9D%98%9B%F0%9D%98%A9%F0%9D%98%A6%20%F0%9D%98%97%F0%9D%98%B0%F0%9D%98%AD%F0%9D%98%BA%F0%9D%98%B5%F0%9D%98%A6%F0%9D%98%A4%F0%9D%98%A9%F0%9D%98%AF%F0%9D%98%AA%F0%9D%98%A4%21%20Please%20replace%20%5BARTICLE%20TITLE%20HERE%5D%20in%20the%20subject%20line%20with%20the%20title%20of%20your%20article%2C%20and%20sign%20this%20email%20with%20your%20name.%20Attach%20your%20article%20as%20a%20PDF.%20Thanks%21%0A%0A%F0%9D%98%9B%F0%9D%98%A9%F0%9D%98%A6%20%F0%9D%98%97%F0%9D%98%B0%F0%9D%98%AD%F0%9D%98%BA%F0%9D%98%B5%F0%9D%98%A6%F0%9D%98%A4%F0%9D%98%A9%F0%9D%98%AF%F0%9D%98%AA%F0%9D%98%A4' },
];

export const DRAWER_WIDTH = 0.78;
export const DRAWER_TRANSITION_MS = 220;
const SWIPE_THRESHOLD = 36;
const DRAG_START_THRESHOLD = 6;

export function isExternalHref(href: string) {
  return /^(?:[a-z]+:)?\/\//i.test(href);
}

export function MobileMenuDrawer({
  isOpen,
  onClose,
  onOpen,
  handleLinkClick,
  isDarkMode,
  onThemeToggle,
  onSearchOpen,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  handleLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onSearchOpen: () => void;
  className?: string;
}) {
  const [dragX, setDragX] = useState<number | null>(null);
  const dragXRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const gestureModeRef = useRef<'open' | 'close' | null>(null);
  const isDraggingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const getDrawerPx = useCallback(() => {
    if (typeof window === 'undefined') return 300;
    return Math.min(window.innerWidth * DRAWER_WIDTH, 320);
  }, []);

  const resetGesture = useCallback(() => {
    setDragX(null);
    dragXRef.current = null;
    activeTouchIdRef.current = null;
    touchStartRef.current = null;
    gestureModeRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const commitDrag = useCallback((nextDragX: number | null) => {
    dragXRef.current = nextDragX;
    setDragX(nextDragX);
  }, []);

  useEffect(() => {
    const getActiveTouch = (e: TouchEvent) => {
      if (activeTouchIdRef.current === null) return null;
      for (let i = 0; i < e.touches.length; i += 1) {
        const touch = e.touches[i];
        if (touch.identifier === activeTouchIdRef.current) return touch;
      }
      return null;
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      activeTouchIdRef.current = touch.identifier;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      gestureModeRef.current = isOpen ? 'close' : 'open';
      isDraggingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || !gestureModeRef.current) return;

      const touch = getActiveTouch(e);
      if (!touch) return;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      const absDx = Math.abs(dx);

      if (!isDraggingRef.current && absDx < DRAG_START_THRESHOLD) {
        return;
      }

      if (dy > absDx && !isDraggingRef.current) {
        resetGesture();
        return;
      }

      const drawerPx = getDrawerPx();

      if (gestureModeRef.current === 'open' && dx > 0) {
        isDraggingRef.current = true;
        e.preventDefault();
        commitDrag(Math.min(dx, drawerPx));
        return;
      }

      if (gestureModeRef.current === 'close' && dx < 0) {
        isDraggingRef.current = true;
        e.preventDefault();
        commitDrag(Math.max(0, drawerPx + dx));
      }
    };

    const finishGesture = () => {
      const drawerPx = getDrawerPx();
      const currentDragX = dragXRef.current;

      if (isDraggingRef.current && currentDragX !== null) {
        if (gestureModeRef.current === 'open') {
          if (currentDragX > Math.max(SWIPE_THRESHOLD, drawerPx * 0.25)) onOpen();
        } else if (gestureModeRef.current === 'close') {
          if (currentDragX < drawerPx - Math.max(SWIPE_THRESHOLD, drawerPx * 0.25)) {
            onClose();
          }
        }
      }

      resetGesture();
    };

    const forceCloseTransientState = () => {
      if (!isOpen) {
        resetGesture();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        resetGesture();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', finishGesture, { passive: true });
    document.addEventListener('touchcancel', finishGesture, { passive: true });
    window.addEventListener('blur', forceCloseTransientState);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', finishGesture);
      document.removeEventListener('touchcancel', finishGesture);
      window.removeEventListener('blur', forceCloseTransientState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [commitDrag, getDrawerPx, isOpen, onClose, onOpen, resetGesture]);

  useEffect(() => {
    if (isOpen || dragX !== null) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [dragX, isOpen]);

  const showDrawer = isOpen || dragX !== null;
  const drawerPx = dragX !== null ? getDrawerPx() : null;
  const translateX = dragX !== null && drawerPx !== null ? `${dragX - drawerPx}px` : isOpen ? '0px' : 'calc(-100% - 12px)';
  const progress = dragX !== null && drawerPx !== null ? dragX / drawerPx : isOpen ? 1 : 0;

  return (
    <div className={`fixed inset-0 z-[60] ${className ?? 'lg:hidden'} ${showDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `rgba(0,0,0,${0.4 * progress})`,
          backdropFilter: progress > 0 ? `blur(${Math.min(4, 4 * progress)}px)` : 'none',
        }}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className={`absolute top-0 left-0 bottom-0 bg-bg-main will-change-transform ${showDrawer ? 'shadow-2xl' : 'shadow-none'}`}
        style={{
          width: `${DRAWER_WIDTH * 100}vw`,
          maxWidth: '320px',
          transform: `translate3d(${translateX}, 0, 0)`,
          transition: dragX !== null ? 'none' : `transform ${DRAWER_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        <div className="safe-area-mobile-drawer flex h-full flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col justify-evenly">
            <nav className="flex flex-col gap-0">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className="font-meta text-[28px] font-bold leading-[1.02] uppercase tracking-[0.04em] text-text-main transition-colors hover:text-accent py-1"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-rule pt-4 flex flex-col gap-2">
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  target={isExternalHref(item.href) ? '_blank' : undefined}
                  rel={isExternalHref(item.href) ? 'noopener noreferrer' : undefined}
                  className="font-meta text-[14px] font-medium tracking-[0.04em] text-text-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-rule pt-4 flex items-center gap-4">
              <button
                onClick={onThemeToggle}
                className={`flex items-center gap-2 font-meta text-[14px] font-medium transition-colors ${
                  isDarkMode
                    ? 'cursor-pointer text-text-muted hover:text-white'
                    : 'cursor-pointer text-text-muted hover:text-black'
                }`}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDarkMode ? 'Light mode' : 'Dark mode'}
              </button>
            </div>

            <div className="border-t border-rule pt-4">
              <p className="font-meta text-[14px] leading-[1.35] text-text-muted">
                Or{' '}
                <SearchOverlayTrigger
                  onClick={onSearchOpen}
                  className="inline-flex px-4 align-middle"
                  alwaysShowBorder
                />{' '}
                our archives.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
