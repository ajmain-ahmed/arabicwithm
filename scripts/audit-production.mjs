import { chromium, firefox } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const dir='docs/validation/full-reliability'
mkdirSync(dir,{recursive:true})
const paths=process.argv.slice(2)
for(const name of ['chrome','firefox']) {
 const browser=await (name==='chrome'?chromium:firefox).launch(name==='chrome'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})
 const file=`${dir}/production-${name}.json`
 const page=await browser.newPage({viewport:{width:390,height:1000}}), rows=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[]
 let errors=[];page.on('pageerror',e=>errors.push(e.message))
 for(const path of paths.length?paths:['/','/learn','/grammar','/explore','/explore?view=foryou','/cartoons','/books','/memory','/profile','/search','/support']) {
  const old=rows.findIndex(row=>row.path===path);if(old>=0)rows.splice(old,1)
  errors=[];const start=Date.now()
  try {const response=await page.goto('https://arabicwithm.com'+path,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(1500)
   rows.push({path,status:response.status(),url:page.url(),ms:Date.now()-start,text:(await page.locator('body').innerText()).slice(0,2400),links:await page.locator('main a[href]').evaluateAll(els=>els.slice(0,15).map(e=>({text:e.textContent,href:e.getAttribute('href')}))),errors:[...errors]})
  }catch(e){rows.push({path,error:e.message,errors:[...errors]})}
  console.log(JSON.stringify(rows.at(-1)))
 }
 writeFileSync(file,JSON.stringify(rows,null,2));await browser.close()
}
