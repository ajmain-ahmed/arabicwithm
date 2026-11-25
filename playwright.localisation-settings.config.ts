import {defineConfig} from '@playwright/test'
import base from './playwright.localisation.config'
export default defineConfig({...base,testMatch:'**/localisation-settings.pw.ts'})
