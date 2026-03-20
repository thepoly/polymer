"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import {
  getArticlePathDetails,
  getPageEventProperties,
  getPageType,
  isArticlePath,
  isStaffPath,
  normalizePath,
  shouldTrackPath,
} from "@/lib/posthog-config";

const HOME_SCROLL_THRESHOLDS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);
const PAGE_SCROLL_THRESHOLDS = [10, 25, 50, 75, 90, 100];
const PAGE_ACTIVE_TIME_THRESHOLDS = [15, 30, 60, 120, 300, 600];
const SITE_ACTIVE_TIME_THRESHOLDS = [60, 300, 600, 900, 1800];
const ACTIVE_WINDOW_MS = 30_000;
const TICK_SECONDS = 5;
const SITE_ACTIVE_SECONDS_STORAGE_KEY = "posthog_site_active_seconds";
const SITE_ACTIVE_THRESHOLDS_STORAGE_KEY = "posthog_site_active_time_thresholds";

function getDocumentScrollPercentage() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (scrollableHeight <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100)));
}

function getLinkLabel(anchor: HTMLAnchorElement) {
  const explicitLabel =
    anchor.getAttribute("aria-label") ||
    anchor.getAttribute("title") ||
    anchor.querySelector("img")?.getAttribute("alt");

  if (explicitLabel) {
    return explicitLabel.trim();
  }

  return anchor.textContent?.replace(/\s+/g, " ").trim() || anchor.href;
}

function getClickContext(anchor: HTMLAnchorElement, currentPath: string) {
  const explicitContext =
    anchor.dataset.analyticsContext ||
    (anchor.closest("[data-analytics-context]") as HTMLElement | null)?.dataset.analyticsContext;

  if (explicitContext) {
    return explicitContext;
  }

  if (anchor.closest("[data-article-recommendations]")) {
    return "article-recommendation";
  }

  if (anchor.closest("[data-frontpage-top]")) {
    return "homepage-top";
  }

  const section = (anchor.closest("[data-section]") as HTMLElement | null)?.dataset.section;
  if (section) {
    return currentPath === "/" ? `homepage-section:${section}` : `section:${section}`;
  }

  return getPageType(currentPath);
}

function loadStoredThresholds(key: string) {
  if (typeof window === "undefined") {
    return new Set<number>();
  }

  try {
    const rawValue = window.sessionStorage.getItem(key);
    if (!rawValue) return new Set<number>();

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return new Set<number>();

    return new Set(
      parsed.filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
    );
  } catch {
    return new Set<number>();
  }
}

function saveStoredThresholds(key: string, thresholds: Set<number>) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify([...thresholds].sort((a, b) => a - b)));
}

function loadStoredActiveSeconds() {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = window.sessionStorage.getItem(SITE_ACTIVE_SECONDS_STORAGE_KEY);
  const parsed = Number.parseInt(rawValue || "0", 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SiteAnalytics() {
  const pathname = normalizePath(usePathname() ?? "/");
  const pathRef = useRef(pathname);
  const maxScrollRef = useRef(0);
  const pageScrollThresholdsRef = useRef<Set<number>>(new Set());
  const pageActiveSecondsRef = useRef(0);
  const pageActiveThresholdsRef = useRef<Set<number>>(new Set());
  const siteActiveSecondsRef = useRef(0);
  const siteActiveThresholdsRef = useRef<Set<number>>(new Set());
  const lastActivityAtRef = useRef(0);

  useEffect(() => {
    siteActiveSecondsRef.current = loadStoredActiveSeconds();
    siteActiveThresholdsRef.current = loadStoredThresholds(SITE_ACTIVE_THRESHOLDS_STORAGE_KEY);
    lastActivityAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    pathRef.current = pathname;

    if (!shouldTrackPath(pathname)) {
      posthog.opt_out_capturing();
      return;
    }

    posthog.opt_in_capturing();
    maxScrollRef.current = 0;
    pageScrollThresholdsRef.current = new Set();
    pageActiveSecondsRef.current = 0;
    pageActiveThresholdsRef.current = new Set();
    lastActivityAtRef.current = Date.now();

    if (pathname === "/") {
      posthog.capture("homepage_viewed", getPageEventProperties(pathname));
    }
  }, [pathname]);

  useEffect(() => {
    const emitScrollEvents = () => {
      const currentPath = pathRef.current;
      if (!shouldTrackPath(currentPath)) return;

      const scrollPercentage = getDocumentScrollPercentage();
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercentage);

      const isHomepage = currentPath === "/";
      const thresholds = isHomepage ? HOME_SCROLL_THRESHOLDS : PAGE_SCROLL_THRESHOLDS;
      const eventName = isHomepage ? "homepage_scroll_depth_reached" : "page_scroll_depth_reached";

      for (const threshold of thresholds) {
        if (scrollPercentage < threshold || pageScrollThresholdsRef.current.has(threshold)) {
          continue;
        }

        pageScrollThresholdsRef.current.add(threshold);
        posthog.capture(eventName, {
          ...getPageEventProperties(currentPath),
          depth_percentage: threshold,
          max_scroll_percentage: scrollPercentage,
        });
      }
    };

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const currentPath = pathRef.current;
      if (!shouldTrackPath(currentPath)) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      const destinationPath = normalizePath(destination.pathname);
      const clickContext = getClickContext(anchor, currentPath);
      const linkText = getLinkLabel(anchor);
      const baseProperties = {
        ...getPageEventProperties(currentPath),
        click_context: clickContext,
        link_text: linkText,
      };

      if (destination.origin !== window.location.origin) {
        posthog.capture("outbound_link_clicked", {
          ...baseProperties,
          destination_url: destination.toString(),
        });
        return;
      }

      if (isArticlePath(destinationPath)) {
        const article = getArticlePathDetails(destinationPath);
        const articleClickProperties = {
          ...baseProperties,
          destination_pathname: destinationPath,
          destination_page_type: getPageType(destinationPath),
          article_section: article?.section,
          article_slug: article?.slug,
        };

        posthog.capture("article_clicked", articleClickProperties);

        if (clickContext === "article-recommendation") {
          posthog.capture("article_recommendation_clicked", articleClickProperties);
        }

        return;
      }

      if (isStaffPath(destinationPath) && destinationPath !== "/staff") {
        posthog.capture("staff_profile_clicked", {
          ...baseProperties,
          destination_pathname: destinationPath,
        });
      }
    };

    const intervalId = window.setInterval(() => {
      const currentPath = pathRef.current;
      if (!shouldTrackPath(currentPath) || document.hidden) {
        return;
      }

      const isActivelyInteracting = Date.now() - lastActivityAtRef.current <= ACTIVE_WINDOW_MS;
      if (!isActivelyInteracting) {
        return;
      }

      pageActiveSecondsRef.current += TICK_SECONDS;
      siteActiveSecondsRef.current += TICK_SECONDS;

      window.sessionStorage.setItem(
        SITE_ACTIVE_SECONDS_STORAGE_KEY,
        String(siteActiveSecondsRef.current),
      );

      for (const threshold of PAGE_ACTIVE_TIME_THRESHOLDS) {
        if (pageActiveSecondsRef.current < threshold || pageActiveThresholdsRef.current.has(threshold)) {
          continue;
        }

        pageActiveThresholdsRef.current.add(threshold);
        posthog.capture("page_active_time_reached", {
          ...getPageEventProperties(currentPath),
          active_seconds_reached: threshold,
          max_scroll_percentage: maxScrollRef.current,
        });
      }

      for (const threshold of SITE_ACTIVE_TIME_THRESHOLDS) {
        if (siteActiveSecondsRef.current < threshold || siteActiveThresholdsRef.current.has(threshold)) {
          continue;
        }

        siteActiveThresholdsRef.current.add(threshold);
        saveStoredThresholds(SITE_ACTIVE_THRESHOLDS_STORAGE_KEY, siteActiveThresholdsRef.current);
        posthog.capture("site_active_time_reached", {
          ...getPageEventProperties(currentPath),
          active_seconds_reached: threshold,
          total_active_seconds: siteActiveSecondsRef.current,
        });
      }
    }, TICK_SECONDS * 1000);

    window.addEventListener("scroll", emitScrollEvents, { passive: true });
    window.addEventListener("resize", emitScrollEvents);
    window.addEventListener("focus", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("touchstart", markActivity, { passive: true });
    document.addEventListener("visibilitychange", markActivity);
    document.addEventListener("click", handleDocumentClick, true);

    const rafId = window.requestAnimationFrame(emitScrollEvents);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      window.removeEventListener("scroll", emitScrollEvents);
      window.removeEventListener("resize", emitScrollEvents);
      window.removeEventListener("focus", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("touchstart", markActivity);
      document.removeEventListener("visibilitychange", markActivity);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  return null;
}
