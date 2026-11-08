import {defineConfig} from '@playwright/test'
import base from './playwright.spotlight-fix.config'
export default defineConfig({...base,testMatch:'**/mobile-nav-intro.pw.ts'})
