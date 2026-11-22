import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', testMatch: process.env.AWM_CURATED_QA === '1' ? '**/home-featured-curated.pw.ts' : '**/home-startup.pw.ts', workers: 1,
  timeout: 90000, expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: process.env.AWM_STARTUP_REPORT ?? (process.env.AWM_CURATED_QA === '1' ? 'docs/validation/home-startup/curated-results.json' : 'docs/validation/home-startup/browser-results.json') }]],
  use: { baseURL: 'http://127.0.0.1:3077', ignoreHTTPSErrors: true, viewport: { width: 390, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  // Start e2e/fixture-server.mjs separately so the same production build can be measured.
  projects: [
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'edge', use: { browserName: 'chromium', channel: 'msedge' } },
  ],
})
