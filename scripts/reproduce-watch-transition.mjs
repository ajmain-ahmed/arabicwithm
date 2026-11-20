// Baseline-only fault reproduction. The fixed native-link behavior is covered
// by e2e/watch-navigation.pw.ts, including the stalled-RSC assertion.
import { webkit } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const browser=await webkit.launch(),rows=[]
for(const width of [390,1440]){
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:1000}})
 const page=await context.newPage(),blocked=[]
 await page.route('**/cartoons*',async route=>{
  if(route.request().isNavigationRequest())return route.continue()
  blocked.push(route.request().url())
  await new Promise(()=>{})
 })
 await page.goto('http://127.0.0.1:3077/learn',{waitUntil:'domcontentloaded'})
 let control
 if(width<900){await page.getByRole('button',{name:'Open menu',exact:true}).click();control=page.locator('.MuiDrawer-paper').getByRole('button',{name:'Watch',exact:true})}
 else control=page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Watch',exact:true})
 await control.click()
 await page.waitForTimeout(3500)
 const row={width,url:page.url(),blocked,watchVisible:await page.getByRole('group',{name:'Watch catalogue view'}).count(),pageError:await page.locator('[data-awm-page-error]:visible').count()}
 rows.push(row);console.log(JSON.stringify(row))
 await context.close()
}
await browser.close()
await writeFile('docs/validation/watch/stalled-transition-before.json',JSON.stringify(rows,null,2))
