import { defineConfig } from '@playwright/test'
import base from './playwright.home-startup.config'

process.env.AWM_TEST_BACKEND_PORT = '4377'
process.env.AWM_RELIABILITY_ARTIFACT_DIR = 'docs/validation/watch'
export default defineConfig({
  ...base, testMatch: '**/full-reliability.pw.ts', workers: 1,
  reporter: [['list'], ['json', { outputFile: 'docs/validation/watch/reliability-browser-results.json' }]],
})
