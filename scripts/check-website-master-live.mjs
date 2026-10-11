import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {chromium} from '@playwright/test'
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3037'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
server.stdout.on('data',()=>{});server.stderr.on('data',()=>{})
const base='http://127.0.0.1:3037', result={pages:[],pageErrors:[],covers:[],searchRolloutRequired:true}
let browser
try{
 for(let i=0;i<30;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok)break}catch{}await new Promise(r=>setTimeout(r,300))}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
 const page=await browser.newPage({viewport:{width:375,height:812}})
 page.on('pageerror',e=>result.pageErrors.push(e.message))
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await page.getByRole('navigation',{name:'Quick Actions',exact:true}).getByRole('link',{name:/^Search/}).waitFor()
 const cover=await page.locator('img[src^="/api/covers/shows/"]').first().getAttribute('src')
 if(cover){const started=Date.now(),response=await page.request.get(base+cover,{timeout:10000});result.covers.push({status:response.status(),milliseconds:Date.now()-started,cacheControl:response.headers()['cache-control'],bytes:(await response.body()).length})}
 for(const path of ['/explore','/search','/memory']){
  const started=Date.now();await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
  if(path==='/search'){await page.getByLabel('Search learning content').fill('book');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('alert').filter({hasText:'temporarily unavailable'}).waitFor()}
  if(path==='/memory')await page.getByRole('dialog').waitFor()
  result.pages.push({path,milliseconds:Date.now()-started,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),tabs:await page.getByRole('tab').count()})
 }
 mkdirSync('docs/validation/website-master',{recursive:true});writeFileSync('docs/validation/website-master/live.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))
}finally{await browser?.close();server.kill()}
