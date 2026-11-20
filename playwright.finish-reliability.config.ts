import {defineConfig} from '@playwright/test'
import base from './playwright.full-reliability.config'
export default defineConfig({...base,
 reporter:[['list'],['json',{outputFile:process.env.AWM_FINISH_REPORT??'docs/validation/remaining-blockers/browser-final.json'}]],
 projects:[{name:'webkit',use:{browserName:'webkit',hasTouch:true}},...(base.projects??[]),{name:'edge',use:{browserName:'chromium',channel:'msedge'}}],
})
