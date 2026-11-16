import { chromium, firefox, expect as baseExpect } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const expect=baseExpect.configure({timeout:20000})
const dir='docs/validation/full-reliability', results=[]
for(const name of ['chrome','firefox']){
 const browser=await(name==='chrome'?chromium:firefox).launch(name==='chrome'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[]
  page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}))
  try{
   await page.goto('https://arabicwithm.com/explore',{waitUntil:'domcontentloaded'});await expect(page.locator('[data-explore-player="active"]').filter({visible:true}).first()).toBeVisible()
   await expect(page.locator('main section[data-index]')).not.toHaveCount(0)
   const exploreRenderedItems=await page.locator('main section[data-index]').count()
   await page.getByRole('button',{name:'For You feed',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-for-you-source]')).toBeVisible()
   const arabicSource=await page.locator('[data-for-you-source]').getAttribute('data-for-you-source')
   await page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).click();await expect(page.getByRole('switch').first()).toBeVisible();await page.keyboard.press('Escape')
   await page.getByRole('button',{name:'Next video',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-for-you-source]')).not.toHaveAttribute('data-for-you-source',arabicSource)
   await page.getByRole('button',{name:'Previous video',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source',arabicSource)
   if(width<900)await page.locator('[data-mobile-language-toggle]').filter({visible:true}).click();else await page.getByRole('button',{name:'EN',exact:true}).click()
   await expect(page.locator('[data-for-you-source]')).toBeVisible();const englishSource=await page.locator('[data-for-you-source]').getAttribute('data-for-you-source')
   await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(page.locator('[data-for-you-source] [lang="en"]').filter({visible:true}).first()).toBeVisible()
   await page.goBack({waitUntil:'domcontentloaded'});await expect(page).toHaveURL('https://arabicwithm.com/explore');await expect(page.locator('[data-explore-player="active"]').filter({visible:true}).first()).toBeVisible()
   await page.goForward({waitUntil:'domcontentloaded'});await expect(page).toHaveURL('https://arabicwithm.com/explore?view=foryou');await expect(page.locator('[data-for-you-source]')).toBeVisible()
   results.push({browser:name,width,status:errors.length?'BLOCKED':'PASS',exploreRenderedItems,arabicSource,englishSource,errors})
  }catch(error){results.push({browser:name,width,status:'BLOCKED',error:error.message,errors})}
  console.log(JSON.stringify(results.at(-1)));await page.close()
 }
 await browser.close()
}
writeFileSync(`${dir}/production-discovery.json`,JSON.stringify(results,null,2))
