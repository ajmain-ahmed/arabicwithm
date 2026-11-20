import {defineConfig} from '@playwright/test'
import base from './playwright.admin-audit.config'
const server=Array.isArray(base.webServer)?base.webServer[0]:base.webServer
export default defineConfig({...base,testMatch:['**/safari-admin.pw.ts','**/admin-audit.pw.ts','**/book-cover-upload.pw.ts'],grep:process.env.AWM_SAFARI_GREP?new RegExp(process.env.AWM_SAFARI_GREP):/canonical Admin|Admin Books existing|Admin grammar diagnostics|route lifecycle|create with png.*390px/,
 webServer:{...server,command:'node e2e/fixture-server.mjs',env:{...server?.env,AWM_TEST_CONTENT_ENRICHMENT:'1'}},
 reporter:[['list'],['json',{outputFile:process.env.AWM_SAFARI_REPORT??'docs/validation/safari-admin/browser-admin.json'}]],
 projects:[{name:'webkit',use:{browserName:'webkit'}},...(base.projects??[]),{name:'edge',use:{browserName:'chromium',channel:'msedge'}}],
})
