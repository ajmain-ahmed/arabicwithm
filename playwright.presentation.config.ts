import {defineConfig} from '@playwright/test'
import base from './playwright.mobile-compact.config'
export default defineConfig({...base,workers:process.env.CI?1:2,testMatch:['**/presentation-restoration.pw.ts','**/learn-matching.pw.ts']})
