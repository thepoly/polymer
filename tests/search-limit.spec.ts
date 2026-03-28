import { expect, test } from "@playwright/test";
import { MAX_SEARCH_QUERY_LENGTH, sanitizeSearchQuery } from "@/utils/search";

test.describe("public search query bounds", () => {
  test("sanitizes and truncates over-limit queries", () => {
    const rawQuery = `  alpha\u0000beta\t${"x".repeat(MAX_SEARCH_QUERY_LENGTH + 20)}  `;
    const expected = `alpha beta ${"x".repeat(MAX_SEARCH_QUERY_LENGTH - "alpha beta ".length)}`;

    expect(sanitizeSearchQuery(rawQuery)).toBe(expected);
    expect(sanitizeSearchQuery(rawQuery)).toHaveLength(MAX_SEARCH_QUERY_LENGTH);
  });

  test("renders the sanitized value from an over-limit query param", async ({ page }) => {
    const rawQuery = `  alpha\u0000beta\t${"x".repeat(MAX_SEARCH_QUERY_LENGTH + 20)}  `;
    const expected = sanitizeSearchQuery(rawQuery);

    await page.route("**/api/search**", async (route) => {
      const requestURL = new URL(route.request().url());

      if (requestURL.pathname.endsWith("/archive-date")) {
        await route.fulfill({
          json: { subtitle: "" },
        });
        return;
      }

      if (requestURL.pathname.endsWith("/spellcheck")) {
        await route.fulfill({
          json: { suggestion: null },
        });
        return;
      }

      await route.fulfill({
        json: {
          articles: [],
          page: 1,
          pageSize: 20,
          query: requestURL.searchParams.get("q") ?? "",
          totalPages: 0,
          totalResults: 0,
        },
      });
    });

    await page.goto(`/search?q=${encodeURIComponent(rawQuery)}`);

    const searchInput = page.locator('main input[type="text"]');

    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue(expected);
  });
});
