'use client';

import { useState, useRef, useEffect, useCallback, useId, useSyncExternalStore, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Moon, X } from 'lucide-react';
import UnderlinedSearchForm from '@/components/UnderlinedSearchForm';

export const primaryNavItems = [
  { label: 'News', href: '/news', description: 'Campus, Student Senate, Troy' },
  { label: 'Features', href: '/features', description: 'Profiles, arts, campus life' },
  { label: 'Opinion', href: '/opinion', description: 'Editorials, columns, letters' },
  { label: 'Sports', href: '/sports', description: 'Engineers scores and recaps' },
];

export const secondaryNavItems = [
  { label: 'About', href: '/about' },
  { label: 'Archives', href: '/archive' },
  { label: 'Staff', href: '/staff' },
  { label: 'Contact', href: '/contact' },
  { label: 'Submit', href: 'mailto:edop@poly.rpi.edu?subject=Submitting%20Edop%3A%20%22%5BARTICLE%20TITLE%20HERE%5D%22&body=Thank%20you%20for%20submitting%20an%20Editorial%2FOpinion%20article%20to%20%F0%9D%98%9B%F0%9D%98%A9%F0%9D%98%A6%20%F0%9D%98%97%F0%9D%98%B0%F0%9D%98%AD%F0%9D%98%BA%F0%9D%98%B5%F0%9D%98%A6%F0%9D%98%A4%F0%9D%98%A9%F0%9D%98%AF%F0%9D%98%AA%F0%9D%98%A4%21%20Please%20replace%20%5BARTICLE%20TITLE%20HERE%5D%20in%20the%20subject%20line%20with%20the%20title%20of%20your%20article%2C%20and%20sign%20this%20email%20with%20your%20name.%20Attach%20your%20article%20as%20a%20PDF.%20Thanks%21%0A%0A%F0%9D%98%9B%F0%9D%98%A9%F0%9D%98%A6%20%F0%9D%98%97%F0%9D%98%B0%F0%9D%98%AD%F0%9D%98%BA%F0%9D%98%B5%F0%9D%98%A6%F0%9D%98%A4%F0%9D%98%A9%F0%9D%98%AF%F0%9D%98%AA%F0%9D%98%A4' },
];

export const DRAWER_WIDTH = 0.86;
export const DRAWER_TRANSITION_MS = 220;
const SWIPE_THRESHOLD = 36;
const DRAG_START_THRESHOLD = 6;
const focusStyle = 'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

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
  id,
  swipeToOpen = true,
  returnFocusRef,
}: {
  /** For the menu button's aria-controls */
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  handleLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onSearchOpen: () => void;
  className?: string;
  /** A secondary trigger can share this drawer without adding another global open gesture. */
  swipeToOpen?: boolean;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const pathname = usePathname() || '';
  const activeSectionHref = primaryNavItems.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;
  const generatedId = useId();
  const panelId = id || generatedId;
  const [dragX, setDragX] = useState<number | null>(null);
  const dragXRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const gestureModeRef = useRef<'open' | 'close' | null>(null);
  const isDraggingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLSpanElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const skipFocusReturnRef = useRef(false);
  const callbacksRef = useRef({ onClose, onSearchOpen });

  useEffect(() => {
    callbacksRef.current = { onClose, onSearchOpen };
  }, [onClose, onSearchOpen]);

  // Portals retain React context, but CSS variables scoped to an article's
  // Follytechnic wrapper need to be carried from the original mount point.
  useEffect(() => {
    if (!hydrated || !sourceRef.current || !rootRef.current) return;
    const source = getComputedStyle(sourceRef.current);
    for (const property of ['--font-copy', '--font-meta', '--font-ui', '--font-display-news']) {
      rootRef.current.style.setProperty(property, source.getPropertyValue(property));
    }
  }, [hydrated, pathname, isOpen]);

  const getDrawerPx = useCallback(() => {
    if (typeof window === 'undefined') return 300;
    return window.matchMedia('(min-width: 768px)').matches
      ? 380
      : Math.min(window.innerWidth * DRAWER_WIDTH, 360);
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
      // Photofeature articles can also mount a hero drawer. Only the open
      // drawer should handle a gesture when another trigger is in use.
      if (!isOpen && (!swipeToOpen || document.querySelector('[data-mobile-menu-open]'))) return;
      if (!rootRef.current || getComputedStyle(rootRef.current).display === 'none') return;
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
  }, [commitDrag, getDrawerPx, isOpen, onClose, onOpen, resetGesture, swipeToOpen]);

  useEffect(() => {
    if (isOpen || dragX !== null) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = previousOverflow; };
    }
  }, [dragX, isOpen]);

  useEffect(() => {
    if (!hydrated || !isOpen || !rootRef.current || !panelRef.current) return;
    const root = rootRef.current;
    const panel = panelRef.current;
    const returnTarget = returnFocusRef?.current || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    skipFocusReturnRef.current = false;
    panel.scrollTop = 0;

    const previousInert = new Map<Element, boolean>();
    const isolatePage = () => {
      for (const sibling of Array.from(document.body.children)) {
        if (sibling === root || previousInert.has(sibling)) continue;
        previousInert.set(sibling, sibling.hasAttribute('inert'));
        sibling.setAttribute('inert', '');
      }
    };
    isolatePage();
    const observer = new MutationObserver(isolatePage);
    observer.observe(document.body, { childList: true });

    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), [tabindex]'))
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'));
    const timer = window.setTimeout(() => {
      if (!panel.contains(document.activeElement)) closeRef.current?.focus();
    },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : DRAWER_TRANSITION_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        callbacksRef.current.onClose();
      } else if (event.code === 'Space' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        skipFocusReturnRef.current = true;
        callbacksRef.current.onClose();
        callbacksRef.current.onSearchOpen();
      } else if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!panel.contains(event.target as Node)) closeRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      for (const [element, wasInert] of previousInert) {
        if (!wasInert) element.removeAttribute('inert');
      }
      if (!skipFocusReturnRef.current && returnTarget?.isConnected && returnTarget.getClientRects().length > 0) {
        returnTarget.focus();
      }
    };
  }, [hydrated, isOpen, returnFocusRef]);

  useEffect(() => {
    const onResize = () => {
      resetGesture();
      if (isOpen && rootRef.current && getComputedStyle(rootRef.current).display === 'none') callbacksRef.current.onClose();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, resetGesture]);

  const showDrawer = isOpen || dragX !== null;
  const drawerPx = dragX !== null ? getDrawerPx() : null;
  const translateX = dragX !== null && drawerPx !== null ? `${dragX - drawerPx}px` : isOpen ? '0px' : 'calc(-100% - 12px)';
  const progress = dragX !== null && drawerPx !== null ? dragX / drawerPx : isOpen ? 1 : 0;

  const followLink = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
      skipFocusReturnRef.current = true;
      onClose();
    }
    handleLinkClick(event, href);
  };

  const drawer = (
    <div ref={rootRef} data-mobile-menu-open={showDrawer ? '' : undefined} className={`fixed inset-0 z-[60] ${className ?? 'lg:hidden'} ${showDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-[background-color,backdrop-filter] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
        style={{
          backgroundColor: `rgba(0,0,0,${0.4 * progress})`,
          backdropFilter: progress > 0 ? `blur(${Math.min(4, 4 * progress)}px)` : 'none',
          transition: dragX !== null ? 'none' : undefined,
        }}
        onClick={onClose}
      />

      {/* Off screen while closed: inert, so its links aren't tabbed to or
          read out until it opens */}
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`absolute top-0 left-0 bottom-0 flex w-[86vw] max-w-[360px] flex-col overflow-y-auto overscroll-contain bg-bg-main will-change-transform md:w-[380px] md:max-w-[380px] transition-transform duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${showDrawer ? 'shadow-[0_0_0_1px_var(--rule-color),12px_0_40px_rgba(0,0,0,0.18)]' : ''}`}
        style={{
          transform: `translate3d(${translateX}, 0, 0)`,
          transition: dragX !== null ? 'none' : undefined,
        }}
      >
        <div className="safe-area-mobile-drawer-top flex shrink-0 items-center justify-between">
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu" className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-text-main ${focusStyle}`}>
            <X aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="font-meta text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">The Polytechnic</span>
        </div>
        <div className="safe-area-mobile-drawer-content flex shrink-0 flex-col gap-[22px] pt-2">
            <nav aria-label="Sections">
              <div className="mb-1.5 flex items-center gap-3 font-meta text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
                Sections<span aria-hidden="true" className="h-px flex-1 bg-rule" />
              </div>
              {primaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => followLink(e, item.href)}
                  aria-current={activeSectionHref === item.href ? 'page' : undefined}
                  className={`group relative flex min-h-[60px] items-center justify-between gap-3 border-b border-rule py-[7px] pr-1 text-text-main last:border-b-0 ${focusStyle}`}
                >
                  <span>
                    <span className={`block font-copy text-[27px] leading-none group-hover:text-accent ${activeSectionHref === item.href ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                    <span className="mt-[5px] block font-meta text-[12px] font-medium leading-[1.3] text-text-muted">{item.description}</span>
                  </span>
                  {activeSectionHref === item.href ? (
                    <span aria-hidden="true" className="absolute inset-y-2.5 w-[3px] bg-accent" style={{ left: 'calc(-18px - var(--safe-area-left))' }} />
                  ) : <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-50" />}
                </Link>
              ))}
            </nav>
            <UnderlinedSearchForm
              label="Search past issues"
              onSubmit={() => { skipFocusReturnRef.current = true; onClose(); }}
            />
            <nav aria-label="About the paper">
              <div className="mb-1.5 flex items-center gap-3 font-meta text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
                The paper<span aria-hidden="true" className="h-px flex-1 bg-rule" />
              </div>
              <div className="grid grid-cols-2 gap-x-3">
              {secondaryNavItems.filter(item => item.label !== 'Submit').map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => followLink(e, item.href)}
                  target={isExternalHref(item.href) ? '_blank' : undefined}
                  rel={isExternalHref(item.href) ? 'noopener noreferrer' : undefined}
                  className={`flex min-h-11 items-center font-meta text-[15px] font-medium text-text-main hover:text-accent ${focusStyle}`}
                >
                  {item.label}
                </Link>
              ))}
              </div>
              <Link href="/submit" onClick={event => followLink(event, '/submit')} className={`group mt-1.5 flex min-h-11 items-center gap-2 font-meta text-[15px] font-semibold text-accent ${focusStyle}`}>
                Write for the Poly<ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-[3px] motion-reduce:transition-none" />
              </Link>
            </nav>
        </div>
        <div className="safe-area-mobile-drawer-footer mt-auto flex shrink-0 flex-col gap-3.5 pt-[22px]">
          <button
            type="button"
            role="switch"
            aria-label="Dark mode"
            aria-checked={isDarkMode}
            onClick={() => { onClose(); onThemeToggle(); }}
            className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 border-y border-rule font-meta text-[13px] font-semibold uppercase tracking-[0.06em] text-text-main ${focusStyle}`}
          >
            <span className="flex items-center gap-2"><Moon aria-hidden="true" className="h-4 w-4" />Dark mode</span>
            <span aria-hidden="true" className={`relative h-6 w-10 rounded-full border ${isDarkMode ? 'border-accent bg-accent' : 'border-rule-strong'}`}>
              <span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full transition-transform motion-reduce:transition-none ${isDarkMode ? 'translate-x-4 bg-bg-main' : 'bg-text-main'}`} />
            </span>
          </button>
          <p className="font-copy text-[14px] italic leading-[1.35] text-text-muted">The student newspaper of Rensselaer Polytechnic Institute since 1885.</p>
        </div>
      </div>
    </div>
  );

  return <><span ref={sourceRef} hidden />{hydrated ? createPortal(drawer, document.body) : null}</>;
}
