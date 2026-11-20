import { chromium, webkit } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const rows=[]
for(const [name,engine,options] of [['webkit',webkit,{}],['chrome',chromium,{channel:'chrome'}]]){
 const browser=await engine.launch(options)
 for(let sample=0;sample<3;sample++){
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}})
  const page=await context.newPage()
  await page.route(/googletagmanager/,route=>route.abort())
  await page.goto('http://127.0.0.1:3077/cartoons',{waitUntil:'domcontentloaded'})
  await page.getByRole('group',{name:'Watch catalogue view'}).waitFor()
  await page.getByRole('button',{name:'Show all shows',exact:true}).click()
  await page.waitForURL(/view=shows/)
  const usable=await page.evaluate(()=>performance.now())
  await page.waitForTimeout(300)
  rows.push(await page.evaluate(({name,sample,usable})=>{
   const navigation=performance.getEntriesByType('navigation')[0]
   const resources=performance.getEntriesByType('resource')
   return {name,sample,usable,ttfb:navigation.responseStart,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    jsTransfer:resources.filter(r=>/\.m?js(?:\?|$)/.test(r.name)).reduce((sum,r)=>sum+r.transferSize,0),
    jsDecoded:resources.filter(r=>/\.m?js(?:\?|$)/.test(r.name)).reduce((sum,r)=>sum+r.decodedBodySize,0)}
  },{name,sample,usable}))
  await context.close()
 }
 await browser.close()
}
await writeFile(`docs/validation/watch/performance-${process.env.AWM_WATCH_PERF_LABEL??'after'}.json`,JSON.stringify(rows,null,2))
console.log(JSON.stringify(rows,null,2))
