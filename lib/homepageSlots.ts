/**
 * Stable homepage slot numbering.
 *
 * Each slot in a homepage skeleton gets a stable integer "key" used both for
 * the admin editor (shown as a corner badge while dragging) and for
 * click-event analytics on the live site.
 *
 * Numbering rule: column-major visual reading order — go down the leftmost
 * visual column top-to-bottom, then the next column. Where a skeleton has
 * ambiguous internal structure, we pick a stable order matching the editor's
 * natural layout so editors can reason about slot numbers without surprise.
 *
 * The numbers for a given (skeleton, slotKey) MUST be stable across page
 * loads, users, and environments. Downstream analytics treat them as opaque
 * identifiers — renumbering invalidates historical data.
 */
export type HomepageLayoutName = 'custom' | 'aries' | 'taurus' | 'gemini';

/**
 * Aries (stored as AriesData: lead / left[] / right[] / bottom[]).
 *
 * Visual desktop layout from components/FrontPage/index.tsx:
 *
 *   ┌──────────────┐┌──────────────┐
 *   │ lead         ││ left-0│right-0│  (hero grid = heroLeft col + heroRight col)
 *   │              ││ left-1│right-1│
 *   │              ││ left-2│right-2│
 *   ├──────────────┤├──────────────┤
 *   │ bottom-0     ││ bottom-4     │
 *   │ btm-1│btm-2  ││ btm-5│btm-6  │
 *   │ bottom-3     ││ bottom-7     │
 *   └──────────────┘└──────────────┘
 *
 * Column-major reading order (column 1 = left band, column 2 = hero-left band,
 * column 3 = hero-right band — the two hero sub-columns are treated as
 * separate visual columns since they render as side-by-side stacks):
 */
const ARIES_SLOTS: Record<string, number> = {
  // Column 1 — lead + left bottom stack
  lead: 1,
  'bottom-0': 2,
  'bottom-1': 3,
  'bottom-2': 4,
  'bottom-3': 5,
  // Column 2 — heroLeft stack
  'left-0': 6,
  'left-1': 7,
  'left-2': 8,
  // Column 3 — heroRight stack + right bottom stack
  'right-0': 9,
  'right-1': 10,
  'right-2': 11,
  'bottom-4': 12,
  'bottom-5': 13,
  'bottom-6': 14,
  'bottom-7': 15,
};

/**
 * Taurus (feature-with-list skeleton; used mostly for section blocks but also
 * available as the top skeleton). Stored on the aries-shaped record:
 * lead = feature story, left[0..2] = supporting, right[0..2] = list rail.
 *
 *   ┌──────────────┬──────────┐
 *   │ lead         │ right-0  │
 *   │ (feature)    │ right-1  │
 *   │              │ right-2  │
 *   ├──────────────┤          │
 *   │ left-0       │          │
 *   │ left-1       │          │
 *   │ left-2       │          │
 *   └──────────────┴──────────┘
 *
 * Column-major: col 1 = lead + supporting, col 2 = list rail.
 */
const TAURUS_SLOTS: Record<string, number> = {
  lead: 1,
  'left-0': 2,
  'left-1': 3,
  'left-2': 4,
  'right-0': 5,
  'right-1': 6,
  'right-2': 7,
};

/**
 * Gemini (from components/FrontPage/GeminiHomepage.tsx). Three columns plus a
 * two-card bottom row that spans under the left + center columns; the right
 * column feature stack runs full-height.
 *
 *   ┌────────┬────────┬────────┐
 *   │ left-0 │ lead   │ right-0│
 *   │ left-1 │        │ right-1│
 *   │ left-2 │        │ right-2│
 *   │ left-3 │        │ right-3│
 *   │ left-4 │        │ right-4│
 *   │ left-5 │        │        │
 *   ├────────┼────────┤        │
 *   │ bottom-0        │        │
 *   │ │bottom-1       │        │
 *   └────────┴────────┴────────┘
 *
 * Column-major: col 1 = left stack + bottom-0, col 2 = lead + bottom-1,
 * col 3 = right feature stack.
 */
const GEMINI_SLOTS: Record<string, number> = {
  // Column 1
  'left-0': 1,
  'left-1': 2,
  'left-2': 3,
  'left-3': 4,
  'left-4': 5,
  'left-5': 6,
  'bottom-0': 7,
  // Column 2
  lead: 8,
  'bottom-1': 9,
  // Column 3
  'right-0': 10,
  'right-1': 11,
  'right-2': 12,
  'right-3': 13,
  'right-4': 14,
};

const NAMED_SKELETON_SLOTS: Record<Exclude<HomepageLayoutName, 'custom'>, Record<string, number>> = {
  aries: ARIES_SLOTS,
  taurus: TAURUS_SLOTS,
  gemini: GEMINI_SLOTS,
};

export type CustomGridCell = {
  id: string;
  span: number;
  articleId?: number | null;
  children?: CustomGridCell[];
};

export type CustomGridRow = {
  id: string;
  cells: CustomGridCell[];
};

/**
 * Enumerate all slot positions in a custom grid, column-major.
 *
 * Algorithm: walk every leaf cell (flat cells + stack sub-cells), compute its
 * (columnStart, rowIndex, stackIndex) triple, and sort by
 * (columnStart ASC, rowIndex ASC, stackIndex ASC). This gives column-major
 * "down then right" reading order.
 *
 * Note: stack sub-cells share their parent cell's columnStart, so they end up
 * numbered consecutively within the same visual column (top-to-bottom),
 * which matches user expectation.
 */
function enumerateCustomGridSlots(rows: CustomGridRow[]): Array<{ key: string; number: number }> {
  type LeafRef = { key: string; colStart: number; rowIdx: number; stackIdx: number };
  const leaves: LeafRef[] = [];

  rows.forEach((row, rowIdx) => {
    let colCursor = 0;
    for (const cell of row.cells) {
      const colStart = colCursor;
      if (cell.children && cell.children.length > 0) {
        cell.children.forEach((sub, stackIdx) => {
          leaves.push({ key: sub.id, colStart, rowIdx, stackIdx });
        });
      } else {
        leaves.push({ key: cell.id, colStart, rowIdx, stackIdx: 0 });
      }
      colCursor += cell.span;
    }
  });

  leaves.sort((a, b) => {
    if (a.colStart !== b.colStart) return a.colStart - b.colStart;
    if (a.rowIdx !== b.rowIdx) return a.rowIdx - b.rowIdx;
    return a.stackIdx - b.stackIdx;
  });

  return leaves.map((leaf, i) => ({ key: leaf.key, number: i + 1 }));
}

/**
 * Get the slot number for a single slot on a named-skeleton layout.
 *
 * Returns null if the slot key is not recognized for that skeleton. Call
 * `getAllSlotsForSkeleton` or `getCustomGridSlotLookup` for custom-grid
 * numbering since those IDs are derived from the live grid.
 */
export function getSlotNumber(
  layout: Exclude<HomepageLayoutName, 'custom'>,
  slotKey: string,
): number | null {
  const map = NAMED_SKELETON_SLOTS[layout];
  return map[slotKey] ?? null;
}

/**
 * Return the full ordered slot set for a named skeleton. Used by the admin
 * editor to render number badges on each slot card.
 */
export function getAllSlotsForSkeleton(
  layout: Exclude<HomepageLayoutName, 'custom'>,
): Array<{ key: string; number: number }> {
  const map = NAMED_SKELETON_SLOTS[layout];
  return Object.entries(map)
    .map(([key, number]) => ({ key, number }))
    .sort((a, b) => a.number - b.number);
}

/**
 * Build a lookup `cellId -> slotNumber` for a custom grid. The caller feeds
 * this map when rendering — each cell's `id` resolves to its column-major
 * position.
 */
export function getCustomGridSlotLookup(rows: CustomGridRow[]): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const { key, number } of enumerateCustomGridSlots(rows)) {
    lookup.set(key, number);
  }
  return lookup;
}
