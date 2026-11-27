import {defineConfig} from '@playwright/test'
import base from './playwright.mobile-compact.config'
export default defineConfig({...base,testMatch:['**/learn-demand.pw.ts','**/learn-workload.pw.ts']})
