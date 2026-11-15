import type { GraphSpec } from '@/components/Interactive/shared'

// The article's graphs as first written. The live copies are graph files, edited at /graph;
// these only fill in a file that doesn't exist yet. Each one's columns and rows are laid
// out as in the reporting sheet, so a block copied from the sheet drops straight in.

const SOURCE = 'IRS Form 990 filings, via ProPublica Nonprofit Explorer'

// School, president's pay, provost's pay, and each one's year in office during the pay year
// reported (calendar 2024), counting a partial first year.
const OFFICERS: [string, number, number, number, number][] = [
  ['RPI', 1306266, 729612, 3, 2],
  ['RIT', 1421925, 596656, 8, 2],
  ['CMU', 3155276, 961085, 7, 6],
  ['WPI', 1122817, 250547, 2, 1],
  ['Stevens', 1296964, 673001, 14, 4],
  ['Lehigh', 1145854, 785941, 4, 5],
  ['MIT', 2151788, 1103532, 2, 3],
  ['CWRU', 2148720, 708686, 4, 1],
]

// The day each one took office, [president, provost], from the schools' announcements.
const STARTED: Record<string, [string, string]> = {
  RPI: ['2022-07-01', '2023-08-01'],
  RIT: ['2017-07-01', '2023-08-01'],
  CMU: ['2018-03-08', '2019-01-01'],
  WPI: ['2023-04-03', '2024-08-01'],
  Stevens: ['2011-07-01', '2021-09-01'],
  Lehigh: ['2021-08-16', '2020-07-01'],
  MIT: ['2023-01-01', '2022-03-07'],
  CWRU: ['2021-07-01', '2024-01-01'],
}

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

const executivePay: GraphSpec = {
  kind: 'column',
  title: 'Combined executive compensation',
  stacked: true,
  prefix: '$',
  columns: ['School', 'President', 'Provost'],
  rows: OFFICERS.map(([school, president, provost]) => [school, president, provost]),
  insideLabel: 'Year in office',
  inside: OFFICERS.map(([school, , , pYear, vYear]) => [school, `${ordinal(pYear)} year`, `${ordinal(vYear)} year`]),
  source: SOURCE,
}

const payByTenure: GraphSpec = {
  kind: 'scatter',
  title: 'Compensation by start date',
  x: { label: 'Start date', short: 'Started', scale: 'linear', domain: [2010, 2025], year: true },
  y: { label: 'Total compensation', short: 'Compensation', prefix: '$', scale: 'linear', domain: [0, 3500000] },
  groups: [
    { name: 'President', color: 'purple' },
    { name: 'Provost', color: 'orange' },
  ],
  trend: true,
  markStyle: 'ring',
  points: OFFICERS.flatMap(([school, president, provost]) =>
    (
      [
        ['President', president, STARTED[school][0]],
        ['Provost', provost, STARTED[school][1]],
      ] as const
    ).map(([group, pay, year]) => {
      const name = `${school} ${group.toLowerCase()}`
      return { ...(school === 'RPI' ? { label: name, highlight: true } : { name }), group, x: year, y: pay }
    }),
  ),
  source: SOURCE,
}

/** Graph file name → the graph it starts as. */
export const SEEDS: Record<string, GraphSpec> = {
  'executive-pay': executivePay,
  'pay-by-tenure': payByTenure,
}
