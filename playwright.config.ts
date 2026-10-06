import { defineConfig } from '@playwright/test'

const baseURL = `http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT ?? 3000}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    hasTouch: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    },
  },
  webServer: {
    command: 'node e2e/fixture-server.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
