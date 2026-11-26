import {defineConfig} from '@playwright/test'
import base from './playwright.localisation.config'
export default defineConfig({...base,testMatch:['**/mobile-compact.pw.ts','**/arabic-only-for-you.pw.ts','**/mobile-home-comparison.pw.ts'],timeout:240000,projects:[
 {name:'chrome',use:{browserName:'chromium',channel:'chrome'}},
 {name:'webkit',use:{browserName:'webkit'}},
 {name:'firefox',use:{browserName:'firefox'}},
 {name:'edge',use:{browserName:'chromium',channel:'msedge'}},
 ...(process.env.CI?[{name:'chromium-ci',use:{browserName:'chromium' as const}}]:[]),
]})
