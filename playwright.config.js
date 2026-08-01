/**
 * @file playwright.config.js
 * Playwright end-to-end test configuration.
 *
 * Spins up a local http-server on port 4173 and runs E2E specs
 * from the e2e/ folder in headless Chromium.
 */

/* eslint-env node */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  outputDir: 'playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    reducedMotion: 'reduce',
    // A newly activated worker reloads the page by design; that makes isolated
    // UI interactions race with navigation in a browser-test context.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx http-server . -p 4173 -a 127.0.0.1 -c-1',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
