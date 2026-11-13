import {defineConfig} from '@playwright/test'
process.env.AWM_TEST_BACKEND_PORT='4357'
export default defineConfig({
 testDir:'./e2e',testMatch:['**/book-cover-upload.pw.ts'],workers:1,timeout:90000,expect:{timeout:15000},
 use:{actionTimeout:15000,baseURL:'http://127.0.0.1:3057',ignoreHTTPSErrors:true,viewport:{width:390,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node e2e/fixture-server.mjs',url:'http://127.0.0.1:3057',reuseExistingServer:false,timeout:120000,env:{AWM_TEST_BOOK_COVERS:'1',AWM_TEST_PRODUCTION:'1',AWM_TEST_AUDIO_AUDIT:'1',AWM_TEST_WEB_PORT:'3057',AWM_TEST_BACKEND_PORT:'4357'}},
 projects:[
  {name:'chrome',use:{browserName:'chromium',launchOptions:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}}},
  {name:'firefox',use:{browserName:'firefox'}},
 ],
})
