import {defineConfig} from '@playwright/test'
process.env.AWM_TEST_BACKEND_PORT='4347'
export default defineConfig({
 testDir:'./e2e',testMatch:['**/spotlight-fix.pw.ts','**/home-spotlight-selection.pw.ts'],workers:1,timeout:90000,expect:{timeout:15000},
 use:{baseURL:'http://127.0.0.1:3047',ignoreHTTPSErrors:true,viewport:{width:390,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node e2e/fixture-server.mjs',url:'http://127.0.0.1:3047',reuseExistingServer:true,timeout:120000,env:{AWM_TEST_PRODUCTION:'1',AWM_TEST_AUDIO_AUDIT:'1',AWM_TEST_WEB_PORT:'3047',AWM_TEST_BACKEND_PORT:'4347'}},
 projects:[
  {name:'chrome',use:{browserName:'chromium',launchOptions:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}}},
  {name:'firefox',use:{browserName:'firefox'}},
 ],
})
