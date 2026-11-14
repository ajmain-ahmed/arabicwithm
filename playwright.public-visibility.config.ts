import { defineConfig } from '@playwright/test'
process.env.AWM_TEST_BACKEND_PORT = '4365'
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/public-visibility.pw.ts'],
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:3065',
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/fixture-server.mjs',
    url: 'http://127.0.0.1:3065',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      AWM_TEST_PRODUCTION: '1',
      AWM_TEST_PUBLIC_VISIBILITY: '1',
      AWM_TEST_AUDIO_AUDIT: '1',
      AWM_TEST_WEB_PORT: '3065',
      AWM_TEST_BACKEND_PORT: '4365',
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
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
})
