/**
 * Small, hand-picked details on the shelf's books, so it reads as a shelf of
 * real volumes rather than a row of bars. Each one is chosen per term, not
 * generated: older books show more wear, a few stay plain, and the term in
 * session (and any term after these lists) is a new book with none. They're
 * independent of the spine's colour, which moves along the palette each year.
 */
export type SpineDetails = {
  /** A striped cloth band across the head of the spine */
  headband?: true;
  /** Paired ridges at the head and foot, as on old leather bindings */
  raisedBands?: true;
  /** A faint cloth weave */
  cloth?: true;
  /** The head of the spine paled, as if it stood by a window for years */
  sunFaded?: true;
  /** A dust jacket a little shorter than the boards, which show at head and foot */
  shortJacket?: true;
  /** Old-style figures in the title ("2019–20", "51st" with descending numerals) */
  oldstyleFigures?: true;
  /**
   * Leans on the book before it, its foot slid out a little. Only the oldest:
   * a book only leans where there's room, at the end of the row
   */
  lean?: true;
};

/** Senate, by number */
const SENATE: Record<number, SpineDetails> = {
  56: { headband: true },
  55: { cloth: true },
  53: { shortJacket: true },
  52: { headband: true, cloth: true },
  51: { oldstyleFigures: true },
  50: { sunFaded: true },
  49: { shortJacket: true },
  48: { raisedBands: true },
  47: { sunFaded: true, cloth: true },
  46: { headband: true },
  45: { oldstyleFigures: true, shortJacket: true },
  44: { raisedBands: true, sunFaded: true },
  43: { raisedBands: true, cloth: true, lean: true },
};

/** Executive Board, by the year the term starts */
const EBOARD: Record<number, SpineDetails> = {
  2025: { cloth: true },
  2024: { headband: true },
  2022: { shortJacket: true },
  2021: { oldstyleFigures: true },
  2020: { headband: true, cloth: true },
  2018: { sunFaded: true },
  2017: { raisedBands: true },
  2016: { shortJacket: true, cloth: true },
  2015: { sunFaded: true },
  2014: { headband: true, oldstyleFigures: true },
  2013: { raisedBands: true, sunFaded: true },
  2012: { raisedBands: true, cloth: true, lean: true },
};

const NONE: SpineDetails = {};

export function spineDetailsFor(t: { body: "senate" | "eboard"; number: number | null; startYear: number }): SpineDetails {
  if (t.body === "senate") return t.number !== null ? (SENATE[t.number] ?? NONE) : NONE;
  return EBOARD[t.startYear] ?? NONE;
}
