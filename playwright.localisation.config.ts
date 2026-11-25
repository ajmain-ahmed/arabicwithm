import {defineConfig} from '@playwright/test'
import base from './playwright.config'
export default defineConfig({...base,testMatch:['**/localisation.pw.ts','**/metadata-bulk.pw.ts'],timeout:180000,webServer:{...base.webServer,command:'node e2e/fixture-server.mjs',url:'http://127.0.0.1:3065',env:{AWM_TEST_WEB_PORT:'3065',AWM_TEST_BACKEND_PORT:'4365',AWM_TEST_LEARN_CONTINUITY:'1',AWM_TEST_LOCALISATION:'1'}},use:{...base.use,actionTimeout:15000,baseURL:'http://127.0.0.1:3065'},projects:[
 {name:'chrome',use:{browserName:'chromium',channel:'chrome'}},
 {name:'webkit',use:{browserName:'webkit'}},
 {name:'firefox',use:{browserName:'firefox'}},
 {name:'edge',use:{browserName:'chromium',channel:'msedge'}},
 ...(process.env.CI?[{name:'chromium-ci',use:{browserName:'chromium' as const}}]:[]),
]})
