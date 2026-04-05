"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import posthog from "posthog-js";
import TransitionLink from "@/components/TransitionLink";
import { Byline } from "@/components/FrontPage/Byline";
import type { Article } from "@/components/FrontPage/types";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { useTheme } from "@/components/ThemeProvider";
import { resolveArchiveDateQuery } from "@/lib/archiveDateQuery";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "2-digit",
});

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addToDateKey = (dateKey: string, unit: "day" | "week" | "month" | "year", amount: number) => {
  const date = parseDateKey(dateKey);

  if (unit === "day") date.setDate(date.getDate() + amount);
  if (unit === "week") date.setDate(date.getDate() + amount * 7);
  if (unit === "month") date.setMonth(date.getMonth() + amount);
  if (unit === "year") date.setFullYear(date.getFullYear() + amount);

  return formatDateKey(date);
};

const getNearestDate = (
  dates: string[],
  currentDate: string,
  unit: "day" | "week" | "month" | "year",
  direction: -1 | 1,
) => {
  const currentIndex = dates.indexOf(currentDate);
  if (currentIndex === -1) return currentDate;

  const targetDate = addToDateKey(currentDate, unit, direction);
  const targetTime = parseDateKey(targetDate).getTime();

  if (direction < 0) {
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      if (parseDateKey(dates[index]).getTime() <= targetTime) {
        return dates[index];
      }
    }

    return dates[Math.max(0, currentIndex - 1)] ?? currentDate;
  }

  for (let index = currentIndex + 1; index < dates.length; index += 1) {
    if (parseDateKey(dates[index]).getTime() >= targetTime) {
      return dates[index];
    }
  }

  return dates[Math.min(dates.length - 1, currentIndex + 1)] ?? currentDate;
};

const formatSelectedDate = (dateKey: string) => {
  if (!dateKey) return "No publication date selected";
  return dateFormatter.format(parseDateKey(dateKey));
};

const isSameMonth = (left: string | undefined, right: string) => {
  if (!left) return false;
  const leftDate = parseDateKey(left);
  const rightDate = parseDateKey(right);
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth()
  );
};

const DAY_WIDTH = 6;
const BAR_HIT_WIDTH = 14;
const LARGE_MONTH_LABEL_SPACING = 220;
const RAINBOW_PASTELS = [
  "#f4b2b6",
  "#f5c5a3",
  "#f4e2a1",
  "#bfe3b5",
  "#b7d7f5",
  "#cdbdf4",
];
const DARK_MODE_RAINBOW_PASTELS = [
  "#ff7f8f",
  "#ffb26b",
  "#ffe07a",
  "#7edb9c",
  "#7fc7ff",
  "#b799ff",
];

const archiveJumpControls = [
  { label: "Year", unit: "year" as const },
  { label: "Month", unit: "month" as const },
  { label: "Day", unit: "day" as const },
];
const FOLSOM_ARCHIVE_URL = "https://digitalassets.archives.rpi.edu/do/235be3d2-f018-48af-a413-b50e16dd6dc7";

function ArchiveJumpButton({
  direction,
  label,
  onClick,
}: {
  direction: "back" | "forward";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rule px-3 text-text-main transition-colors"
    >
      <span
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full p-[1px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      >
        <span className="absolute left-1/2 top-1/2 aspect-square w-[300%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)]" />
      </span>

      {direction === "back" ? (
        <span className="relative z-10 text-[12px] font-semibold">&larr;</span>
      ) : null}
      <span className="relative z-10 whitespace-nowrap font-meta text-[10px] font-medium uppercase tracking-[0.1em]">
        {label}
      </span>
      {direction === "forward" ? (
        <span className="relative z-10 text-[12px] font-semibold">&rarr;</span>
      ) : null}
    </button>
  );
}

function ArchiveArticleRow({ article }: { article: Article }) {
  return (
    <TransitionLink
      href={getArticleUrl(article)}
      data-analytics-context="archive"
      className={`group grid gap-4 py-5 md:items-start md:gap-6 ${article.image ? "md:grid-cols-[minmax(0,1fr)_220px]" : "md:grid-cols-1"}`}
    >
      <div className="min-w-0">
        {article.kicker && (
          <p className="mb-1 font-meta text-[12px] font-[600] uppercase tracking-[0.08em] text-accent dark:text-[#d96b76]">
            {article.kicker}
          </p>
        )}
        <h2
          className={`font-copy text-[28px] leading-[1.06] tracking-[-0.02em] text-text-main transition-colors group-hover:text-accent ${
            article.section === "opinion" ? "font-light" : "font-bold"
          } ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light" : ""}`}
        >
          {article.richTitle || article.title}
        </h2>
        <Byline author={article.author} date={article.date} className="mt-2 block" />
        {article.excerpt && (
          <p className="mt-2 font-meta text-[14px] leading-[1.48] text-text-muted">
            {article.excerpt}
          </p>
        )}
      </div>

      {article.image && (
        <div className="relative overflow-hidden border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={article.image}
              alt={article.imageTitle || ""}
              fill
              className="object-cover"
              sizes="220px"
            />
          </div>
        </div>
      )}
    </TransitionLink>
  );
}

const getDayOffset = (from: string, to: string) => {
  const fromTime = parseDateKey(from).getTime();
  const toTime = parseDateKey(to).getTime();
  return Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24));
};

const buildSmoothLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
};

export default function ArchiveTimeMachinePage({
  availableDates,
  publicationCounts,
  initialDate,
  initialArticles,
  initialQuery,
  initialQuerySource,
  initialQueryStatus,
}: {
  availableDates: string[];
  publicationCounts: Record<string, number>;
  initialDate: string;
  initialArticles: Article[];
  initialQuery?: string;
  initialQuerySource?: string;
  initialQueryStatus?: "ok" | "invalid" | "no-match" | "pre-archive" | null;
}) {
  const { isDarkMode, logoSrcs } = useTheme();
  const logoSrc = isDarkMode ? logoSrcs.mobileDark : logoSrcs.mobileLight;
  const timelineMonthColors = isDarkMode ? DARK_MODE_RAINBOW_PASTELS : RAINBOW_PASTELS;
  const timelineAreaStops = isDarkMode
    ? [
        { offset: "0%", color: "rgba(255,95,116,0.34)" },
        { offset: "18%", color: "rgba(255,95,116,0.22)" },
        { offset: "48%", color: "rgba(255,95,116,0.1)" },
        { offset: "100%", color: "rgba(255,95,116,0)" },
      ]
    : [
        { offset: "0%", color: "rgba(214,0,28,0.24)" },
        { offset: "18%", color: "rgba(214,0,28,0.15)" },
        { offset: "48%", color: "rgba(214,0,28,0.07)" },
        { offset: "100%", color: "rgba(214,0,28,0)" },
      ];
  const timelineStrokeColor = isDarkMode ? "#f5f7ff" : "#000000";
  const timelineFocusLabelColor = isDarkMode ? "#f5f7ff" : "#000000";
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const snapDates = useMemo(
    () => availableDates.filter((date) => (publicationCounts[date] ?? 0) > 0),
    [availableDates, publicationCounts],
  );
  const displayDates = useMemo(() => [...snapDates], [snapDates]);
  const safeInitialDate = snapDates.includes(initialDate)
    ? initialDate
    : snapDates[snapDates.length - 1] ?? '';
  const [selectedDate, setSelectedDate] = useState(safeInitialDate);
  const [articlesByDate, setArticlesByDate] = useState<Record<string, Article[]>>(
    safeInitialDate ? { [safeInitialDate]: initialArticles } : {},
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [dragPreviewDate, setDragPreviewDate] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(initialQuery ?? "");
  const [dateInputError, setDateInputError] = useState<string | null>(
    initialQueryStatus === "pre-archive"
      ? "pre-archive"
      : initialQueryStatus === "no-match"
        ? "No published archive dates available."
        : initialQueryStatus === "invalid"
          ? "Could not parse that date."
          : null,
  );
  const [viewportScrollLeft, setViewportScrollLeft] = useState(0);
  const initialSelectionTrackedRef = useRef(false);

  const timelineData = useMemo(() => {
    if (displayDates.length === 0) {
      return { dates: [] as string[], offsets: [] as number[], width: 0 };
    }

    const oldestDate = displayDates[0];
    const newestDate = displayDates[displayDates.length - 1];
    const innerWidth = Math.max(1, getDayOffset(oldestDate, newestDate) + 1) * DAY_WIDTH;
    const sidePadding = Math.max(0, Math.floor(viewportWidth / 2));

    return {
      dates: displayDates,
      offsets: displayDates.map((date) => sidePadding + getDayOffset(oldestDate, date) * DAY_WIDTH),
      width: innerWidth + sidePadding * 2,
    };
  }, [displayDates, viewportWidth]);
  const maxPublicationCount = useMemo(
    () => Math.max(...Object.values(publicationCounts), 1),
    [publicationCounts],
  );
  const largeMonthLabels = useMemo(() => {
    const visible = new Set<number>();
    let lastAcceptedOffset = Number.NEGATIVE_INFINITY;

    timelineData.dates.forEach((date, index) => {
      const previousDate = timelineData.dates[index - 1];
      const isMonthStart = !previousDate || !isSameMonth(previousDate, date);
      if (!isMonthStart) return;

      const offset = timelineData.offsets[index] ?? 0;
      if (offset - lastAcceptedOffset >= LARGE_MONTH_LABEL_SPACING) {
        visible.add(index);
        lastAcceptedOffset = offset;
      }
    });

    return visible;
  }, [timelineData.dates, timelineData.offsets]);

  const centerDate = useCallback((date: string, behavior: ScrollBehavior = "smooth") => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const baseIndex = displayDates.indexOf(date);
    if (baseIndex === -1) return;

    const baseOffset = timelineData.offsets[baseIndex] ?? 0;
    const maxLeft = Math.max(0, timelineData.width - viewport.clientWidth);
    const left = Math.max(0, Math.min(baseOffset - viewport.clientWidth / 2, maxLeft));
    viewport.scrollTo({ left, behavior });
  }, [displayDates, timelineData.offsets, timelineData.width]);

  useEffect(() => {
    centerDate(safeInitialDate, "auto");
  }, [centerDate, safeInitialDate]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const updateViewportWidth = () => {
      setViewportWidth(viewport.clientWidth);
    };

    updateViewportWidth();

    const observer = new ResizeObserver(() => {
      updateViewportWidth();
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedDate || articlesByDate[selectedDate]) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/archive/day?date=${encodeURIComponent(selectedDate)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load archive date.");
        }

        return response.json() as Promise<{ articles: Article[] }>;
      })
      .then((payload) => {
        setArticlesByDate((current) => (
          current[selectedDate] ? current : { ...current, [selectedDate]: payload.articles }
        ));
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          console.error("[archive] Failed to fetch date", error);
        }
      })
      .finally(() => {
      });

    return () => controller.abort();
  }, [articlesByDate, selectedDate]);

  const captureArchiveDateSelection = useCallback((
    date: string,
    source: string,
    extra?: Record<string, string | number | boolean | null>,
  ) => {
    posthog.capture("archive_date_selected", {
      selected_date: date,
      article_count: publicationCounts[date] ?? 0,
      source,
      ...extra,
    });
  }, [publicationCounts]);

  const selectDate = useCallback((
    date: string,
    options?: {
      center?: boolean;
      source?: string;
      analytics?: Record<string, string | number | boolean | null>;
      forceTrack?: boolean;
    },
  ) => {
    if (!date) return;
    const shouldTrack = Boolean(options?.source) && (options?.forceTrack || date !== selectedDate);
    if (date !== selectedDate) {
      setSelectedDate(date);
    }
    if (options?.center) {
      centerDate(date);
    }
    if (shouldTrack && options?.source) {
      captureArchiveDateSelection(date, options.source, options.analytics);
    }
  }, [captureArchiveDateSelection, centerDate, selectedDate]);

  useEffect(() => {
    if (initialSelectionTrackedRef.current || !initialQuery || !initialQuerySource || !initialQueryStatus) {
      return;
    }

    initialSelectionTrackedRef.current = true;

    if (initialQueryStatus === "ok") {
      captureArchiveDateSelection(initialDate, initialQuerySource, {
        requested_query: initialQuery,
        requested_status: initialQueryStatus,
      });
      return;
    }

    posthog.capture("archive_date_selected", {
      selected_date: initialDate,
      article_count: publicationCounts[initialDate] ?? 0,
      source: initialQuerySource,
      requested_query: initialQuery,
      requested_status: initialQueryStatus,
    });
  }, [
    captureArchiveDateSelection,
    initialDate,
    initialQuery,
    initialQuerySource,
    initialQueryStatus,
    publicationCounts,
  ]);

  const commitCenteredDate = () => {
    const viewport = scrollRef.current;
    if (!viewport || snapDates.length === 0) return null;

    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    return getClosestPublishedDate(center);
  };

  const getClosestPublishedDate = (center: number) => {
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    timelineData.offsets.forEach((offset, index) => {
      const distance = Math.abs(offset - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return {
      date: timelineData.dates[closestIndex] ?? null,
      offset: timelineData.offsets[closestIndex] ?? 0,
    };
  };

  const moveSelection = (unit: "day" | "week" | "month" | "year", direction: -1 | 1) => {
    const nextDate = getNearestDate(snapDates, selectedDate, unit, direction);
    if (nextDate === selectedDate) return;
    selectDate(nextDate, {
      center: true,
      source: "archive-nav-button",
      analytics: {
        nav_unit: unit,
        nav_direction: direction < 0 ? "back" : "forward",
      },
    });
  };

  const submitTypedDate = useCallback(() => {
    const resolution = resolveArchiveDateQuery(snapDates, dateInput);
    if (resolution.status === "invalid") {
      setDateInputError("Could not parse that date.");
      return;
    }

    if (resolution.status === "pre-archive") {
      setDateInputError("pre-archive");
      return;
    }

    if (resolution.status !== "ok") {
      setDateInputError("No published archive dates available.");
      return;
    }

    setDateInputError(null);
    selectDate(resolution.date, {
      center: true,
      source: "archive-search",
      analytics: {
        requested_query: dateInput.trim(),
        requested_kind: resolution.parsed.kind,
      },
      forceTrack: true,
    });
  }, [dateInput, selectDate, snapDates]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
    };

    viewport.setPointerCapture(event.pointerId);
    setDragPreviewDate(null);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = scrollRef.current;
    const dragState = dragStateRef.current;
    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const maxLeft = Math.max(0, timelineData.width - viewport.clientWidth);
    viewport.scrollLeft = Math.max(0, Math.min(dragState.startScrollLeft - deltaX, maxLeft));
    const preview = getClosestPublishedDate(viewport.scrollLeft + viewport.clientWidth / 2);
    setDragPreviewDate(preview?.date ?? null);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = scrollRef.current;
    const dragState = dragStateRef.current;
    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    viewport.releasePointerCapture(event.pointerId);
    const nextDate = commitCenteredDate();
    setDragPreviewDate(null);
    if (nextDate?.date) {
      selectDate(nextDate.date, { center: true, source: "archive-drag-release" });
    }
  };

  const articles = articlesByDate[selectedDate] ?? [];
  const focusDate = dragPreviewDate ?? selectedDate;
  const focusPoint = useMemo(() => {
    const index = timelineData.dates.indexOf(focusDate);
    if (index === -1) return null;

    const offset = timelineData.offsets[index] ?? 0;
    const count = publicationCounts[focusDate] ?? 0;
    const pointY = 78 - (count / maxPublicationCount) * 54 - 8;

    return { offset, pointY };
  }, [focusDate, maxPublicationCount, publicationCounts, timelineData.dates, timelineData.offsets]);
  const focusCount = publicationCounts[focusDate] ?? 0;
  const focusShortDate = focusDate ? shortDateFormatter.format(parseDateKey(focusDate)) : "";
  const archiveYearRange = useMemo(() => {
    if (snapDates.length === 0) return "";
    const startYear = parseDateKey(snapDates[0]).getFullYear();
    const endYear = parseDateKey(snapDates[snapDates.length - 1]).getFullYear();
    return `${startYear}-${endYear}`;
  }, [snapDates]);
  const earliestArchiveYear = useMemo(
    () => (snapDates.length > 0 ? parseDateKey(snapDates[0]).getFullYear() : null),
    [snapDates],
  );
  const isAtEarliestEdge = viewportScrollLeft <= 8;
  const chartPoints = useMemo(
    () => timelineData.dates.map((date, index) => {
      const offset = timelineData.offsets[index] ?? 0;
      const count = publicationCounts[date] ?? 0;
      const y = 78 - (count / maxPublicationCount) * 54 - 8;

      return { x: offset, y };
    }),
    [maxPublicationCount, publicationCounts, timelineData.dates, timelineData.offsets],
  );
  const smoothLinePath = useMemo(() => buildSmoothLinePath(chartPoints), [chartPoints]);
  const smoothAreaPath = useMemo(() => {
    if (chartPoints.length === 0) return "";

    const lastPoint = chartPoints[chartPoints.length - 1];
    return `${buildSmoothLinePath(chartPoints)} L ${lastPoint.x} 156 L 0 156 Z`;
  }, [chartPoints]);
  const timelineBar = snapDates.length > 0 ? (
    <div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex flex-col items-start gap-1.5 pr-2">
          {archiveJumpControls.map((control) => (
            <ArchiveJumpButton
              key={`back-${control.unit}`}
              onClick={() => moveSelection(control.unit, -1)}
              direction="back"
              label={control.label}
            />
          ))}
        </div>

        <div className="relative overflow-hidden py-1">
          <div
            ref={scrollRef}
            onScroll={(event) => {
              setViewportScrollLeft(event.currentTarget.scrollLeft);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
          >
            <div
              className="relative h-[156px]"
              style={{ width: `${Math.max(timelineData.width, BAR_HIT_WIDTH)}px` }}
            >
              {isAtEarliestEdge && earliestArchiveYear && timelineData.offsets.length > 0 && (
                <a
                  href={FOLSOM_ARCHIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute left-0 top-[118px] z-20 -translate-x-full pr-4 font-meta text-[12px] font-semibold tracking-[0.02em] text-[#d6001c]"
                  style={{ marginLeft: `${timelineData.offsets[0]}px` }}
                >
                  You can access our archives pre-{earliestArchiveYear} at The RPI Libraries Digital Archive.
                </a>
              )}
              {timelineData.dates.map((date, index) => {
                const previousDate = timelineData.dates[index - 1];
                const monthBreak = !previousDate || !isSameMonth(previousDate, date);
                if (!monthBreak || !largeMonthLabels.has(index)) return null;

                const offset = timelineData.offsets[index] ?? 0;

                return (
                  <span
                    key={`bg-${date}-${index}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -translate-x-1/2 whitespace-nowrap font-meta text-[50px] font-bold uppercase leading-[0.82] tracking-[0.02em] dark:opacity-60"
                    style={{
                      left: `${offset}px`,
                      color: timelineMonthColors[Math.floor(offset / LARGE_MONTH_LABEL_SPACING) % timelineMonthColors.length],
                    }}
                  >
                    {monthFormatter.format(parseDateKey(date)).toUpperCase()}
                  </span>
                );
              })}
              <svg
                className="absolute inset-0 h-full w-full overflow-visible"
                viewBox={`0 0 ${Math.max(timelineData.width, BAR_HIT_WIDTH)} 156`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="archive-area-fill" x1="0" y1="0" x2="0" y2="1">
                    {timelineAreaStops.map((stop) => (
                      <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                    ))}
                  </linearGradient>
                </defs>
                <path
                  d={smoothAreaPath}
                  fill="url(#archive-area-fill)"
                />
                <path
                  d={smoothLinePath}
                  fill="none"
                  stroke={timelineStrokeColor}
                  strokeWidth="2"
                />
              </svg>
              {timelineData.dates.map((date, index) => {
                const isPreview = date === dragPreviewDate && date !== selectedDate;
                const isHovered = date === hoveredDate && date !== selectedDate && !isPreview;
                const offset = timelineData.offsets[index] ?? 0;
                const count = publicationCounts[date] ?? 0;
                const pointY = 78 - (count / maxPublicationCount) * 54 - 8;

                return (
                  <button
                    key={`${date}-${index}`}
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onMouseEnter={() => {
                      setHoveredDate(date);
                    }}
                    onMouseLeave={() => {
                      setHoveredDate((current) => (current === date ? null : current));
                    }}
                    onFocus={() => {
                      setHoveredDate(date);
                    }}
                    onBlur={() => {
                      setHoveredDate((current) => (current === date ? null : current));
                    }}
                    onClick={() => {
                      selectDate(date, { center: true, source: "archive-dot-click" });
                    }}
                    className="absolute bottom-0 flex h-full -translate-x-1/2 items-end justify-center"
                    style={{ left: `${offset}px`, width: `${BAR_HIT_WIDTH}px` }}
                    aria-label={`View articles from ${formatSelectedDate(date)}`}
                  >
                    <span
                      className={
                        isPreview || isHovered
                          ? "archive-preview-dot absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          : "absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black dark:bg-white"
                      }
                      style={{ top: `${pointY}px` }}
                    />
                  </button>
                );
              })}
              {focusPoint && (
                <>
                  <span
                    aria-hidden="true"
                    className="archive-selected-dot pointer-events-none absolute top-0 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${focusPoint.offset}px`, top: `${focusPoint.pointY}px` }}
                  />
                  <span
                    className="pointer-events-none absolute top-[104px] z-20 -translate-x-1/2 text-center font-meta"
                    style={{ left: `${focusPoint.offset}px`, color: timelineFocusLabelColor }}
                  >
                    <span className="block whitespace-nowrap text-[18px] font-bold uppercase tracking-[0.14em]">
                      {`${focusCount} article${focusCount === 1 ? "" : "s"} on`}
                    </span>
                    <span className="mt-0.5 block whitespace-nowrap text-[14px] font-semibold uppercase tracking-[0.12em]">
                      {focusShortDate}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-bg-main to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg-main to-transparent" />
        </div>

        <div className="flex flex-col items-end gap-1.5 pl-2">
          {archiveJumpControls.map((control) => (
            <ArchiveJumpButton
              key={`forward-${control.unit}`}
              onClick={() => moveSelection(control.unit, 1)}
              direction="forward"
              label={control.label}
            />
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="rounded-[24px] border border-dashed border-black/15 px-5 py-9 dark:border-white/15">
      <p className="font-meta text-[12px] uppercase tracking-[0.16em] text-text-muted">
        No published archive dates yet.
      </p>
    </div>
  );

  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 md:px-6 xl:px-[30px]">
      <div className="mb-10 pb-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
              <span className="text-[#D6001C] dark:text-[#ff5f74]">Archives</span>{" "}
              <span className="text-[#b7d7f5] dark:text-[#b7d7f5]">[Beta]</span>{" "}
              <span className="text-[#b7bcc6] dark:text-[#b7bcc6]">{archiveYearRange}</span>
            </h1>
          </div>
          <div className="min-w-0">
            {timelineBar}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-8">
          <p className="font-meta text-[15px] leading-[1.55] text-text-main">
            Click a dot in the timeline, drag the timeline, or use the nav buttons above to browse the archives. If you are looking for a particular article and know the title or author, use our search bar <span className="text-[#1f4fbf] dark:text-[#7fb2ff]">above</span>. Or, if you have a specific date in mind, type it <span className="text-[#0f6bdc] dark:text-[#8ac7ff]">below</span> in any format.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <div className="absolute bottom-0 left-0 right-0 h-[8px] overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent origin-left" />
              </div>
              <input
                type="text"
                value={dateInput}
                onChange={(event) => {
                  setDateInput(event.target.value);
                  if (dateInputError) setDateInputError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitTypedDate();
                  }
                }}
                placeholder="Try: Oct 23 2025, 10/23/25, 2025-10-23, October 23 2025"
                className="w-full bg-transparent py-2 pl-3 pr-24 font-meta text-base font-semibold text-text-main placeholder:text-[12px] placeholder:font-medium placeholder:text-text-muted/60 outline-none md:pr-36 md:text-xl md:placeholder:text-[13px]"
              />
              <Image
                src={logoSrc}
                alt="The Polytechnic"
                width={110}
                height={28}
                className="pointer-events-none absolute right-2 top-1/2 h-auto w-[80px] -translate-y-[38%] opacity-50 md:w-[110px]"
              />
            </div>
            <button
              type="button"
              onClick={submitTypedDate}
              className="group relative flex h-10 items-center justify-center gap-1.5 rounded-full border border-rule px-4 text-text-main transition-colors"
            >
              <span
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full p-[1px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              >
                <span className="absolute left-1/2 top-1/2 aspect-square w-[300%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)]" />
              </span>
              <span className="relative z-10 whitespace-nowrap font-meta text-[10px] font-medium uppercase tracking-[0.1em]">
                Jump To Date
              </span>
            </button>
          </div>
          {dateInputError && (
            dateInputError === "pre-archive" && earliestArchiveYear ? (
              <p className="mt-2 font-meta text-[12px] tracking-[0.02em] text-[#d6001c]">
                You can access our archives pre-{earliestArchiveYear} at{" "}
                <a
                  href={FOLSOM_ARCHIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  The RPI Libraries Digital Archive
                </a>
                .
              </p>
            ) : (
              <p className="mt-2 font-meta text-[12px] uppercase tracking-[0.08em] text-[#d6001c]">
                {dateInputError}
              </p>
            )
          )}
        </div>

        {articles.length > 0 ? (
          <div className="divide-y divide-black/0">
            {articles.map((article) => (
              <ArchiveArticleRow key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-black/15 px-6 py-14 text-center dark:border-white/15">
            <p className="font-meta text-[13px] uppercase tracking-[0.14em] text-text-muted">
              No published articles for this date.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
