import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: '**/phrase-library-pagination.pw.ts', workers: 1,
  timeout: 60000, expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:3061', ignoreHTTPSErrors: true, trace: 'retain-on-failure' },
  projects: [
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'edge', use: { browserName: 'chromium', channel: 'msedge' } },
  ],
})
