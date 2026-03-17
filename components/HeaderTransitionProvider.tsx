"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const SUCK_DURATION_MS = 400;
const SHOOT_DURATION_MS = 2000;
const NAVIGATION_FALLBACK_MS = 5000;
const INITIAL_ANIMATION_KEY = 1;
type HeaderAnimationPhase = "idle" | "sucking" | "navigating" | "shooting";

type NavigationOptions = {
  href: string;
  currentPath: string;
  navigate: (href: string) => void;
  prefetch?: (href: string) => void;
};

type HeaderTransitionContextValue = {
  animationKey: number;
  phase: HeaderAnimationPhase;
  isSucking: boolean;
  isAnimating: boolean;
  triggerTransition: (options: NavigationOptions) => void;
};

const HeaderTransitionContext = createContext<HeaderTransitionContextValue | null>(
  null,
);

function clearTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

export default function HeaderTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [animationKey, setAnimationKey] = useState(INITIAL_ANIMATION_KEY);
  const [phase, setPhase] = useState<HeaderAnimationPhase>("shooting");
  const pathname = usePathname();

  const phaseRef = useRef<HeaderAnimationPhase>("shooting");
  const pendingNavigationRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);

  const suckTimerRef = useRef<number | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const unlockTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearAllTimers = () => {
    clearTimer(suckTimerRef);
    clearTimer(navigationTimerRef);
    clearTimer(unlockTimerRef);
    clearTimer(fallbackTimerRef);
  };

  const unlockAfterShoot = () => {
    clearTimer(unlockTimerRef);
    unlockTimerRef.current = window.setTimeout(() => {
      phaseRef.current = "idle";
      setPhase("idle");
    }, SHOOT_DURATION_MS);
  };

  const startShootPhase = () => {
    phaseRef.current = "shooting";
    setPhase("shooting");
    setAnimationKey((prev) => prev + 1);
    unlockAfterShoot();
  };

  const triggerTransition = ({
    href,
    currentPath,
    navigate,
    prefetch,
  }: NavigationOptions) => {
    if (phaseRef.current !== "idle") return;

    const isCurrentPage =
      currentPath === href || (href === "/" && currentPath === "/");

    clearAllTimers();
    phaseRef.current = "sucking";
    setPhase("sucking");

    if (isCurrentPage) {
      pendingNavigationRef.current = false;
      pendingHrefRef.current = null;
      suckTimerRef.current = window.setTimeout(() => {
        startShootPhase();
      }, SUCK_DURATION_MS);
      return;
    }

    pendingNavigationRef.current = true;
    pendingHrefRef.current = href;

    try {
      prefetch?.(href);
    } catch {
      // Prefetch failures should not block the transition.
    }

    navigationTimerRef.current = window.setTimeout(() => {
      phaseRef.current = "navigating";
      setPhase("navigating");
      navigate(href);
    }, SUCK_DURATION_MS);

    fallbackTimerRef.current = window.setTimeout(() => {
      pendingNavigationRef.current = false;
      pendingHrefRef.current = null;
      phaseRef.current = "idle";
      setPhase("idle");
    }, NAVIGATION_FALLBACK_MS);
  };

  useEffect(() => {
    unlockAfterShoot();
  }, []);

  useEffect(() => {
    if (!pendingNavigationRef.current) return;
    if (phaseRef.current !== "navigating") return;
    if (pathname !== pendingHrefRef.current) return;

    pendingNavigationRef.current = false;
    pendingHrefRef.current = null;
    clearTimer(fallbackTimerRef);
    clearTimer(navigationTimerRef);
    startShootPhase();
  }, [pathname]);

  useEffect(
    () => () => {
      clearTimer(suckTimerRef);
      clearTimer(navigationTimerRef);
      clearTimer(unlockTimerRef);
      clearTimer(fallbackTimerRef);
    },
    [],
  );

  return (
    <HeaderTransitionContext.Provider
      value={{
        animationKey,
        phase,
        isSucking: phase === "sucking",
        isAnimating: phase !== "idle",
        triggerTransition,
      }}
    >
      {children}
    </HeaderTransitionContext.Provider>
  );
}

export function useHeaderTransition() {
  const context = useContext(HeaderTransitionContext);
  if (!context) {
    throw new Error(
      "useHeaderTransition must be used within HeaderTransitionProvider",
    );
  }
  return context;
}
