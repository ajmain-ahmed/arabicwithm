// Start e2e/fixture-server.mjs with AWM_TEST_CHAPTER_PUBLICATION=1,
// AWM_TEST_WEB_PORT=3061 and AWM_TEST_BACKEND_PORT=4361 before running.
import { defineConfig } from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'**/admin-chapter-visibility.pw.ts',workers:1,timeout:60000,expect:{timeout:15000},use:{baseURL:'http://127.0.0.1:3061',ignoreHTTPSErrors:true,viewport:{width:390,height:1000},trace:'retain-on-failure'},projects:[{name:'webkit',use:{browserName:'webkit'}},{name:'chrome',use:{browserName:'chromium',channel:'chrome'}}]})
