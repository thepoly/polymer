import { defineConfig } from '@playwright/test';

// Isolated real-browser component tests: no database, credentials, or running site.
export default defineConfig({
  testDir: './tests',
  testMatch: 'opinion-ui.spec.ts',
  timeout: 30_000,
  use: { headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
});
