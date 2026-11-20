// Baseline-only diagnostic for the pre-fix checkout. Validate the fixed build
// with e2e/watch-navigation.pw.ts; Watch menu controls now use native links.
import { chromium, webkit } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const rows=[]
await mkdir('docs/validation/watch', {recursive:true})
for(const [engineName,engine,options] of [['webkit',webkit,{}],['chrome',chromium,{channel:'chrome'}]]){
 const browser=await engine.launch(options)
 for(const origin of ['http://127.0.0.1:3077','https://www.arabicwithm.com'])for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},ignoreHTTPSErrors:true})
  const page=await context.newPage(), errors=[],failed=[],responses=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('requestfailed',request=>{if(request.url().startsWith(origin))failed.push({url:request.url(),failure:request.failure()?.errorText})})
  page.on('response',response=>{if(new URL(response.url()).pathname.startsWith('/cartoons'))responses.push({url:response.url(),status:response.status()})})
  await page.route(/googletagmanager/,route=>route.abort())
  for(const entry of [width<900?'navbar-mobile':'navbar-desktop',...(width<900?['floating-mobile']:[]),'featured-play','direct-watch']){
   const row={engine:engineName,origin,width,entry}
   try{
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'})
    let control, expected='/cartoons'
    if(entry==='navbar-mobile'){
     await page.getByRole('button',{name:'Open menu',exact:true}).click()
     control=page.locator('.MuiDrawer-paper').getByRole('button',{name:'Watch',exact:true})
    }else if(entry==='navbar-desktop')control=page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Watch',exact:true})
    else if(entry==='floating-mobile'){
     await page.getByRole('button',{name:'Open navigation',exact:true}).click()
     control=page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('button',{name:'Watch',exact:true})
    }else if(entry==='featured-play'){
     control=page.locator('[data-featured-slide][aria-hidden="false"]').first().getByRole('link',{name:'Play',exact:true})
     await control.waitFor()
     expected=await control.getAttribute('href')
    }
    const started=Date.now()
    if(control){
     row.target=await control.evaluate(el=>{const box=el.getBoundingClientRect(),top=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);return {href:el.getAttribute('href'),text:el.textContent,hit:top===el||el.contains(top),interceptor:top?.outerHTML.slice(0,250)}})
     await control.click({timeout:12000})
    }else await page.goto(origin+'/cartoons',{waitUntil:'domcontentloaded'})
    await page.waitForURL(url=>url.pathname===new URL(expected,origin).pathname,{timeout:12000})
    if(expected==='/cartoons')await page.getByRole('group',{name:'Watch catalogue view'}).waitFor({timeout:12000})
    else await page.locator('main').waitFor()
    row.result='OPENED';row.elapsed=Date.now()-started
    row.url=page.url();row.cards=await page.locator('main a[href^="/cartoons/"]').count()
    row.visibleError=await page.locator('[data-awm-page-error]:visible').count()
    row.empty=await page.getByText(/No (episodes|shows) match/).count()
   }catch(error){row.result='FAILED';row.failure=error.message;row.url=page.url();await page.screenshot({path:`docs/validation/watch/before-${engineName}-${origin.startsWith('https')?'production':'local'}-${width}-${entry}.png`})}
   rows.push(row)
   await writeFile('docs/validation/watch/reproduction-before.json',JSON.stringify({rows,latestErrors:errors,failed,responses},null,2))
   console.log(JSON.stringify(row))
  }
  rows.push({engine:engineName,origin,width,runtimeErrors:errors,failed,responses})
  await context.close()
 }
 await browser.close()
}
await writeFile('docs/validation/watch/reproduction-before.json',JSON.stringify({rows},null,2))
