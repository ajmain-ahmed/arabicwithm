import { defineConfig } from '@playwright/test'
import base from './playwright.full-reliability.config'
export default defineConfig({...base,
 reporter:[['list'],['json',{outputFile:process.env.AWM_SAFARI_CROSS==='1'?'docs/validation/safari-admin/browser-cross.json':'docs/validation/safari-admin/browser-webkit.json'}]],
 projects:process.env.AWM_SAFARI_CROSS==='1'?[...(base.projects??[]),{name:'edge',use:{browserName:'chromium',channel:'msedge'}}]:[{name:'webkit',use:{browserName:'webkit',hasTouch:true}}],
})
