const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

const ARTICLE_PATH_PATTERN = /^\/(news|features|sports|opinion)\/\d{4}\/\d{2}\/([^/?#]+)\/?$/;
const SECTION_PATH_PATTERN = /^\/(news|features|sports|opinion)\/?$/;
const STAFF_PATH_PATTERN = /^\/staff(?:\/[^/?#]+)?\/?$/;

export type PageType = "homepage" | "article" | "section" | "staff" | "about" | "contact" | "other";

export const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
  "";

export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
export const POSTHOG_UI_HOST = "https://us.posthog.com";

export function isPostHogEnabled() {
  return POSTHOG_KEY.length > 0;
}

export function normalizePath(pathname: string) {
  const strippedPath = pathname.split(/[?#]/, 1)[0] || "/";

  if (strippedPath !== "/" && strippedPath.endsWith("/")) {
    return strippedPath.slice(0, -1);
  }

  return strippedPath;
}

export function shouldTrackPath(pathname: string) {
  const normalizedPath = normalizePath(pathname);

  return !normalizedPath.startsWith("/admin");
}

export function isArticlePath(pathname: string) {
  return ARTICLE_PATH_PATTERN.test(normalizePath(pathname));
}

export function isStaffPath(pathname: string) {
  return STAFF_PATH_PATTERN.test(normalizePath(pathname));
}

export function getArticlePathDetails(pathname: string) {
  const match = normalizePath(pathname).match(ARTICLE_PATH_PATTERN);

  if (!match) {
    return null;
  }

  return {
    section: match[1],
    slug: match[2],
  };
}

export function getPageType(pathname: string): PageType {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === "/") return "homepage";
  if (isArticlePath(normalizedPath)) return "article";
  if (SECTION_PATH_PATTERN.test(normalizedPath)) return "section";
  if (isStaffPath(normalizedPath)) return "staff";
  if (normalizedPath === "/about") return "about";
  if (normalizedPath === "/contact") return "contact";

  return "other";
}

export function getPageEventProperties(pathname: string) {
  const normalizedPath = normalizePath(pathname);
  const article = getArticlePathDetails(normalizedPath);

  return {
    page_type: getPageType(normalizedPath),
    pathname: normalizedPath,
    ...(article
      ? {
          article_section: article.section,
          article_slug: article.slug,
        }
      : {}),
  };
}
