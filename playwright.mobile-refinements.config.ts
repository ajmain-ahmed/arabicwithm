import {defineConfig} from '@playwright/test'
import base from './playwright.spotlight-fix.config'
export default defineConfig({...base,testMatch:['**/mobile-refinements.pw.ts','**/spotlight-fix.pw.ts'],grep:/mobile one-line|guest language|desktop Explore|watch layout|tablet boundaries/})
