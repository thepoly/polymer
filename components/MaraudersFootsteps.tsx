"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";

const SHOE_SOLE = `M 6.8 1.1
  C 4.9 1.2 3.4 2.3 2.6 4.3
  C 1.8 6.2 1.9 8.5 2.8 10.9
  C 3.5 12.8 3.8 14.4 3.6 16
  C 3.4 17.5 3.7 18.8 4.6 19.9
  C 5.3 20.8 5.5 21.7 5.4 22.7
  C 5.4 23.4 5.9 23.8 6.8 23.9
  C 8.5 24.1 10.1 23.7 11.3 22.8
  C 12.3 22 12.9 20.9 12.9 19.6
  C 12.9 18 12.6 16.3 12.1 14.5
  C 11.4 12 11.4 9.7 12.1 7.4
  C 12.9 4.8 12.5 2.8 10.8 1.7
  C 9.8 1.1 8.5 0.9 6.8 1.1 Z`;

const SHOE_HEEL = `M 4.7 16.6
  L 10.6 15.8
  C 11.3 17 11.7 18.2 11.7 19.5
  C 11.6 20.9 11 21.9 10 22.6
  C 9.1 23.2 7.9 23.5 6.8 23.4
  C 5.9 23.3 5.2 22.9 4.9 22.2
  C 4.7 21.4 4.7 20.5 5 19.6
  C 5.2 18.6 5.1 17.6 4.7 16.6 Z`;

const SHOE_TREAD = `M 5.1 4.9 L 9.1 4.1
  M 4.7 8.1 L 9.7 7.1
  M 4.5 11.3 L 9.6 10.2
  M 5.5 18.1 L 10.2 17.3
  M 5.8 20.7 L 9.4 20`;

const FOOT_W = 14;
const FOOT_H = 24;
const STEP_SPACING = 26;
const LATERAL_OFFSET = 5.5;
const HEADER_STEP_INTERVAL_MS = 420;
const EXIT_STEP_INTERVAL_MS = 240;
const ROAM_STEP_INTERVAL_MS = 270;
const STEP_DURATION_MS = 2600;
const DESKTOP_BREAKPOINT = 1024;
const PATH_SELECTOR = "[data-frontpage-top], [data-section-body]";
const TITLE_SELECTOR = "[data-marauders-title]";
const OBSTACLE_SELECTOR = "[data-marauders-obstacle]";
const ORIGIN_SELECTOR = "[data-marauders-origin='search']";

type Point = {
  x: number;
  y: number;
};

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type TrailStep = {
  id: number;
  x: number;
  y: number;
  angle: number;
  isLeft: boolean;
  scale: number;
  createdAt: number;
};

type WalkerMode = "header" | "exit" | "roam";

type WalkerData = {
  active: boolean;
  mode: WalkerMode;
  current: Point;
  heading: number;
  nextStepAt: number;
  nextStepId: number;
  isLeft: boolean;
  footsteps: TrailStep[];
  headerPoints: Point[];
  headerIndex: number;
  headerDirection: 1 | -1;
  exitPoints: Point[];
  exitIndex: number;
  roamPoints: Point[];
  roamIndex: number;
  roamSide: "left" | "right";
  headerFloor: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toRect(rect: DOMRect): Rect {
  return {
    left: rect.left,
    top: rect.top + window.scrollY,
    right: rect.right,
    bottom: rect.bottom + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

function isVisibleRect(rect: Rect) {
  const viewportTop = window.scrollY;
  const viewportBottom = viewportTop + window.innerHeight;
  return rect.width > 8 && rect.height > 8 && rect.bottom > viewportTop && rect.top < viewportBottom;
}

function inflateRect(rect: Rect, padding: number): Rect {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function pointInRect(point: Point, rect: Rect) {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function distanceBetween(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToRect(point: Point, rect: Rect) {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.hypot(dx, dy);
}

function normalizeAngle(angle: number) {
  let next = angle;
  while (next <= -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

function collectRects(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector))
    .map((element) => toRect(element.getBoundingClientRect()))
    .filter(isVisibleRect);
}

function findNearestDistance(point: Point, rects: Rect[]) {
  let nearest = Infinity;

  for (const rect of rects) {
    nearest = Math.min(nearest, distanceToRect(point, rect));
  }

  return nearest;
}

function sampleLane(point: Point) {
  const element = document.elementFromPoint(point.x, point.y - window.scrollY);

  if (!element) return "open" as const;
  if (element.closest("header")) return "blocked" as const;
  if (element.closest(TITLE_SELECTOR)) return "title" as const;
  if (element.closest(OBSTACLE_SELECTOR)) return "blocked" as const;

  const tag = element.tagName.toLowerCase();
  if (tag === "img" || tag === "figure" || tag === "figcaption" || tag === "video") {
    return "blocked" as const;
  }

  return "open" as const;
}

function getOriginPoint() {
  const button = document.querySelector<HTMLElement>(ORIGIN_SELECTOR);

  if (!button) {
    return { x: window.innerWidth - 112, y: 58 };
  }

  const rect = button.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2 + window.scrollY,
  };
}

function getHeaderMetrics() {
  const headers = Array.from(document.querySelectorAll<HTMLElement>("header"))
    .map((element) => ({ element, rect: toRect(element.getBoundingClientRect()) }))
    .filter(({ rect }) => rect.width > 800 && rect.height > 70 && rect.bottom > 120);

  const headerRect =
    headers.sort((a, b) => b.rect.height - a.rect.height)[0]?.rect ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: 170,
      width: window.innerWidth,
      height: 170,
    };

  const logoRect =
    Array.from(document.querySelectorAll<HTMLElement>("header a[href='/']"))
      .map((element) => toRect(element.getBoundingClientRect()))
      .filter((rect) => rect.width > 200 && rect.height > 40 && rect.bottom > 80)
      .sort((a, b) => b.width - a.width)[0] ?? null;

  const headerFloor = clamp(
    (logoRect?.bottom ?? headerRect.bottom - 24) + 18,
    window.scrollY + 120,
    window.scrollY + Math.min(window.innerHeight * 0.28, 240),
  );

  return { headerRect, logoRect, headerFloor };
}

function getContentBounds(surfaces: Rect[], headerFloor: number): Rect {
  const viewportBottom = window.scrollY + window.innerHeight - 90;

  if (surfaces.length === 0) {
    return {
      left: 48,
      top: headerFloor + 24,
      right: window.innerWidth - 48,
      bottom: viewportBottom,
      width: window.innerWidth - 96,
      height: viewportBottom - headerFloor - 24,
    };
  }

  let left = Infinity;
  let right = -Infinity;

  for (const rect of surfaces) {
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
  }

  return {
    left: Math.max(24, left - 18),
    top: headerFloor + 24,
    right: Math.min(window.innerWidth - 24, right + 18),
    bottom: viewportBottom,
    width: Math.min(window.innerWidth - 48, right - left + 36),
    height: Math.max(180, viewportBottom - headerFloor - 24),
  };
}

function buildHeaderLoopPoints(origin: Point, headerFloor: number, logoRect: Rect | null) {
  const safeLeft = Math.max(logoRect ? logoRect.right + 44 : window.innerWidth * 0.58, window.innerWidth * 0.56);
  const safeRight = origin.x + 6;
  const travel = clamp(safeRight - safeLeft, 140, 240);
  const count = 18;
  const points: Point[] = [];

  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const drift = travel * t;
    const loopX = Math.sin(t * Math.PI * 4) * 28;
    const loopY = Math.sin(t * Math.PI * 8) * 12;

    points.push({
      x: clamp(origin.x - drift + loopX, safeLeft, safeRight),
      y: clamp(
        lerp(origin.y + 4, headerFloor - 24, t) + loopY,
        window.scrollY + 26,
        headerFloor - 14,
      ),
    });
  }

  return points;
}

function buildExitPoints(
  start: Point,
  headerFloor: number,
  bounds: Rect,
  roamSide: "left" | "right",
) {
  const entryX = clamp(
    bounds.left + bounds.width * (roamSide === "left" ? 0.43 : 0.57),
    bounds.left + 60,
    bounds.right - 60,
  );
  const entryY = headerFloor + 60;
  const samples: Point[] = [];

  const p0 = start;
  const p1 = { x: start.x - 30, y: start.y + 14 };
  const p2 = { x: entryX + (roamSide === "left" ? 28 : -18), y: headerFloor + 18 };
  const p3 = { x: entryX, y: entryY };

  for (let index = 0; index <= 8; index += 1) {
    samples.push(bezierPoint(p0, p1, p2, p3, index / 8));
  }

  return samples;
}

function buildRoamPoints(
  start: Point,
  heading: number,
  headerFloor: number,
  roamSide: "left" | "right",
) {
  const surfaces = collectRects(PATH_SELECTOR);
  const obstacleRects = [
    ...collectRects(OBSTACLE_SELECTOR),
    ...collectRects("header"),
  ];
  const titleRects = collectRects(TITLE_SELECTOR);
  const bounds = getContentBounds(surfaces, headerFloor);
  const target: Point = {
    x: clamp(
      bounds.left + bounds.width * (roamSide === "left" ? 0.42 : 0.58),
      bounds.left + 64,
      bounds.right - 64,
    ),
    y:
      start.y > bounds.bottom - 180
        ? bounds.top + bounds.height * 0.55
        : clamp(start.y + 120, bounds.top + 72, bounds.bottom - 96),
  };

  const points: Point[] = [start];
  let current = start;
  let currentHeading = heading;

  for (let index = 0; index < 9; index += 1) {
    const preferredAngle = Math.atan2(target.y - current.y, target.x - current.x);
    let bestPoint: Point | null = null;
    let bestAngle = currentHeading;
    let bestScore = -Infinity;

    for (const offset of [-0.95, -0.6, -0.3, 0, 0.3, 0.6, 0.95]) {
      const candidateAngle = normalizeAngle(preferredAngle * 0.8 + currentHeading * 0.2 + offset);
      const candidate = {
        x: current.x + Math.cos(candidateAngle) * STEP_SPACING,
        y: current.y + Math.sin(candidateAngle) * STEP_SPACING,
      };

      if (
        candidate.x < bounds.left + 12 ||
        candidate.x > bounds.right - 12 ||
        candidate.y < bounds.top + 8 ||
        candidate.y > bounds.bottom - 8
      ) {
        continue;
      }

      let blocked = false;
      for (const rect of obstacleRects) {
        if (pointInRect(candidate, inflateRect(rect, 16))) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const lane = sampleLane(candidate);
      if (lane === "blocked") continue;

      const obstacleDistance = findNearestDistance(candidate, obstacleRects);
      const titleDistance = findNearestDistance(candidate, titleRects);
      const progressDelta =
        distanceBetween(current, target) - distanceBetween(candidate, target);

      let score = progressDelta * 1.8;
      score += Math.min(obstacleDistance, 96) * 0.68;
      score -= Math.max(0, obstacleDistance - 120) * 0.22;
      score -= Math.abs(normalizeAngle(candidateAngle - currentHeading)) * 10;
      score += Math.max(0, candidate.y - current.y) * 0.22;

      if (lane === "title") {
        score -= 18;
      }

      if (titleDistance < 28) {
        score -= (28 - titleDistance) * 0.7;
      }

      for (const prior of points.slice(-5)) {
        const revisit = distanceBetween(candidate, prior);
        if (revisit < 56) {
          score -= (56 - revisit) * 1.5;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPoint = candidate;
        bestAngle = candidateAngle;
      }
    }

    if (!bestPoint) break;

    points.push(bestPoint);
    current = bestPoint;
    currentHeading = bestAngle;
  }

  return {
    points,
    heading: currentHeading,
  };
}

function createFootstep(
  id: number,
  current: Point,
  next: Point,
  isLeft: boolean,
  createdAt: number,
): TrailStep {
  const angle = Math.atan2(next.y - current.y, next.x - current.x) || -Math.PI / 2;
  const lateralAngle = angle + (isLeft ? -Math.PI / 2 : Math.PI / 2);

  return {
    id,
    x: next.x + Math.cos(lateralAngle) * LATERAL_OFFSET,
    y: next.y + Math.sin(lateralAngle) * LATERAL_OFFSET,
    angle: (angle * 180) / Math.PI - 90 + (Math.random() - 0.5) * 6,
    isLeft,
    scale: 0.82 + Math.random() * 0.1,
    createdAt,
  };
}

function getStepInterval(mode: WalkerMode) {
  if (mode === "header") return HEADER_STEP_INTERVAL_MS;
  if (mode === "exit") return EXIT_STEP_INTERVAL_MS;
  return ROAM_STEP_INTERVAL_MS;
}

export default function MaraudersFootsteps() {
  const { phase, animationKey } = useHeaderTransition();
  const [footsteps, setFootsteps] = useState<TrailStep[]>([]);

  const frameRef = useRef<number | null>(null);
  const walkerRef = useRef<WalkerData | null>(null);
  const hasScrolledRef = useRef(false);
  const stepWalkerRef = useRef<(now: number) => void>(() => {});

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    walkerRef.current = null;
    setFootsteps([]);
  }, []);

  const stepWalker = useCallback((now: number) => {
    const walker = walkerRef.current;
    if (!walker || !walker.active) return;

    walker.footsteps = walker.footsteps.filter(
      (step) => now - step.createdAt < STEP_DURATION_MS,
    );

    while (now >= walker.nextStepAt) {
      if (hasScrolledRef.current && walker.current.y < window.scrollY + 90) {
        const bounds = getContentBounds(collectRects(PATH_SELECTOR), walker.headerFloor);
        walker.mode = "roam";
        walker.current = {
          x: clamp(
            bounds.left + bounds.width * (walker.roamSide === "left" ? 0.42 : 0.58),
            bounds.left + 72,
            bounds.right - 72,
          ),
          y: window.scrollY + 120,
        };
        walker.roamPoints = [];
        walker.roamIndex = 1;
        walker.footsteps = walker.footsteps.filter(
          (step) => step.y > window.scrollY - 40,
        );
      }

      if (walker.mode === "header" && hasScrolledRef.current) {
        const bounds = getContentBounds(collectRects(PATH_SELECTOR), walker.headerFloor);
        walker.exitPoints = buildExitPoints(
          walker.current,
          walker.headerFloor,
          bounds,
          walker.roamSide,
        );
        walker.exitIndex = 1;
        walker.mode = "exit";
      }

      let nextPoint: Point | null = null;

      if (walker.mode === "header") {
        const nextIndex =
          walker.headerPoints.length === 0
            ? 0
            : (walker.headerIndex + 1) % walker.headerPoints.length;
        walker.headerIndex = nextIndex;
        nextPoint = walker.headerPoints[nextIndex] ?? null;
      } else if (walker.mode === "exit") {
        nextPoint = walker.exitPoints[walker.exitIndex] ?? null;
        walker.exitIndex += 1;

        if (!nextPoint) {
          walker.mode = "roam";
          const roam = buildRoamPoints(
            walker.current,
            walker.heading,
            walker.headerFloor,
            walker.roamSide,
          );
          walker.roamPoints = roam.points;
          walker.roamIndex = 1;
          walker.heading = roam.heading;
        }
      }

      if (walker.mode === "roam") {
        if (!walker.roamPoints[walker.roamIndex]) {
          walker.roamSide = walker.roamSide === "left" ? "right" : "left";
          const roam = buildRoamPoints(
            walker.current,
            walker.heading,
            walker.headerFloor,
            walker.roamSide,
          );
          walker.roamPoints = roam.points;
          walker.roamIndex = 1;
          walker.heading = roam.heading;
        }

        nextPoint = walker.roamPoints[walker.roamIndex] ?? null;
        walker.roamIndex += 1;
      }

      if (!nextPoint) {
        walker.nextStepAt += getStepInterval(walker.mode);
        break;
      }

      const nextStep = createFootstep(
        walker.nextStepId,
        walker.current,
        nextPoint,
        walker.isLeft,
        now,
      );

      walker.footsteps.push(nextStep);
      walker.heading = Math.atan2(
        nextPoint.y - walker.current.y,
        nextPoint.x - walker.current.x,
      );
      walker.current = nextPoint;
      walker.isLeft = !walker.isLeft;
      walker.nextStepId += 1;
      walker.nextStepAt += getStepInterval(walker.mode);
    }

    setFootsteps([...walker.footsteps]);
    frameRef.current = requestAnimationFrame(stepWalkerRef.current);
  }, []);

  useEffect(() => {
    stepWalkerRef.current = stepWalker;
  }, [stepWalker]);

  const start = useCallback(() => {
    if (window.innerWidth < DESKTOP_BREAKPOINT) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const origin = getOriginPoint();
    const { logoRect, headerFloor } = getHeaderMetrics();
    const headerPoints = buildHeaderLoopPoints(origin, headerFloor, logoRect);

    hasScrolledRef.current = window.scrollY > 8;

    walkerRef.current = {
      active: true,
      mode: "header",
      current: headerPoints[0] ?? origin,
      heading: -Math.PI / 2,
      nextStepAt: performance.now() + 180,
      nextStepId: 1,
      isLeft: true,
      footsteps: [],
      headerPoints,
      headerIndex: 0,
      headerDirection: 1,
      exitPoints: [],
      exitIndex: 1,
      roamPoints: [],
      roamIndex: 1,
      roamSide: "left",
      headerFloor,
    };

    setFootsteps([]);

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(stepWalkerRef.current);
  }, [stepWalker]);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 8) {
        hasScrolledRef.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (phase !== "shooting") return;

    const timer = window.setTimeout(() => {
      stop();
      start();
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, animationKey, start, stop]);

  useEffect(() => stop, [stop]);

  if (footsteps.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      data-marauders-layer
      className="pointer-events-none absolute left-0 top-0 z-[20] hidden lg:block"
      style={{
        width: "100%",
        height: Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.documentElement.clientHeight,
        ),
      }}
    >
      <style>{`
        @keyframes marauders-footstep {
          0% {
            opacity: 0;
            filter: blur(1.2px);
          }
          14% {
            opacity: 0.96;
            filter: blur(0.28px);
          }
          72% {
            opacity: 0.78;
            filter: blur(0.15px);
          }
          100% {
            opacity: 0;
            filter: blur(1.4px);
          }
        }
      `}</style>

      {footsteps.map((step) => {
        const width = FOOT_W * step.scale;
        const height = FOOT_H * step.scale;

        return (
          <svg
            key={step.id}
            width={width}
            height={height}
            viewBox={`0 0 ${FOOT_W} ${FOOT_H}`}
            className="absolute overflow-visible text-black/70 dark:text-white/95"
            style={{
              left: step.x - width / 2,
              top: step.y - height / 2,
              transform: `rotate(${step.angle}deg)`,
              animation: `marauders-footstep ${STEP_DURATION_MS}ms ease-out both`,
              willChange: "opacity, filter, transform",
              filter:
                "drop-shadow(0 0 1.8px rgba(0,0,0,0.34)) drop-shadow(0 1px 2.4px rgba(0,0,0,0.22))",
            }}
          >
            <path
              d={SHOE_SOLE}
              transform={step.isLeft ? undefined : `translate(${FOOT_W} 0) scale(-1 1)`}
              fill="currentColor"
              opacity="0.42"
            />
            <path
              d={SHOE_SOLE}
              transform={step.isLeft ? undefined : `translate(${FOOT_W} 0) scale(-1 1)`}
              fill="currentColor"
              opacity="0.96"
              stroke="currentColor"
              strokeOpacity="0.28"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <path
              d={SHOE_HEEL}
              transform={step.isLeft ? undefined : `translate(${FOOT_W} 0) scale(-1 1)`}
              fill="currentColor"
              opacity="0.76"
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeWidth="0.32"
              strokeLinejoin="round"
            />
            <path
              d={SHOE_TREAD}
              transform={step.isLeft ? undefined : `translate(${FOOT_W} 0) scale(-1 1)`}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.22"
              strokeWidth="0.42"
              strokeLinecap="round"
            />
          </svg>
        );
      })}
    </div>
  );
}
