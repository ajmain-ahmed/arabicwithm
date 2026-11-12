import {defineConfig} from '@playwright/test'
process.env.AWM_TEST_BACKEND_PORT='4351'
export default defineConfig({
 testDir:'./e2e',testMatch:['**/member-branding.pw.ts','**/mobile-more-grid.pw.ts'],workers:1,timeout:90000,expect:{timeout:15000},
 use:{baseURL:'http://127.0.0.1:3051',ignoreHTTPSErrors:true,viewport:{width:390,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node e2e/fixture-server.mjs',url:'http://127.0.0.1:3051',reuseExistingServer:false,timeout:120000,env:{AWM_TEST_MOBILE_MORE:'1',AWM_TEST_PRODUCTION:'1',AWM_TEST_AUDIO_AUDIT:'1',AWM_TEST_WEB_PORT:'3051',AWM_TEST_BACKEND_PORT:'4351'}},
 projects:[
  {name:'chrome',use:{browserName:'chromium',launchOptions:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}}},
  {name:'firefox',use:{browserName:'firefox'}},
 ],
})
