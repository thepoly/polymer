// A 1-in-1000 visual gag on /staff: the senior board's portraits are swapped for
// the Ted Lasso cast. Names, titles and links stay real — only the faces change.
//
// Two constraints shape the design:
//
//  1. The roll must happen in the browser, never on the server. /staff is ISR
//     (`export const revalidate = 60`), so a server-side roll would be baked into
//     the cached HTML and served to every visitor for the next minute, and would
//     be what crawlers index if they arrived on a lucky roll.
//  2. The photos must stay out of search. Because the swap is client-only, the
//     rendered HTML and the OG tags always carry the real staff. `public/easter-egg`
//     is additionally disallowed in robots.txt so the files can't be picked up
//     directly by image crawlers.
//
// Every photo below is freely licensed. Credits are reproduced verbatim from each
// file's Commons metadata and are rendered on-page whenever the swap is active —
// CC attribution has to accompany the use, so the citation block only appears on
// the rolls where the photos actually do.

export const EASTER_EGG_ODDS = 1000

export type EasterEggFace = {
  /** Path under /public. Only ever requested on a winning roll. */
  src: string
  /** Photographer / rights holder, verbatim from Commons. */
  credit: string
  /** Short license name, e.g. "CC BY-SA 4.0" or "Public domain". */
  license: string
  /** Deed URL, or null for public-domain files. */
  licenseUrl: string | null
  /** Commons file description page. */
  source: string
}

// Pinned by title. Keys are matched case-insensitively against the staffer's
// current position title (see getCurrentPositionTitle).
export const PINNED_FACES: Record<string, EasterEggFace> = {
  'editor in chief': {
    src: '/easter-egg/waddingham.jpg',
    credit: 'Harald Krichel',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Hannah_Waddingham-2790.jpg',
  },
  'business manager': {
    src: '/easter-egg/sudeikis.jpg',
    credit: 'Kevin Paul',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Jason_Sudeikis_-_How_to_Start.jpg',
  },
  'senior managing editor': {
    src: '/easter-egg/hunt.jpg',
    credit: 'The White House',
    license: 'Public domain',
    licenseUrl: null,
    source:
      'https://commons.wikimedia.org/wiki/File:Brendan_Hunt_on_March_20,_2023_in_the_Oval_Office_of_the_White_House_-_P20230320AS-2310_(cropped).jpg',
  },
}

// Pinned by position rather than title: the tail of the board, right-aligned, so
// the final row ends Leslie, Sam, Jamie, Roy. Order here is left-to-right as
// rendered; the array is applied to the last TAIL_FACES.length slots.
export const TAIL_FACES: EasterEggFace[] = [
  {
    // Leslie Higgins
    src: '/easter-egg/swift.jpg',
    credit: 'The White House',
    license: 'Public domain',
    licenseUrl: null,
    source:
      'https://commons.wikimedia.org/wiki/File:Jeremy_Swift_on_March_20,_2023_in_the_Oval_Office_of_the_White_House_-_P20230320AS-2576_(cropped).jpg',
  },
  {
    // Sam Obisanya
    src: '/easter-egg/jimoh.jpg',
    credit: 'The White House',
    license: 'Public domain',
    licenseUrl: null,
    source:
      'https://commons.wikimedia.org/wiki/File:Toheeb_Jimoh_on_March_20,_2023_in_the_Oval_Office_of_the_White_House_-_P20230320AS-2576_(cropped).jpg',
  },
  {
    // Jamie Tartt
    src: '/easter-egg/dunster.jpg',
    credit: 'Super Festivals',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Phil_Dunster_Photo_Op_GalaxyCon_Columbus_2024.jpg',
  },
  {
    // Roy Kent — always the rightmost face on the page.
    src: '/easter-egg/goldstein.jpg',
    credit: 'Kevin Paul',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Brett_Goldstein_at_PaleyLive_Shrinking_2024-2.jpg',
  },
]

// Middle-of-board slots draw from here. Sarah Niles is absent because no freely
// licensed photo of her exists on Commons.
export const FACE_POOL: EasterEggFace[] = [
  {
    src: '/easter-egg/temple.jpg',
    credit: 'USANA Health Sciences',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Juno_Temple_at_Sundance_2011.jpg',
  },
  {
    src: '/easter-egg/mohammed.jpg',
    credit: 'JaceMerlyn',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Nick_Mohammed_at_BAFTAs_2026_01.jpg',
  },
  {
    src: '/easter-egg/fernandez.jpg',
    credit: 'Super Festivals',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Cristo_Fernandez_Photo_Op_GalaxyCon_Richmond_2024.jpg',
  },
  {
    src: '/easter-egg/head.jpg',
    credit: 'Raven Underwood',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Anthony_Stewart_Head.jpg',
  },
]

/**
 * Assign a face to every board member. Pinned titles win first, then the tail
 * sequence is laid over the final slots right-aligned (… Leslie, Sam, Jamie,
 * Roy), then anything still unassigned draws from the pool without repeating.
 *
 * `rows` is the board as rendered, so "rightmost" is the last entry of the last
 * row. A title pin always beats a tail slot — a board small enough for the two
 * to collide should keep the named officers.
 */
export function assignFaces<T extends { id: number }>(
  rows: T[][],
  titleOf: (user: T) => string,
): Map<number, EasterEggFace> {
  const assigned = new Map<number, EasterEggFace>()

  for (const row of rows) {
    for (const user of row) {
      const pinned = PINNED_FACES[titleOf(user).trim().toLowerCase()]
      if (pinned) assigned.set(user.id, pinned)
    }
  }

  // Lay the tail over the final slots, walking right to left so Roy lands last.
  const lastRow = rows[rows.length - 1] ?? []
  for (let offset = 0; offset < TAIL_FACES.length; offset += 1) {
    const user = lastRow[lastRow.length - 1 - offset]
    if (!user || assigned.has(user.id)) continue
    assigned.set(user.id, TAIL_FACES[TAIL_FACES.length - 1 - offset])
  }

  const used = new Set(Array.from(assigned.values()).map((face) => face.src))
  let remaining = FACE_POOL.filter((face) => !used.has(face.src))

  for (const row of rows) {
    for (const user of row) {
      if (assigned.has(user.id)) continue
      // Refill once drained so a large board still gets a face everywhere.
      if (remaining.length === 0) remaining = [...FACE_POOL]
      const index = Math.floor(Math.random() * remaining.length)
      assigned.set(user.id, remaining[index])
      remaining.splice(index, 1)
    }
  }

  return assigned
}

/** Unique credit lines for the faces actually shown, in display order. */
export function creditsFor(faces: Iterable<EasterEggFace>): EasterEggFace[] {
  const seen = new Set<string>()
  const out: EasterEggFace[] = []
  for (const face of faces) {
    if (seen.has(face.src)) continue
    seen.add(face.src)
    out.push(face)
  }
  return out
}
