"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { setArticleMeta } from "@/components/analytics/SiteAnalytics";
import { useTheme } from "@/components/ThemeProvider";

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

  useEffect(() => {
    setArticleMeta({
      articleId,
      title,
      section,
      slug,
      pathname,
      publishedDate,
      wordCount,
      isStaff,
    });

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

    return () => {
      setArticleMeta(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, pathname, publishedDate, section, slug, title, isStaff]);

  return null;
}
