import {defineConfig} from '@playwright/test'
import base from './playwright.localisation.config'
export default defineConfig({...base,testMatch:'**/localisation-audit.pw.ts',projects:[{name:'chrome',use:{browserName:'chromium',channel:'chrome'}}]})
