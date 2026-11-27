import {defineConfig} from '@playwright/test'
import base from './playwright.localisation.config'
export default defineConfig({...base,webServer:{...base.webServer,command:'node e2e/fixture-server.mjs',url:'http://127.0.0.1:3065',env:{AWM_TEST_WEB_PORT:'3065',AWM_TEST_BACKEND_PORT:'4365',AWM_TEST_LEARN_CONTINUITY:'1',AWM_TEST_LOCALISATION:'1',AWM_TEST_CHAPTER_PUBLICATION:'1'}},testMatch:'**/explore-refinement.pw.ts',workers:2})
