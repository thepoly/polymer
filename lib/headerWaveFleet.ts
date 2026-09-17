// Header wave fleet: waves fan out from a single start point, converge back at the end.
// Shared by the animated site header and the static print rule so both stay in sync.

export const HEADER_WAVE_LAMBDA = 320;
export const HEADER_WAVE_SVG_H = 16;
export const HEADER_WAVE_CONVERGE = 4 * HEADER_WAVE_LAMBDA; // 1280px — where waves fully pinch
export const HEADER_WAVE_START_X = -4;

export type HeaderWave = { d: string; opacity: number; delay: number };

export type WaveFleetOptions = {
  /**
   * Distance from the start point to where the fleet pinches back to the
   * baseline. Defaults to the header's 1280px. The ramp-in/ramp-out envelope
   * scales with it, so a shorter fleet is the same motif stretched, not cropped.
   */
  converge?: number;
};

export function generateWaveFleet(count: number, options: WaveFleetOptions = {}): HeaderWave[] {
  const converge = options.converge ?? HEADER_WAVE_CONVERGE;
  const half = HEADER_WAVE_LAMBDA / 2;
  const cp = Math.round(0.3642 * half);
  const baseline = HEADER_WAVE_SVG_H / 2;
  const startX = HEADER_WAVE_START_X;
  const rampUp = converge * 0.15;
  const rampDown = converge * 0.3;
  const convergeEndX = startX + converge;
  const maxHalves = Math.ceil(converge / half) + 2;

  const envelope = (x: number) => {
    const t = x - startX;
    if (t <= 0) return 0;
    if (t < rampUp) return t / rampUp;
    if (t < converge - rampDown) return 1;
    if (t < converge) return (converge - t) / rampDown;
    return 0;
  };

  const n = Math.max(1, Math.min(8, Math.round(count)));
  const margin = 1.5;
  const usableH = HEADER_WAVE_SVG_H - 2 * margin;

  const specs = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const cy = margin + t * usableH;
    const dist = Math.abs(t - 0.5) * 2; // 0 at center, 1 at edges
    return { cy, A: 4.6 - dist * 1.4, opacity: 1 - dist * 0.6, delay: dist * 0.1 };
  });

  return specs.map(({ cy, A, opacity, delay }) => {
    let d = `M ${startX},${baseline}`;
    for (let k = 0; k < maxHalves; k++) {
      const x0 = startX + k * half;
      const x1 = startX + (k + 1) * half;
      if (x0 >= convergeEndX) break;
      const e0 = envelope(x0);
      const e1 = envelope(x1);
      const eMid = envelope((x0 + x1) / 2);
      const y0 = baseline + (cy - baseline) * e0;
      const y1 = baseline + (cy - baseline) * e1;
      const peakA = A * eMid;
      const sign = k % 2 === 0 ? -1 : 1;
      d += ` C ${x0 + cp},${y0 + sign * peakA} ${x1 - cp},${y1 + sign * peakA} ${x1},${y1}`;
    }
    d += ` L ${convergeEndX},${baseline}`;
    return { d, opacity, delay };
  });
}
