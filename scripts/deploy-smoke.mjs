const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const baseURL = new URL(process.env.BASE_URL || DEFAULT_BASE_URL);
const HEALTH_PATH = process.env.HEALTH_PATH || "/api/health";
const FRAMEWORK_ERROR_PATTERNS = [
  /Application error/i,
  /Unhandled Runtime Error/i,
  /Hydration failed/i,
  /This page could not be found/i,
  /500 - Internal Server Error/i,
];

function toURL(path) {
  return new URL(path, baseURL).toString();
}

async function fetchWithTimeout(path, { expectJson = false } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(toURL(path), {
      headers: {
        Accept: expectJson ? "application/json" : "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`${path} returned ${response.status}`);
    }

    return {
      body,
      contentType: response.headers.get("content-type") || "",
      response,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assertHealthyHTML(path, body) {
  if (!body.trim()) {
    throw new Error(`${path} returned an empty body`);
  }

  for (const pattern of FRAMEWORK_ERROR_PATTERNS) {
    if (pattern.test(body)) {
      throw new Error(`${path} matched framework error pattern ${pattern}`);
    }
  }
}

function findFirstMatch(body, matcher) {
  const match = body.match(matcher);
  return match?.[1] || null;
}

async function main() {
  const health = await fetchWithTimeout(HEALTH_PATH, { expectJson: true });
  const healthJson = JSON.parse(health.body);
  if (healthJson.status !== "ok") {
    throw new Error(`health endpoint reported ${healthJson.status}`);
  }

  const homepage = await fetchWithTimeout("/");
  assertHealthyHTML("/", homepage.body);

  for (const path of ["/news", "/features", "/sports", "/opinion", "/staff", "/staff2"]) {
    const page = await fetchWithTimeout(path);
    assertHealthyHTML(path, page.body);
  }

  const articlePath = findFirstMatch(
    homepage.body,
    /href="(\/[^"/]+\/\d{4}\/\d{2}\/[^"/?#]+)"/,
  );
  if (articlePath) {
    const articlePage = await fetchWithTimeout(articlePath);
    assertHealthyHTML(articlePath, articlePage.body);
  }

  const staffIndex = await fetchWithTimeout("/staff");
  const staffProfilePath = findFirstMatch(
    staffIndex.body,
    /href="(\/staff\/[^"/?#]+)"/,
  );
  if (staffProfilePath) {
    const staffProfile = await fetchWithTimeout(staffProfilePath);
    assertHealthyHTML(staffProfilePath, staffProfile.body);
  }

  console.log(`deploy smoke passed for ${baseURL.toString()}`);
}

main().catch((error) => {
  console.error("deploy smoke failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
