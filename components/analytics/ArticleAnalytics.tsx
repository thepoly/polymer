"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useTheme } from "@/components/ThemeProvider";

const READ_COMPLETION_THRESHOLD = 85;
const ACTIVE_WINDOW_MS = 30_000;
const TICK_SECONDS = 5;

type Props = {
  articleId: number;
  pathname: string;
  publishedDate?: string | null;
  section: string;
  slug?: string | null;
  title: string;
  wordCount?: number;
  isStaff?: boolean;
};

function getArticleReadDepth(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const articleTop = window.scrollY + rect.top;
  const articleHeight = Math.max(rect.height, element.scrollHeight, 1);
  const viewportBottom = window.scrollY + window.innerHeight;
  const readDepth = ((viewportBottom - articleTop) / articleHeight) * 100;

  return Math.max(0, Math.min(100, Math.round(readDepth)));
}

function getCopiableArea(element: HTMLElement | null): string {
  if (!element) return "unknown";
  if (element.closest(".article-body")) return "body";
  if (element.closest(".article-header")) return "header";
  if (element.closest(".article-subdeck")) return "subdeck";
  if (element.closest(".article-byline")) return "byline";
  if (element.closest(".article-caption")) return "caption";
  if (element.closest(".article-staff-bio")) return "staff_bio";
  if (element.closest(".section-name")) return "section_name";
  return "other";
}

export default function ArticleAnalytics({
  articleId,
  pathname,
  publishedDate,
  section,
  slug,
  title,
  wordCount = 0,
  isStaff = false,
}: Props) {
  const { isDarkMode } = useTheme();
  
  const startTimeRef = useRef(Date.now());
  const maxReadDepthRef = useRef(0);
  const engagedSecondsRef = useRef(0);
  const lastActivityAtRef = useRef(Date.now());
  const hasCapturedCompletionRef = useRef(false);
  const sentSummaryRef = useRef(false);
  const linkClicksRef = useRef({ internal: 0, external: 0 });
  
  // Theme tracking
  const themeStartTimeRef = useRef(Date.now());
  const themeSecondsRef = useRef({ light: 0, dark: 0 });
  const currentThemeRef = useRef(isDarkMode ? "dark" : "light");

  // Selection & Copy tracking
  const highlightCountRef = useRef(0);
  const totalCharsCopiedRef = useRef(0);
  const lastSelectionRef = useRef<string | null>(null);

  // Tracking the exit
  const exitMethodRef = useRef<"internal_link" | "external_link" | "tab_hidden" | "unmount">("unmount");
  const exitDestinationRef = useRef<string | null>(null);

  const propsRef = useRef({ articleId, pathname, publishedDate, section, slug, title, wordCount, isStaff });
  useEffect(() => {
    propsRef.current = { articleId, pathname, publishedDate, section, slug, title, wordCount, isStaff };
  }, [articleId, pathname, publishedDate, section, slug, title, wordCount, isStaff]);

  useEffect(() => {
    const newTheme = isDarkMode ? "dark" : "light";
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
    posthog.capture("article_viewed", {
      article_id: articleId,
      article_section: section,
      article_slug: slug,
      article_title: title,
      pathname,
      published_date: publishedDate,
      theme: isDarkMode ? "dark" : "light",
      is_staff_viewer: isStaff,
    });
  }, [articleId, pathname, publishedDate, section, slug, title, isStaff]);

  useEffect(() => {
    maxReadDepthRef.current = 0;
    engagedSecondsRef.current = 0;
    lastActivityAtRef.current = Date.now();
    startTimeRef.current = Date.now();
    themeStartTimeRef.current = Date.now();
    themeSecondsRef.current = { light: 0, dark: 0 };
    hasCapturedCompletionRef.current = false;
    sentSummaryRef.current = false;
    linkClicksRef.current = { internal: 0, external: 0 };
    highlightCountRef.current = 0;
    totalCharsCopiedRef.current = 0;
    exitMethodRef.current = "unmount";
    exitDestinationRef.current = null;

    const articleBody = document.querySelector(".article-body");
    
    const getSummaryProperties = () => {
      const now = Date.now();
      const totalSecondsOnPage = Math.round((now - startTimeRef.current) / 1000);
      const currentScroll = articleBody instanceof HTMLElement ? getArticleReadDepth(articleBody) : 0;
      
      const finalThemeElapsed = Math.round((now - themeStartTimeRef.current) / 1000);
      const finalThemeSeconds = { ...themeSecondsRef.current };
      if (currentThemeRef.current === "dark") finalThemeSeconds.dark += finalThemeElapsed;
      else finalThemeSeconds.light += finalThemeElapsed;

      const wpm = engagedSecondsRef.current > 0 
        ? Math.round((propsRef.current.wordCount / (engagedSecondsRef.current / 60))) 
        : 0;

      return {
        article_id: propsRef.current.articleId,
        article_section: propsRef.current.section,
        article_slug: propsRef.current.slug,
        article_title: propsRef.current.title,
        pathname: propsRef.current.pathname,
        word_count: propsRef.current.wordCount,
        is_staff_viewer: propsRef.current.isStaff,
        
        // Performance
        words_per_minute: wpm,
        max_scroll_percentage: maxReadDepthRef.current, 
        exit_scroll_percentage: currentScroll,
        total_engaged_seconds: engagedSecondsRef.current,
        total_seconds_on_page: totalSecondsOnPage,

        // Theme & Engagement
        seconds_spent_in_light_mode: finalThemeSeconds.light,
        seconds_spent_in_dark_mode: finalThemeSeconds.dark,
        text_highlight_count: highlightCountRef.current,
        total_chars_copied: totalCharsCopiedRef.current,
        
        // Exit context
        exit_method: exitMethodRef.current,
        exit_destination: exitDestinationRef.current,
        read_completed: hasCapturedCompletionRef.current,
        engagement_ratio: totalSecondsOnPage > 0 
          ? Number((engagedSecondsRef.current / totalSecondsOnPage).toFixed(2)) 
          : 0,
      };
    };

    const sendSummary = () => {
      if (sentSummaryRef.current) return;
      sentSummaryRef.current = true;
      posthog.capture("article_session_summary", getSummaryProperties());
    };

    const handleCopy = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text) return;

      const area = getCopiableArea(selection?.anchorNode?.parentElement || null);
      totalCharsCopiedRef.current += text.length;

      posthog.capture("article_text_copied", {
        article_id: propsRef.current.articleId,
        article_title: propsRef.current.title,
        text_copied: text,
        char_count: text.length,
        page_area: area,
        pathname: propsRef.current.pathname,
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

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        let url: URL;
        try { url = new URL(anchor.href, window.location.origin); } catch { return; }
        const isExternal = url.hostname !== window.location.hostname;
        exitMethodRef.current = isExternal ? "external_link" : "internal_link";
        exitDestinationRef.current = isExternal ? url.href : url.pathname + url.search;
        if (articleBody?.contains(anchor)) {
          if (isExternal) linkClicksRef.current.external++;
          else linkClicksRef.current.internal++;
        }
      }
    };

    const updateMetrics = () => {
      if (!(articleBody instanceof HTMLElement)) return;
      const readDepth = getArticleReadDepth(articleBody);
      maxReadDepthRef.current = Math.max(maxReadDepthRef.current, readDepth);
      if (!hasCapturedCompletionRef.current && readDepth >= READ_COMPLETION_THRESHOLD) {
        hasCapturedCompletionRef.current = true;
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.hidden || Date.now() - lastActivityAtRef.current > ACTIVE_WINDOW_MS) return;
      engagedSecondsRef.current += TICK_SECONDS;
      updateMetrics();
    }, TICK_SECONDS * 1000);

    window.addEventListener("scroll", updateMetrics, { passive: true });
    window.addEventListener("resize", updateMetrics);
    window.addEventListener("focus", () => lastActivityAtRef.current = Date.now());
    window.addEventListener("keydown", () => lastActivityAtRef.current = Date.now());
    window.addEventListener("mousemove", () => lastActivityAtRef.current = Date.now(), { passive: true });
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && sendSummary());
    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("scroll", updateMetrics);
      window.removeEventListener("resize", updateMetrics);
      document.removeEventListener("visibilitychange", sendSummary);
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("selectionchange", handleSelectionChange);
      sendSummary();
    };
  }, [articleId, pathname, publishedDate, section, slug, title]);

  return null;
}
