"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useTheme } from "@/components/ThemeProvider";

const READ_DEPTH_THRESHOLDS = [10, 25, 50, 75, 90, 100];
const ARTICLE_ENGAGEMENT_THRESHOLDS = [30, 60, 120, 300];
const READ_COMPLETION_THRESHOLD = 95;
const ACTIVE_WINDOW_MS = 30_000;
const TICK_SECONDS = 5;

type Props = {
  articleId: number;
  pathname: string;
  publishedDate?: string | null;
  section: string;
  slug?: string | null;
  title: string;
};

function getArticleReadDepth(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const articleTop = window.scrollY + rect.top;
  const articleHeight = Math.max(rect.height, element.scrollHeight, 1);
  const viewportBottom = window.scrollY + window.innerHeight;
  const readDepth = ((viewportBottom - articleTop) / articleHeight) * 100;

  return Math.max(0, Math.min(100, Math.round(readDepth)));
}

export default function ArticleAnalytics({
  articleId,
  pathname,
  publishedDate,
  section,
  slug,
  title,
}: Props) {
  const { isDarkMode } = useTheme();
  const themeRef = useRef(isDarkMode ? "dark" : "light");
  
  const maxReadDepthRef = useRef(0);
  const readDepthThresholdsRef = useRef<Set<number>>(new Set());
  const engagementThresholdsRef = useRef<Set<number>>(new Set());
  const engagedSecondsRef = useRef(0);
  const lastActivityAtRef = useRef(0);
  const hasCapturedCompletionRef = useRef(false);

  useEffect(() => {
    themeRef.current = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    posthog.capture("article_viewed", {
      article_id: articleId,
      article_section: section,
      article_slug: slug,
      article_title: title,
      pathname,
      published_date: publishedDate,
      theme: themeRef.current,
    });
  }, [articleId, pathname, publishedDate, section, slug, title]);

  useEffect(() => {
    maxReadDepthRef.current = 0;
    readDepthThresholdsRef.current = new Set();
    engagementThresholdsRef.current = new Set();
    engagedSecondsRef.current = 0;
    lastActivityAtRef.current = Date.now();
    hasCapturedCompletionRef.current = false;

    const articleBody = document.querySelector(".article-body");
    if (!(articleBody instanceof HTMLElement)) {
      return;
    }

    const captureBaseProperties = () => ({
      article_id: articleId,
      article_section: section,
      article_slug: slug,
      article_title: title,
      pathname,
      published_date: publishedDate,
      theme: themeRef.current,
    });

    const emitReadDepth = () => {
      const readDepth = getArticleReadDepth(articleBody);
      maxReadDepthRef.current = Math.max(maxReadDepthRef.current, readDepth);

      for (const threshold of READ_DEPTH_THRESHOLDS) {
        if (readDepth < threshold || readDepthThresholdsRef.current.has(threshold)) {
          continue;
        }

        readDepthThresholdsRef.current.add(threshold);
        posthog.capture("article_read_depth_reached", {
          ...captureBaseProperties(),
          depth_percentage: threshold,
          max_read_depth_percentage: readDepth,
        });
      }

      if (!hasCapturedCompletionRef.current && readDepth >= READ_COMPLETION_THRESHOLD) {
        hasCapturedCompletionRef.current = true;
        posthog.capture("article_read_completed", {
          ...captureBaseProperties(),
          completion_depth_percentage: readDepth,
          engaged_seconds: engagedSecondsRef.current,
        });
      }
    };

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const intervalId = window.setInterval(() => {
      if (document.hidden || Date.now() - lastActivityAtRef.current > ACTIVE_WINDOW_MS) {
        return;
      }

      engagedSecondsRef.current += TICK_SECONDS;

      for (const threshold of ARTICLE_ENGAGEMENT_THRESHOLDS) {
        if (engagedSecondsRef.current < threshold || engagementThresholdsRef.current.has(threshold)) {
          continue;
        }

        engagementThresholdsRef.current.add(threshold);
        posthog.capture("article_engaged", {
          ...captureBaseProperties(),
          engaged_seconds_reached: threshold,
          max_read_depth_percentage: maxReadDepthRef.current,
        });
      }
    }, TICK_SECONDS * 1000);

    window.addEventListener("scroll", emitReadDepth, { passive: true });
    window.addEventListener("resize", emitReadDepth);
    window.addEventListener("focus", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("touchstart", markActivity, { passive: true });
    document.addEventListener("visibilitychange", markActivity);

    const rafId = window.requestAnimationFrame(emitReadDepth);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      window.removeEventListener("scroll", emitReadDepth);
      window.removeEventListener("resize", emitReadDepth);
      window.removeEventListener("focus", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("touchstart", markActivity);
      document.removeEventListener("visibilitychange", markActivity);
    };
  }, [articleId, pathname, publishedDate, section, slug, title]);

  return null;
}
