import {webkit,expect} from '@playwright/test'
import {writeFileSync,mkdirSync} from 'node:fs'
const dir='docs/validation/safari-admin';mkdirSync(dir,{recursive:true})
const browser=await webkit.launch(),results=[]
for(const width of process.argv.length>2?process.argv.slice(2).map(Number):[320,375,390,414,430,768,1024,1440]){
 const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<1100}),errors=[],assetFailures=[]
 let stage='start'
 page.on('requestfailed',request=>{if(request.url().includes('/_next/static/'))assetFailures.push({stage,url:request.url(),error:request.failure()})})
 page.on('response',response=>{if(response.status()>=400&&response.url().includes('/_next/static/'))assetFailures.push({stage,url:response.url(),status:response.status()})})
 page.on('pageerror',e=>errors.push({stage,message:e.message,stack:e.stack}));page.setDefaultTimeout(15000)
 try{
  for(const path of ['/','/books','/cartoons','/learn','/grammar/context','/explore','/explore?view=foryou']){
   stage=path
   await page.goto('https://arabicwithm.com'+path,{waitUntil:'domcontentloaded',timeout:30000})
   await expect(page.locator('main')).toBeVisible();await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
  }
  stage='/cartoons/avt/avt-2';await page.goto('https://arabicwithm.com/cartoons/avt/avt-2',{waitUntil:'domcontentloaded'})
  await page.getByRole(width<900?'tab':'button',{name:'Settings',exact:true}).filter({visible:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape')
  await page.goBack({waitUntil:'domcontentloaded'});await page.goForward({waitUntil:'domcontentloaded'});await page.reload({waitUntil:'domcontentloaded'})
  results.push({width,status:errors.length?'BLOCKED':'PASS',errors,assetFailures})
 }catch(e){results.push({width,stage,status:'BLOCKED',error:e.message,errors,assetFailures})}
 console.log(JSON.stringify(results.at(-1)));writeFileSync(dir+(process.argv.length>2?'/production-webkit-recheck.json':'/production-webkit.json'),JSON.stringify(results,null,2));await page.close()
}
await browser.close()
