import {defineConfig} from '@playwright/test'
import base from './playwright.spotlight-fix.config'
export default defineConfig({...base,testMatch:['**/reliability.pw.ts','**/admin-english-group.pw.ts'],timeout:180000})
