import { defineConfig } from '@playwright/test'
process.env.AWM_TEST_BACKEND_PORT = '4359'
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/content-enrichment.pw.ts'],
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:3059',
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/fixture-server.mjs',
    url: 'http://127.0.0.1:3059',
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      AWM_TEST_CONTENT_ENRICHMENT: '1',
      AWM_TEST_PRODUCTION: '1',
      AWM_TEST_WEB_PORT: '3059',
      AWM_TEST_BACKEND_PORT: '4359',
    },
  },
  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
      },
    },
  ],
})
