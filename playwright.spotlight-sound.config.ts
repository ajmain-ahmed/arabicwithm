import {defineConfig} from '@playwright/test'
import base from './playwright.spotlight-fix.config'
export default defineConfig({...base,testMatch:'**/spotlight-sound.pw.ts'})
