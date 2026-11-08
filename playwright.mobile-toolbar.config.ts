import {defineConfig} from '@playwright/test'
import base from './playwright.spotlight-fix.config'
export default defineConfig({...base,testMatch:['**/spotlight-fix.pw.ts','**/english-subtitle-layout.pw.ts'],grep:/mobile one-line|guest language|desktop Explore|English Arabic-first/})
