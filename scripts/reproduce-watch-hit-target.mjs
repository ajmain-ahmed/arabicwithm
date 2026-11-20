// Baseline-only: captures the desktop Watch target before phone hydration.
// The fixed phone header has a CSS-selected menu instead of that overlaid row.
import { webkit } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const browser=await webkit.launch(),rows=[]
for(const origin of ['http://127.0.0.1:3077','https://www.arabicwithm.com'])for(const width of [320,375,390,414,430]){
 const context=await browser.newContext({javaScriptEnabled:false,ignoreHTTPSErrors:true,viewport:{width,height:844}})
 const page=await context.newPage()
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'})
 const watch=page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Watch',exact:true})
 const box=await watch.boundingBox()
 const hit=await watch.evaluate(element=>{const b=element.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {receivesTap:top===element||element.contains(top),interceptor:top?.closest('button,a')?.getAttribute('aria-label')??top?.tagName}})
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2)
 await page.waitForTimeout(300)
 const row={origin,width,box,hit,url:page.url()};rows.push(row);console.log(JSON.stringify(row))
 if(width===390)await page.screenshot({path:`docs/validation/watch/pre-hydration-${origin.startsWith('https')?'production':'local'}.png`})
 await context.close()
}
await browser.close()
await writeFile('docs/validation/watch/hit-target-before.json',JSON.stringify(rows,null,2))
