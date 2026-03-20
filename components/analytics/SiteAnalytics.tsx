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
import { useTheme } from "@/components/ThemeProvider";

const ACTIVE_WINDOW_MS = 30_000;
const TICK_SECONDS = 5;
const SITE_ACTIVE_SECONDS_STORAGE_KEY = "posthog_site_active_seconds";

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

function getPageArea(element: HTMLElement | null): string {
  if (!element) return "unknown";
  if (element.closest("h1")) return "headline";
  if (element.closest(".article-body") || element.closest("main")) return "body";
  if (element.closest(".section-name")) return "section_name";
  if (element.closest("footer")) return "footer";
  if (element.closest("header")) return "header";
  return "other";
}

function loadStoredActiveSeconds() {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = window.sessionStorage.getItem(SITE_ACTIVE_SECONDS_STORAGE_KEY);
  const parsed = Number.parseInt(rawValue || "0", 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

export type AnalyticsUser = {
  id: string | number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[] | null;
  slug?: string | null;
  blackTheme?: boolean | null;
  has_bio?: boolean;
  position_count?: number;
  createdAt?: string;
  updatedAt?: string;
};

type SiteAnalyticsProps = {
  user?: AnalyticsUser | null;
};

export default function SiteAnalytics({ user }: SiteAnalyticsProps) {
  const { isDarkMode } = useTheme();
  const themeRef = useRef(isDarkMode ? "dark" : "light");

  const pathname = normalizePath(usePathname() ?? "/");
  const pathRef = useRef(pathname);
  const maxScrollRef = useRef(0);
  const pageActiveSecondsRef = useRef(0);
  const siteActiveSecondsRef = useRef(0);
  const lastActivityAtRef = useRef(0);
  const sentSummaryRef = useRef(false);

  // Deep engagement refs
  const highlightCountRef = useRef(0);
  const totalCharsCopiedRef = useRef(0);
  const lastSelectionRef = useRef<string | null>(null);

  useEffect(() => {
    themeRef.current = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    if (user) {
      const currentId = posthog.get_distinct_id();
      const isNumeric = /^\d+$/.test(currentId);
      if (currentId && isNumeric && currentId !== String(user.id)) {
        posthog.reset();
      }

      posthog.identify(String(user.id), {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
        roles: user.roles,
        slug: user.slug,
        blackTheme: user.blackTheme,
        has_bio: user.has_bio,
        position_count: user.position_count,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        current_theme: isDarkMode ? "dark" : "light",
        $set_once: {
          initial_email: user.email,
        },
      });
    }
  }, [user, isDarkMode]);

  useEffect(() => {
    siteActiveSecondsRef.current = loadStoredActiveSeconds();
    lastActivityAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    pathRef.current = pathname;

    if (!shouldTrackPath(pathname)) {
      posthog.opt_out_capturing();
      return;
    }

    posthog.opt_in_capturing();
    
    // Reset page metrics for new path
    maxScrollRef.current = 0;
    pageActiveSecondsRef.current = 0;
    lastActivityAtRef.current = Date.now();
    sentSummaryRef.current = false;
    highlightCountRef.current = 0;
    totalCharsCopiedRef.current = 0;
    lastSelectionRef.current = null;

    if (pathname === "/") {
      posthog.capture("homepage_viewed", {
        ...getPageEventProperties(pathname),
        theme: themeRef.current,
      });
    }
  }, [pathname]);

  useEffect(() => {
    const updateScrollMetrics = () => {
      const currentPath = pathRef.current;
      if (!shouldTrackPath(currentPath)) return;

      const scrollPercentage = getDocumentScrollPercentage();
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercentage);
    };

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const handleCopy = () => {
      const currentPath = pathRef.current;
      if (isArticlePath(currentPath)) return; // Handled by ArticleAnalytics

      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text) return;

      const area = getPageArea(selection?.anchorNode?.parentElement || null);
      totalCharsCopiedRef.current += text.length;

      posthog.capture("page_text_copied", {
        ...getPageEventProperties(currentPath),
        text_copied: text,
        char_count: text.length,
        page_area: area,
      });
    };

    const handleSelectionChange = () => {
      const currentPath = pathRef.current;
      if (isArticlePath(currentPath)) return; // Handled by ArticleAnalytics

      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 5 && text !== lastSelectionRef.current) {
        highlightCountRef.current++;
        lastSelectionRef.current = text;
      }
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
        theme: themeRef.current,
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
        const staffSlug = destinationPath.replace(/^\/staff\//, "").replace(/\/$/, "");
        posthog.capture("staff_profile_clicked", {
          ...baseProperties,
          destination_pathname: destinationPath,
          staff_slug: staffSlug,
        });
      }
    };

    const sendSummary = () => {
      if (sentSummaryRef.current) return;
      
      const currentPath = pathRef.current;
      if (!shouldTrackPath(currentPath)) return;

      sentSummaryRef.current = true;
      posthog.capture("page_session_summary", {
        ...getPageEventProperties(currentPath),
        theme: themeRef.current,
        total_active_seconds: pageActiveSecondsRef.current,
        site_total_active_seconds: siteActiveSecondsRef.current,
        max_scroll_percentage: maxScrollRef.current,
        text_highlight_count: highlightCountRef.current,
        total_chars_copied: totalCharsCopiedRef.current,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendSummary();
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
    }, TICK_SECONDS * 1000);

    window.addEventListener("scroll", updateScrollMetrics, { passive: true });
    window.addEventListener("resize", updateScrollMetrics);
    window.addEventListener("focus", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("touchstart", markActivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("selectionchange", handleSelectionChange);

    const rafId = window.requestAnimationFrame(updateScrollMetrics);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      window.removeEventListener("scroll", updateScrollMetrics);
      window.removeEventListener("resize", updateScrollMetrics);
      window.removeEventListener("focus", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("touchstart", markActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("selectionchange", handleSelectionChange);
      
      sendSummary();
    };
  }, []);

  return null;
}
