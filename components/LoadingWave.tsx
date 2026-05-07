"use client";

import React from "react";

const WAVE_LAMBDA = 600;

const WAVE_PATH = (() => {
  const cy = 4;
  const A = 2.5;
  const half = WAVE_LAMBDA / 2;
  const cp = Math.round(0.3642 * half);
  let d = `M 0,${cy}`;
  for (let n = 0; n < 10; n++) {
    const x = n * WAVE_LAMBDA;
    d += ` C ${x + cp},${cy - A} ${x + half - cp},${cy - A} ${x + half},${cy}`;
    d += ` C ${x + half + cp},${cy + A} ${x + WAVE_LAMBDA - cp},${cy + A} ${x + WAVE_LAMBDA},${cy}`;
  }
  return d;
})();

/**
 * Rainbow loading wave — same effect as the search-bar underline.
 *
 * `active=true`  → traveling rainbow wave (used while fetching).
 * `active=false` → static accent bar (settled state).
 *
 * The crossfade is intentional: as soon as `active` flips to false the
 * wave fades out and the static line fades in over ~0.8s, mirroring the
 * search bar's "settle" transition after a result lands.
 */
export function LoadingWave({
  active,
  id = "loading",
  className = "",
  style,
}: {
  active: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "-");

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ height: 8, width: "100%", ...style }}
      role="progressbar"
      aria-busy={active}
      aria-label={active ? "Loading articles" : undefined}
    >
      <style>{`
        @keyframes loadingWaveTravel-${safeId} {
          from { transform: translateX(-${WAVE_LAMBDA}px); }
          to   { transform: translateX(0px); }
        }
        @keyframes loadingRainbowHue-${safeId} {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
      `}</style>
      <svg
        className="absolute bottom-0 left-0"
        width={WAVE_LAMBDA * 10}
        height="8"
        style={{
          animation: active
            ? `loadingWaveTravel-${safeId} ${WAVE_LAMBDA / 1200}s linear infinite, loadingRainbowHue-${safeId} 3s linear infinite`
            : "none",
          opacity: active ? 1 : 0,
          transition: "opacity 0.8s ease-out",
          willChange: active ? "transform, filter" : undefined,
        }}
      >
        <defs>
          <linearGradient id={`loading-wave-rainbow-${safeId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#ff4040" stopOpacity="0.85" />
            <stop offset="16%"  stopColor="#ff9900" stopOpacity="0.85" />
            <stop offset="33%"  stopColor="#ffee00" stopOpacity="0.85" />
            <stop offset="50%"  stopColor="#44dd44" stopOpacity="0.85" />
            <stop offset="66%"  stopColor="#4488ff" stopOpacity="0.85" />
            <stop offset="83%"  stopColor="#cc44ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ff4040" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path d={WAVE_PATH} stroke={`url(#loading-wave-rainbow-${safeId})`} strokeWidth="2" fill="none" />
      </svg>

      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent origin-left"
        style={{
          opacity: active ? 0 : 1,
          transition: "opacity 0.8s ease-out",
        }}
      />
    </div>
  );
}

export default LoadingWave;
