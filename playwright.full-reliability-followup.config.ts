import { defineConfig } from '@playwright/test'
import base from './playwright.full-reliability.config'
export default defineConfig({ ...base,
  grep:/Explore and For You|all protected route/,
  reporter:[['list'],['json',{outputFile:process.env.AWM_AUDIT_REPORT ?? 'docs/validation/full-reliability/browser-followup-results.json'}]],
})
