import {defineConfig} from '@playwright/test'
import base from './playwright.spotlight-fix.config'

export default defineConfig({...base,testMatch:'**/english-subtitle-layout.pw.ts',projects:[
 {name:'chrome',use:{browserName:'chromium',channel:'chrome'}},
 {name:'webkit',use:{browserName:'webkit'}},
 {name:'firefox',use:{browserName:'firefox'}},
 {name:'edge',use:{browserName:'chromium',channel:'msedge'}},
 ...(process.env.CI?[{name:'chromium-ci',use:{browserName:'chromium' as const}}]:[]),
]})
