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
const READ_COMPLETION_THRESHOLD = 85;
const SITE_ACTIVE_SECONDS_STORAGE_KEY = "posthog_site_active_seconds";

function getDocumentScrollPercentage() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (scrollableHeight <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100)));
}

function getArticleReadDepth(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const articleTop = window.scrollY + rect.top;
  const articleHeight = Math.max(rect.height, element.scrollHeight, 1);
  const viewportBottom = window.scrollY + window.innerHeight;
  const readDepth = ((viewportBottom - articleTop) / articleHeight) * 100;

  return Math.max(0, Math.min(100, Math.round(readDepth)));
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

function getCopyArea(element: HTMLElement | null): string {
  if (!element) return "unknown";
  if (element.closest(".article-body")) return "body";
  if (element.closest(".article-header")) return "header";
  if (element.closest(".article-subdeck")) return "subdeck";
  if (element.closest(".article-byline")) return "byline";
  if (element.closest(".article-caption")) return "caption";
  if (element.closest(".article-staff-bio")) return "staff_bio";
  if (element.closest(".section-name")) return "section_name";
  if (element.closest("h1")) return "headline";
  if (element.closest("main")) return "body";
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

// Module-level article metadata — set by ArticlePageAnalytics, read by SiteAnalytics
export type ArticleMeta = {
  articleId: number;
  title: string;
  section: string;
  slug?: string | null;
  pathname: string;
  publishedDate?: string | null;
  wordCount: number;
  isStaff: boolean;
};

let currentArticleMeta: ArticleMeta | null = null;

export function setArticleMeta(meta: ArticleMeta | null) {
  currentArticleMeta = meta;
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

export const STAFF_IDENTITY_KEY = "posthog_staff_identity";

function saveStaffIdentity(user: AnalyticsUser) {
  try {
    localStorage.setItem(STAFF_IDENTITY_KEY, JSON.stringify(user));
  } catch {}
}

function loadStaffIdentity(): AnalyticsUser | null {
  try {
    const raw = localStorage.getItem(STAFF_IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStaffIdentity() {
  try {
    localStorage.removeItem(STAFF_IDENTITY_KEY);
    posthog.reset();
  } catch {}
}

type SiteAnalyticsProps = {
  user?: AnalyticsUser | null;
};

export default function SiteAnalytics({ user }: SiteAnalyticsProps) {
  const { isDarkMode } = useTheme();
  const themeRef = useRef(isDarkMode ? "dark" : "light");

  const pathname = normalizePath(usePathname() ?? "/");
  const pathRef = useRef(pathname);
  const maxScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const pageActiveSecondsRef = useRef(0);
  const siteActiveSecondsRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastActivityAtRef = useRef(0);
  const sentSummaryRef = useRef(false);

  // Exit tracking
  const exitMethodRef = useRef<"internal_link" | "external_link" | "tab_hidden" | "browser_closed" | "unmount">("unmount");
  const exitDestinationRef = useRef<string | null>(null);

  // Deep engagement
  const highlightCountRef = useRef(0);
  const totalCharsCopiedRef = useRef(0);
  const lastSelectionRef = useRef<string | null>(null);

  // Article-specific: read depth from article body element
  const maxReadDepthRef = useRef(0);
  const currentReadDepthRef = useRef(0);
  const hasCapturedCompletionRef = useRef(false);

  // Theme time tracking (for article pages)
  const themeStartTimeRef = useRef(0);
  const themeSecondsRef = useRef({ light: 0, dark: 0 });
  const currentThemeRef = useRef(isDarkMode ? "dark" : "light");

  useEffect(() => {
    const newTheme = isDarkMode ? "dark" : "light";
    themeRef.current = newTheme;
    if (newTheme !== currentThemeRef.current) {
      const now = Date.now();
      const elapsed = Math.round((now - themeStartTimeRef.current) / 1000);
      if (currentThemeRef.current === "dark") themeSecondsRef.current.dark += elapsed;
      else themeSecondsRef.current.light += elapsed;
      currentThemeRef.current = newTheme;
      themeStartTimeRef.current = now;
    }
  }, [isDarkMode]);

  useEffect(() => {
    const identifyUser = (u: AnalyticsUser) => {
      const currentId = posthog.get_distinct_id();
      const isNumeric = /^\d+$/.test(currentId);
      if (currentId && isNumeric && currentId !== String(u.id)) {
        posthog.reset();
      }

      posthog.identify(String(u.id), {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || undefined,
        roles: u.roles,
        slug: u.slug,
        blackTheme: u.blackTheme,
        has_bio: u.has_bio,
        position_count: u.position_count,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        current_theme: isDarkMode ? "dark" : "light",
        $set_once: {
          initial_email: u.email,
        },
      });
    };

    if (user) {
      identifyUser(user);
      saveStaffIdentity(user);
    } else {
      const cached = loadStaffIdentity();
      if (cached) {
        identifyUser(cached);
      }
    }
  }, [user, isDarkMode]);

  // Detect Payload logout by intercepting fetch to the logout endpoint
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].toString() : (args[0] as Request)?.url;
      if (url && /\/api\/users\/logout\b/.test(url)) {
        clearStaffIdentity();
      }
      return originalFetch.apply(this, args);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

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

    // Reset all page metrics
    maxScrollRef.current = 0;
    currentScrollRef.current = 0;
    pageActiveSecondsRef.current = 0;
    startTimeRef.current = Date.now();
    lastActivityAtRef.current = Date.now();
    sentSummaryRef.current = false;
    exitMethodRef.current = "unmount";
    exitDestinationRef.current = null;
    highlightCountRef.current = 0;
    totalCharsCopiedRef.current = 0;
    lastSelectionRef.current = null;
    maxReadDepthRef.current = 0;
    currentReadDepthRef.current = 0;
    hasCapturedCompletionRef.current = false;
    themeStartTimeRef.current = Date.now();
    themeSecondsRef.current = { light: 0, dark: 0 };
  }, [pathname]);

  useEffect(() => {
    const updateScrollMetrics = () => {
      const currentPath = pathRef.current;
      if (!shouldTrackPath(currentPath)) return;

      const scrollPercentage = getDocumentScrollPercentage();
      currentScrollRef.current = scrollPercentage;
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercentage);

      // Article-specific read depth
      if (isArticlePath(currentPath)) {
        const articleBody = document.querySelector(".article-body");
        if (articleBody instanceof HTMLElement) {
          const readDepth = getArticleReadDepth(articleBody);
          currentReadDepthRef.current = readDepth;
          maxReadDepthRef.current = Math.max(maxReadDepthRef.current, readDepth);
          if (!hasCapturedCompletionRef.current && readDepth >= READ_COMPLETION_THRESHOLD) {
            hasCapturedCompletionRef.current = true;
          }
        }
      }
    };

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const handleCopy = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text) return;

      const currentPath = pathRef.current;
      const area = getCopyArea(selection?.anchorNode?.parentElement || null);
      totalCharsCopiedRef.current += text.length;

      posthog.capture("text_copied", {
        ...getPageEventProperties(currentPath),
        text_copied: text,
        char_count: text.length,
        page_area: area,
        ...(currentArticleMeta ? {
          article_id: currentArticleMeta.articleId,
          article_title: currentArticleMeta.title,
        } : {}),
      });
    };

    const handleSelectionChange = () => {
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

      const isExternal = destination.origin !== window.location.origin;
      exitMethodRef.current = isExternal ? "external_link" : "internal_link";
      exitDestinationRef.current = isExternal ? destination.toString() : destinationPath;

      if (isExternal) {
        posthog.capture("outbound_link_clicked", {
          ...baseProperties,
          destination_url: destination.toString(),
        });
        return;
      }

      if (isArticlePath(destinationPath)) {
        const article = getArticlePathDetails(destinationPath);
        posthog.capture("article_clicked", {
          ...baseProperties,
          destination_pathname: destinationPath,
          destination_page_type: getPageType(destinationPath),
          article_section: article?.section,
          article_slug: article?.slug,
        });
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
      const now = Date.now();
      const totalSecondsOnPage = Math.max(0, Math.round((now - startTimeRef.current) / 1000));

      // Finalize theme seconds
      const finalThemeElapsed = Math.max(0, Math.round((now - themeStartTimeRef.current) / 1000));
      const finalThemeSeconds = { ...themeSecondsRef.current };
      if (currentThemeRef.current === "dark") finalThemeSeconds.dark += finalThemeElapsed;
      else finalThemeSeconds.light += finalThemeElapsed;

      const meta = currentArticleMeta;
      const isArticle = isArticlePath(currentPath) && meta;
      const wpm = isArticle && meta.wordCount > 0 && pageActiveSecondsRef.current > 0
        ? Math.round(meta.wordCount / (pageActiveSecondsRef.current / 60))
        : undefined;

      posthog.capture("page_session_summary", {
        ...getPageEventProperties(currentPath),
        theme: themeRef.current,
        total_active_seconds: pageActiveSecondsRef.current,
        total_seconds_on_page: totalSecondsOnPage,
        site_total_active_seconds: siteActiveSecondsRef.current,
        max_scroll_percentage: maxScrollRef.current,
        exit_scroll_percentage: currentScrollRef.current,
        exit_method: exitMethodRef.current,
        exit_destination: exitDestinationRef.current,
        engagement_ratio: totalSecondsOnPage > 0
          ? Number((pageActiveSecondsRef.current / totalSecondsOnPage).toFixed(2))
          : 0,
        text_highlight_count: highlightCountRef.current,
        total_chars_copied: totalCharsCopiedRef.current,
        seconds_spent_in_light_mode: finalThemeSeconds.light,
        seconds_spent_in_dark_mode: finalThemeSeconds.dark,

        // Article-specific fields (null/absent on non-article pages)
        ...(isArticle ? {
          article_id: meta.articleId,
          article_title: meta.title,
          article_slug: meta.slug,
          word_count: meta.wordCount,
          is_staff_viewer: meta.isStaff,
          words_per_minute: wpm,
          max_read_depth: maxReadDepthRef.current,
          exit_read_depth: currentReadDepthRef.current,
          read_completed: hasCapturedCompletionRef.current,
        } : {}),
      });
    };

    const handleBeforeUnload = () => {
      exitMethodRef.current = "browser_closed";
      sendSummary();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (exitMethodRef.current === "unmount") exitMethodRef.current = "tab_hidden";
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

      // Update article read depth on tick too
      if (isArticlePath(pathRef.current)) {
        const articleBody = document.querySelector(".article-body");
        if (articleBody instanceof HTMLElement) {
          const readDepth = getArticleReadDepth(articleBody);
          currentReadDepthRef.current = readDepth;
          maxReadDepthRef.current = Math.max(maxReadDepthRef.current, readDepth);
          if (!hasCapturedCompletionRef.current && readDepth >= READ_COMPLETION_THRESHOLD) {
            hasCapturedCompletionRef.current = true;
          }
        }
      }
    }, TICK_SECONDS * 1000);

    window.addEventListener("scroll", updateScrollMetrics, { passive: true });
    window.addEventListener("resize", updateScrollMetrics);
    window.addEventListener("focus", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("touchstart", markActivity, { passive: true });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

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
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);

      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("selectionchange", handleSelectionChange);

      sendSummary();
    };
  }, []);

  return null;
}
