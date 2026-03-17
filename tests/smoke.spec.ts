import {
  expect,
  type ConsoleMessage,
  type Locator,
  type Page,
  type Request,
  type Response,
  test,
} from "@playwright/test";

const SECTION_PATHS = ["/news", "/features", "/sports", "/opinion"];
const UTILITY_PATHS = ["/staff", "/about", "/archives"];
const ARTICLE_PATH_RE = /^\/[^/]+\/\d{4}\/\d{2}\/[^/?#]+\/?$/;
const STAFF_PROFILE_PATH_RE = /^\/staff\/[^/?#]+\/?$/;
const CRITICAL_RESOURCE_TYPES = new Set([
  "document",
  "script",
  "stylesheet",
  "image",
  "font",
]);
const FRAMEWORK_ERROR_PATTERNS = [
  /Application error/i,
  /Unhandled Runtime Error/i,
  /Hydration failed/i,
  /This page could not be found/i,
  /500 - Internal Server Error/i,
];

type PageMonitor = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  responseFailures: string[];
  clear: () => void;
  detach: () => void;
};

function summarizeURL(rawURL: string) {
  try {
    const url = new URL(rawURL);
    return `${url.pathname}${url.search}`;
  } catch {
    return rawURL;
  }
}

function isCriticalRequest(page: Page, request: Request) {
  if (!CRITICAL_RESOURCE_TYPES.has(request.resourceType())) {
    return false;
  }

  const url = request.url();
  if (url.startsWith("data:")) {
    return false;
  }

  try {
    const requestURL = new URL(url);
    const pageOrigin = new URL(page.url() || "http://127.0.0.1");
    return requestURL.origin === pageOrigin.origin;
  } catch {
    return true;
  }
}

function attachPageMonitor(page: Page): PageMonitor {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const responseFailures: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  };

  const onPageError = (error: Error) => {
    pageErrors.push(error.message);
  };

  const onRequestFailed = (request: Request) => {
    const failure = request.failure();
    const errorText = failure?.errorText || "unknown request failure";

    if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(errorText)) {
      return;
    }

    if (isCriticalRequest(page, request)) {
      requestFailures.push(
        `${request.resourceType()} ${summarizeURL(request.url())} :: ${errorText}`,
      );
    }
  };

  const onResponse = (response: Response) => {
    const request = response.request();
    if (response.status() >= 400 && isCriticalRequest(page, request)) {
      responseFailures.push(
        `${response.status()} ${request.resourceType()} ${summarizeURL(request.url())}`,
      );
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return {
    consoleErrors,
    pageErrors,
    requestFailures,
    responseFailures,
    clear: () => {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      requestFailures.length = 0;
      responseFailures.length = 0;
    },
    detach: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
    },
  };
}

async function gotoPath(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible();
  await page.waitForTimeout(500);
}

async function clickAndWait(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    locator.click(),
  ]);
  await page.waitForTimeout(500);
}

async function expectPath(page: Page, matcher: RegExp) {
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toMatch(matcher);
}

async function findFirstVisibleLink(page: Page, matcher: RegExp) {
  const links = page.locator("a:visible");
  const count = await links.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = links.nth(index);
    const href = await candidate.getAttribute("href");
    if (href && matcher.test(href)) {
      return candidate;
    }
  }

  throw new Error(`No visible link matched ${matcher}`);
}

async function expectHealthyPage(page: Page, monitor: PageMonitor) {
  await expect(page.locator("body")).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  expect(bodyText.trim().length).toBeGreaterThan(0);

  for (const pattern of FRAMEWORK_ERROR_PATTERNS) {
    expect(bodyText).not.toMatch(pattern);
  }

  expect(monitor.consoleErrors, "browser console errors").toEqual([]);
  expect(monitor.pageErrors, "uncaught page errors").toEqual([]);
  expect(monitor.requestFailures, "critical request failures").toEqual([]);
  expect(monitor.responseFailures, "critical non-2xx/3xx responses").toEqual([]);

  monitor.clear();
}

async function visitAndCheck(page: Page, monitor: PageMonitor, path: string) {
  await gotoPath(page, path);
  await expectHealthyPage(page, monitor);
}

async function exerciseHomepage(page: Page, monitor: PageMonitor) {
  await gotoPath(page, "/");
  await expect(page.locator("header:visible").first()).toBeVisible();
  await expect(page.locator('img[alt="The Polytechnic"]:visible').first()).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expectHealthyPage(page, monitor);
}

async function exerciseHomepageArticle(page: Page, monitor: PageMonitor) {
  await gotoPath(page, "/");
  const articleLink = await findFirstVisibleLink(page, ARTICLE_PATH_RE);
  await clickAndWait(page, articleLink);
  await expectPath(page, ARTICLE_PATH_RE);
  await expect(page.locator("h1:visible").first()).toBeVisible();
  await expectHealthyPage(page, monitor);
}

async function exerciseStaffProfile(page: Page, monitor: PageMonitor) {
  await gotoPath(page, "/staff");
  await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();
  await expectHealthyPage(page, monitor);

  const profileLink = await findFirstVisibleLink(page, STAFF_PROFILE_PATH_RE);
  await clickAndWait(page, profileLink);
  await expectPath(page, STAFF_PROFILE_PATH_RE);
  await expect(page.locator("h1:visible").first()).toBeVisible();
  await expectHealthyPage(page, monitor);
}

async function exerciseDesktopNavigation(page: Page, monitor: PageMonitor) {
  await gotoPath(page, "/");
  await clickAndWait(page, page.locator('header nav a[href="/news"]:visible').first());
  await expectPath(page, /^\/news\/?$/);
  await expectHealthyPage(page, monitor);
}

async function exerciseMobileNavigation(page: Page, monitor: PageMonitor) {
  await gotoPath(page, "/");

  const menuButton = page.locator("header:visible button").first();
  await clickAndWait(page, menuButton);
  await expect(page.locator('a[href="/news"]:visible').first()).toBeVisible();

  await clickAndWait(page, page.locator('a[href="/news"]:visible').first());
  await expectPath(page, /^\/news\/?$/);
  await expectHealthyPage(page, monitor);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");

  await gotoPath(page, "/");
  await clickAndWait(page, menuButton);
  await clickAndWait(page, page.locator('a[href="/staff"]:visible').first());
  await expectPath(page, /^\/staff\/?$/);
  await expectHealthyPage(page, monitor);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
}

test.describe("public smoke", () => {
  test("main public pages stay healthy", async ({ page }) => {
    const monitor = attachPageMonitor(page);
    const isMobile = test.info().project.name.includes("mobile");

    try {
      await exerciseHomepage(page, monitor);

      if (isMobile) {
        await exerciseMobileNavigation(page, monitor);
      } else {
        await exerciseDesktopNavigation(page, monitor);
      }

      await exerciseHomepageArticle(page, monitor);

      for (const path of SECTION_PATHS) {
        await visitAndCheck(page, monitor, path);
      }

      for (const path of UTILITY_PATHS) {
        await visitAndCheck(page, monitor, path);
      }

      await exerciseStaffProfile(page, monitor);
    } finally {
      monitor.detach();
    }
  });
});
