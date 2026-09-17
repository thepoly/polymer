/**
 * Emits the print translation of the header's logo rule + wave fleet.
 *
 * The site header draws the fleet with a left-to-right gradient and animates it
 * in (stroke-dashoffset draw, then a "crystallize" fade). Print gets the same
 * geometry frozen at full draw: every stroke solid black at full opacity, no
 * gradient, no animation, no tints — solid hairlines reproduce cleanly on
 * newsprint where a 40% tint goes muddy. The fan still reads because the waves
 * differ in baseline offset and amplitude, not in color.
 *
 * Usage: pnpm exec tsx scripts/generate-print-rule.ts [outDir]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  HEADER_WAVE_CONVERGE,
  HEADER_WAVE_START_X,
  HEADER_WAVE_SVG_H,
  generateWaveFleet,
} from '../lib/headerWaveFleet'

const WAVE_COUNT = 4

/** Fleet lengths, in wavelengths of the 320px base. */
const LENGTHS = [
  { name: 'short', converge: 640 },
  { name: 'medium', converge: 960 },
  { name: 'full', converge: HEADER_WAVE_CONVERGE },
  { name: 'extended', converge: 1920 },
]

/** Stroke weights in viewBox units, at the asset's native 1:1 scale. */
const WEIGHTS = [
  { name: 'hairline', stroke: 0.5 },
  { name: 'light', stroke: 0.75 },
  { name: 'regular', stroke: 1 },
  { name: 'bold', stroke: 1.5 },
]

export function buildPrintRule({
  waveCount = WAVE_COUNT,
  stroke = 1,
  converge = HEADER_WAVE_CONVERGE,
} = {}) {
  const baseline = HEADER_WAVE_SVG_H / 2
  const endX = HEADER_WAVE_START_X + converge

  const waves = generateWaveFleet(waveCount, { converge })
    .map(
      ({ d }) =>
        `    <path d="${d}" fill="none" stroke="#000000" stroke-width="${stroke}" stroke-linecap="round" />`,
    )
    .join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HEADER_WAVE_START_X} 0 ${converge} ${HEADER_WAVE_SVG_H}" width="${converge}" height="${HEADER_WAVE_SVG_H}" role="img" aria-label="Polytechnic header rule">
  <title>Polytechnic header rule (print)</title>
  <g>
    <line x1="${HEADER_WAVE_START_X}" y1="${baseline}" x2="${endX}" y2="${baseline}" stroke="#000000" stroke-width="${stroke}" stroke-linecap="square" />
${waves}
  </g>
</svg>
`
}

const outDir = process.argv[2] ?? resolve(process.cwd(), 'public/print')
mkdirSync(outDir, { recursive: true })

for (const { name: lengthName, converge } of LENGTHS) {
  for (const { name: weightName, stroke } of WEIGHTS) {
    const file = resolve(outDir, `header-rule-${lengthName}-${weightName}.svg`)
    writeFileSync(file, buildPrintRule({ converge, stroke }))
    console.log(`wrote ${file}`)
  }
}

// Canonical asset: full length, regular weight.
const canonical = resolve(outDir, 'header-rule.svg')
writeFileSync(canonical, buildPrintRule())
console.log(`wrote ${canonical}`)
