import { defineConfig } from '@playwright/test'
process.env.AWM_TEST_BACKEND_PORT = '4361'
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/audiobook-timing.pw.ts'],
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:3061',
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/fixture-server.mjs',
    url: 'http://127.0.0.1:3061',
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      AWM_TEST_AUDIO_TIMING: '1',
      AWM_TEST_PRODUCTION: '1',
      AWM_TEST_WEB_PORT: '3061',
      AWM_TEST_BACKEND_PORT: '4361',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
