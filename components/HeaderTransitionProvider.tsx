"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ANIMATED_HEADER_ROUTES } from "@/components/headerAnimationRoutes";

const INITIAL_SUCK_DURATION_MS = 400;
const INITIAL_SHOOT_DURATION_MS = 2000;
const ACCELERATED_SUCK_DURATION_MS = 300;
const ACCELERATED_SHOOT_DURATION_MS = 1200;
const NAVIGATION_FALLBACK_MS = 5000;
const INITIAL_ANIMATION_KEY = 1;
const HEADER_ANIMATION_EVENT = "poly-header-animation-speed-change";
type HeaderAnimationPhase = "idle" | "sucking" | "navigating" | "shooting";

type HeaderAnimationSpeed = "initial" | "accelerated";

type NavigationOptions = {
  href: string;
  currentPath: string;
  navigate: (href: string) => void;
  prefetch?: (href: string) => void;
};

type HeaderTransitionContextValue = {
  animationKey: number;
  phase: HeaderAnimationPhase;
  speed: HeaderAnimationSpeed;
  suckDurationMs: number;
  shootDurationMs: number;
  isSucking: boolean;
  isAnimating: boolean;
  triggerTransition: (options: NavigationOptions) => void;
};

const HeaderTransitionContext = createContext<HeaderTransitionContextValue | null>(
  null,
);
let hasSeenHeaderAnimationInMemory = false;

function clearTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function getStoredHeaderAnimationSpeed(): HeaderAnimationSpeed {
  return hasSeenHeaderAnimationInMemory ? "accelerated" : "initial";
}

function subscribeToHeaderAnimationSpeed(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener(HEADER_ANIMATION_EVENT, handleChange);

  return () => {
    window.removeEventListener(HEADER_ANIMATION_EVENT, handleChange);
  };
}

export default function HeaderTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [animationKey, setAnimationKey] = useState(INITIAL_ANIMATION_KEY);
  const [phase, setPhase] = useState<HeaderAnimationPhase>("shooting");
  const speed = useSyncExternalStore<HeaderAnimationSpeed>(
    subscribeToHeaderAnimationSpeed,
    getStoredHeaderAnimationSpeed,
    () => "initial",
  );
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

  const suckDurationMs =
    speed === "initial" ? INITIAL_SUCK_DURATION_MS : ACCELERATED_SUCK_DURATION_MS;
  const shootDurationMs =
    speed === "initial" ? INITIAL_SHOOT_DURATION_MS : ACCELERATED_SHOOT_DURATION_MS;

  const markAnimationSeen = () => {
    hasSeenHeaderAnimationInMemory = true;
    window.dispatchEvent(new Event(HEADER_ANIMATION_EVENT));
  };

  const unlockAfterShoot = useCallback(() => {
    clearTimer(unlockTimerRef);
    unlockTimerRef.current = window.setTimeout(() => {
      phaseRef.current = "idle";
      setPhase("idle");
      markAnimationSeen();
    }, shootDurationMs);
  }, [shootDurationMs]);

  const startShootPhase = useCallback(() => {
    phaseRef.current = "shooting";
    setPhase("shooting");
    setAnimationKey((prev) => prev + 1);
    unlockAfterShoot();
  }, [unlockAfterShoot]);

  const triggerTransition = ({
    href,
    currentPath,
    navigate,
    prefetch,
  }: NavigationOptions) => {
    if (phaseRef.current !== "idle") return;

    if (!ANIMATED_HEADER_ROUTES.has(href)) {
      navigate(href);
      return;
    }

    const isCurrentPage =
      currentPath === href || (href === "/" && currentPath === "/");

    if (isCurrentPage) {
      clearAllTimers();
      phaseRef.current = "sucking";
      setPhase("sucking");
      pendingNavigationRef.current = false;
      pendingHrefRef.current = null;
      suckTimerRef.current = window.setTimeout(() => {
        startShootPhase();
      }, suckDurationMs);
      return;
    }

    clearAllTimers();
    pendingNavigationRef.current = true;
    pendingHrefRef.current = href;

    try {
      prefetch?.(href);
    } catch {
      // Prefetch failures should not block the transition.
    }

    phaseRef.current = "sucking";
    setPhase("sucking");
    navigationTimerRef.current = window.setTimeout(() => {
      phaseRef.current = "navigating";
      setPhase("navigating");
      navigate(href);
    }, suckDurationMs);

    fallbackTimerRef.current = window.setTimeout(() => {
      pendingNavigationRef.current = false;
      pendingHrefRef.current = null;
      phaseRef.current = "idle";
      setPhase("idle");
    }, NAVIGATION_FALLBACK_MS);
  };

  useEffect(() => {
    unlockAfterShoot();
  }, [unlockAfterShoot]);

  useLayoutEffect(() => {
    if (!pendingNavigationRef.current) return;
    if (phaseRef.current !== "navigating") return;
    if (pathname !== pendingHrefRef.current) return;

    pendingNavigationRef.current = false;
    pendingHrefRef.current = null;
    clearTimer(fallbackTimerRef);
    clearTimer(navigationTimerRef);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      startShootPhase();
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, startShootPhase]);

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
        speed,
        suckDurationMs,
        shootDurationMs,
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
