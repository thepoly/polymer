const MONTH_LOOKUP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export type ParsedArchiveDateQuery =
  | { kind: "exact"; dateKey: string }
  | { kind: "month"; year: number; month: number }
  | { kind: "year"; year: number };

export type ResolvedArchiveDateQuery =
  | { status: "ok"; date: string; parsed: ParsedArchiveDateQuery }
  | { status: "invalid" }
  | { status: "no-match"; parsed: ParsedArchiveDateQuery }
  | { status: "pre-archive"; earliestYear: number; parsed: ParsedArchiveDateQuery };

const buildDateKey = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getClosestDateToTarget = (dates: string[], targetDate: string) => {
  if (dates.length === 0) return "";

  const targetTime = parseDateKey(targetDate).getTime();
  let closest = dates[0];
  let closestDistance = Math.abs(parseDateKey(closest).getTime() - targetTime);

  for (const date of dates) {
    const distance = Math.abs(parseDateKey(date).getTime() - targetTime);
    if (distance < closestDistance) {
      closest = date;
      closestDistance = distance;
    }
  }

  return closest;
};

export const parseArchiveDateQuery = (
  value: string,
  referenceDate: Date = new Date(),
): ParsedArchiveDateQuery | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const lowered = compact.toLowerCase();

  const exactIsoMatch = compact.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (exactIsoMatch) {
    const dateKey = buildDateKey(
      Number(exactIsoMatch[1]),
      Number(exactIsoMatch[2]),
      Number(exactIsoMatch[3]),
    );
    return dateKey ? { kind: "exact", dateKey } : null;
  }

  const exactSlashMatch = compact.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (exactSlashMatch) {
    const year = exactSlashMatch[3].length === 2
      ? Number(`20${exactSlashMatch[3]}`)
      : Number(exactSlashMatch[3]);
    const dateKey = buildDateKey(year, Number(exactSlashMatch[1]), Number(exactSlashMatch[2]));
    return dateKey ? { kind: "exact", dateKey } : null;
  }

  const compactDigits = compact.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDigits) {
    const dateKey = buildDateKey(
      Number(compactDigits[1]),
      Number(compactDigits[2]),
      Number(compactDigits[3]),
    );
    return dateKey ? { kind: "exact", dateKey } : null;
  }

  const yearMonthMatch = compact.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (yearMonthMatch) {
    const year = Number(yearMonthMatch[1]);
    const month = Number(yearMonthMatch[2]);
    if (month >= 1 && month <= 12) {
      return { kind: "month", year, month };
    }
    return null;
  }

  const monthYearNumericMatch = compact.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (monthYearNumericMatch) {
    const month = Number(monthYearNumericMatch[1]);
    const year = Number(monthYearNumericMatch[2]);
    if (month >= 1 && month <= 12) {
      return { kind: "month", year, month };
    }
    return null;
  }

  const yearOnlyMatch = compact.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return { kind: "year", year: Number(yearOnlyMatch[1]) };
  }

  const monthYearTextMatch = lowered.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYearTextMatch) {
    const month = MONTH_LOOKUP[monthYearTextMatch[1]];
    if (month) {
      return { kind: "month", month, year: Number(monthYearTextMatch[2]) };
    }
    return null;
  }

  const monthOnly = MONTH_LOOKUP[lowered];
  if (monthOnly) {
    return { kind: "month", month: monthOnly, year: referenceDate.getFullYear() };
  }

  const parsed = new Date(compact);
  if (!Number.isNaN(parsed.getTime())) {
    const dateKey = buildDateKey(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
    return dateKey ? { kind: "exact", dateKey } : null;
  }

  return null;
};

export const resolveArchiveDateQuery = (
  availableDates: string[],
  rawValue: string,
  referenceDate: Date = new Date(),
): ResolvedArchiveDateQuery => {
  const parsed = parseArchiveDateQuery(rawValue, referenceDate);
  if (!parsed) return { status: "invalid" };
  if (availableDates.length === 0) return { status: "no-match", parsed };

  const earliestDate = availableDates[0];
  const earliestYear = Number(earliestDate.slice(0, 4));

  if (parsed.kind === "year") {
    if (parsed.year < earliestYear) {
      return { status: "pre-archive", earliestYear, parsed };
    }

    const firstInYear = availableDates.find((date) => date.startsWith(`${parsed.year}-`));
    return firstInYear
      ? { status: "ok", date: firstInYear, parsed }
      : { status: "no-match", parsed };
  }

  if (parsed.kind === "month") {
    const monthPrefix = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
    const firstInMonth = availableDates.find((date) => date.startsWith(monthPrefix));
    if (firstInMonth) {
      return { status: "ok", date: firstInMonth, parsed };
    }

    const monthStart = `${monthPrefix}-01`;
    if (monthStart < earliestDate) {
      return { status: "pre-archive", earliestYear, parsed };
    }

    return { status: "no-match", parsed };
  }

  if (parsed.dateKey < earliestDate) {
    return { status: "pre-archive", earliestYear, parsed };
  }

  const closestDate = getClosestDateToTarget(availableDates, parsed.dateKey);
  return closestDate
    ? { status: "ok", date: closestDate, parsed }
    : { status: "no-match", parsed };
};
