import type { GraphSpec } from '@/components/Interactive/shared'

// Stand-in numbers, one graph of each kind, until the article's own go in.

export const ring: GraphSpec = {
  kind: 'ring',
  title: 'Ring',
  valueLabel: 'Value',
  items: [['A', 48], ['B', 27], ['C', 14], ['D', 8], ['E', 3]],
}

export const combined: GraphSpec = {
  kind: 'ring',
  title: 'Ring, two groups',
  valueLabel: 'Value',
  combine: [
    { name: 'Group 1', color: 'red', items: [['A', 40], ['B', 22], ['C', 9]] },
    { name: 'Group 2', color: 'purple', items: [['D', 31], ['E', 12], ['F', 6]] },
  ],
}

export const pie: GraphSpec = { ...ring, kind: 'pie', title: 'Pie' }

export const pie3d: GraphSpec = { ...ring, kind: 'pie3d', title: 'Pie, tilted' }

export const bar: GraphSpec = {
  kind: 'bar',
  title: 'Bar',
  items: [['A', 920], ['B', 640], ['C', 410], ['D', 180], ['E', 75]],
}

export const column: GraphSpec = {
  kind: 'column',
  title: 'Column',
  columns: ['Year', 'A', 'B'],
  rows: [['2021', 61, 9], ['2022', 70, 12], ['2023', 58, 21], ['2024', 73, 18], ['2025', 80, 26]],
}

export const stacked: GraphSpec = { ...column, title: 'Column, stacked', stacked: true }

export const line: GraphSpec = {
  kind: 'line',
  title: 'Line',
  columns: ['Year', 'A', 'B', 'C'],
  rows: [
    ['2016', 310, 120, 80],
    ['2017', 325, 131, 84],
    ['2018', 342, 128, 96],
    ['2019', 351, 140, 101],
    ['2020', 330, 122, 99],
    ['2021', 362, 151, 112],
    ['2022', 380, 160, 118],
    ['2023', 401, 158, 131],
    ['2024', 415, 172, 140],
    ['2025', 432, 181, 152],
  ],
}

export const manyLines: GraphSpec = {
  kind: 'line',
  title: 'Line, one against many',
  columns: ['Year', 'RPI', 'B', 'C', 'D', 'E', 'F'],
  rows: [
    ['2018', 50, 62, 41, 70, 33, 55],
    ['2019', 54, 64, 40, 73, 36, 53],
    ['2020', 49, 60, 44, 71, 35, 57],
    ['2021', 58, 67, 43, 78, 39, 56],
    ['2022', 63, 69, 47, 80, 38, 60],
    ['2023', 61, 72, 46, 84, 42, 59],
    ['2024', 68, 75, 50, 86, 41, 63],
    ['2025', 74, 77, 49, 91, 45, 62],
  ],
}

export const scatter: GraphSpec = {
  kind: 'scatter',
  title: 'Scatter',
  x: { label: 'X', short: 'X', scale: 'linear' },
  y: { label: 'Y', short: 'Y', scale: 'linear' },
  points: [
    { label: 'A', x: 44, y: 270, highlight: true },
    { label: 'B', x: 21, y: 60 },
    { label: 'C', x: 63, y: 180 },
    { x: 12, y: 110 },
    { x: 30, y: 150 },
    { x: 37, y: 95 },
    { x: 52, y: 230 },
    { x: 58, y: 120 },
    { x: 70, y: 250 },
  ],
}

export const flow: GraphSpec = {
  kind: 'flow',
  title: 'Flow',
  labels: 'both',
  flows: [
    ['A', 'Total', 300],
    ['B', 'Total', 80],
    ['C', 'Total', 40],
    ['Total', 'X', 210],
    ['Total', 'Y', 170],
    ['Total', 'Z', 40],
    ['X', 'X1', 120],
    ['X', 'X2', 90],
  ],
}
