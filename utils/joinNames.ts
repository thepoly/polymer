/**
 * Pairs each name with the separator that goes before it, AP style with no
 * serial comma: "A", "A and B", "A, B and C". Components render the
 * separators as plain text between their own name elements (links, spans).
 * Every byline joins authors through this; nothing joins them by hand.
 */
export function joinNames<T>(items: T[]): { item: T; sep: string }[] {
  const last = items.length - 1;
  return items.map((item, i) => ({
    item,
    sep: i === 0 ? '' : i === last ? ' and ' : ', ',
  }));
}

/** joinNames for plain strings: "A, B and C". */
export function joinNameText(names: string[]): string {
  return joinNames(names)
    .map(({ item, sep }) => sep + item)
    .join('');
}
