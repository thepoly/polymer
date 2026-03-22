"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

const WAVE_LAMBDA = 600;

const WAVE_PATH = (() => {
  const cy = 4, A = 2.5, half = WAVE_LAMBDA / 2;
  const cp = Math.round(0.3642 * half);
  let d = `M 0,${cy}`;
  for (let n = 0; n < 10; n++) {
    const x = n * WAVE_LAMBDA;
    d += ` C ${x + cp},${cy - A} ${x + half - cp},${cy - A} ${x + half},${cy}`;
    d += ` C ${x + half + cp},${cy + A} ${x + WAVE_LAMBDA - cp},${cy + A} ${x + WAVE_LAMBDA},${cy}`;
  }
  return d;
})();

function AnimatedLine({
  id,
  delay = 0,
  duration = 1500,
  style,
}: {
  id: string;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);
  const [settled, setSettled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const triggered = useRef(false);

  const startAnimation = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;
    const timer = setTimeout(() => {
      setAnimating(true);
      setTimeout(() => {
        setAnimating(false);
        setSettled(true);
      }, duration);
    }, delay);
    return timer;
  }, [delay, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let delayTimer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          delayTimer = startAnimation();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [startAnimation]);

  const showWave = animating || hovered;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{ height: 8, width: "100%", ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        className="absolute bottom-0 left-0"
        width={WAVE_LAMBDA * 10}
        height="8"
        style={{
          animation: showWave
            ? `dividerWaveTravel ${WAVE_LAMBDA / 1200}s linear infinite, dividerRainbowHue 3s linear infinite`
            : "none",
          opacity: showWave ? 1 : 0,
          transition: "opacity 0.8s ease-out",
          willChange: showWave ? "transform, filter" : undefined,
        }}
      >
        <defs>
          <linearGradient id={`wave-rainbow-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#ff4040" stopOpacity="0.8" />
            <stop offset="16%"  stopColor="#ff9900" stopOpacity="0.8" />
            <stop offset="33%"  stopColor="#ffee00" stopOpacity="0.8" />
            <stop offset="50%"  stopColor="#44dd44" stopOpacity="0.8" />
            <stop offset="66%"  stopColor="#4488ff" stopOpacity="0.8" />
            <stop offset="83%"  stopColor="#cc44ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff4040" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path
          d={WAVE_PATH}
          stroke={`url(#wave-rainbow-${id})`}
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
        style={{
          opacity: settled && !hovered ? 1 : 0,
          transition: "opacity 0.8s ease-out",
        }}
      />
    </div>
  );
}

export default function RainbowDivider() {
  return (
    <>
      <style>{`
        @keyframes dividerWaveTravel {
          from { transform: translateX(-${WAVE_LAMBDA}px); }
          to   { transform: translateX(0px); }
        }
        @keyframes dividerRainbowHue {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
      `}</style>
      <AnimatedLine id="main" delay={0} duration={300} style={{ marginTop: 24, marginBottom: 8 }} />
    </>
  );
}

export { AnimatedLine };
