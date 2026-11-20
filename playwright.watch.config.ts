import { defineConfig } from '@playwright/test'
import base from './playwright.home-startup.config'
export default defineConfig({
  ...base, testMatch: '**/watch-navigation.pw.ts', workers: 2,
  reporter: [['list'], ['json', { outputFile: 'docs/validation/watch/browser-results.json' }]],
})
