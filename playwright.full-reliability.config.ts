import { defineConfig } from '@playwright/test'
process.env.AWM_TEST_BACKEND_PORT='4368'
export default defineConfig({
  testDir:'./e2e',testMatch:'**/full-reliability.pw.ts',workers:1,timeout:90000,expect:{timeout:15000},
  reporter:[['list'],['json',{outputFile:'docs/validation/full-reliability/browser-results.json'}]],
  use:{baseURL:'http://127.0.0.1:3068',ignoreHTTPSErrors:true,viewport:{width:1440,height:1000},actionTimeout:15000,navigationTimeout:30000,trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'node e2e/fixture-server.mjs',url:'http://127.0.0.1:3068',reuseExistingServer:false,timeout:240000,env:{AWM_TEST_FULL_RELIABILITY:'1',AWM_TEST_PRODUCTION:'1',AWM_TEST_STRUCTURED_BOOKS:'1',AWM_TEST_WEB_PORT:'3068',AWM_TEST_BACKEND_PORT:'4368'}},
  projects:[{name:'chrome',use:{browserName:'chromium',launchOptions:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}}},{name:'firefox',use:{browserName:'firefox'}}],
})
