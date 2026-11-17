export const OPINION_PAGE_SIZE = 10;
export function opinionPageNumber(value: string | string[] | undefined): number {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}
