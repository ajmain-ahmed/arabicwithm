import { chromium, firefox, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
const dir='docs/validation/full-reliability';mkdirSync(dir,{recursive:true})
for(const name of ['chrome','firefox']) {
 const browser=await(name==='chrome'?chromium:firefox).launch(name==='chrome'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})
 const results=[]
 for(const width of [320,390,430,768,1024,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000)
  async function healthy(){await expect(page.locator('main')).toBeVisible();await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)}
  try{
   await page.goto('https://arabicwithm.com/',{waitUntil:'domcontentloaded'})
   if(width<900){await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('button',{name:'Watch',exact:true}).click()}
   else await page.getByRole('navigation',{name:'Primary navigation',exact:true}).getByRole('link',{name:'Watch',exact:true}).click({noWaitAfter:true})
   await expect(page).toHaveURL(/\/cartoons$/);await healthy()
   await page.getByRole('button',{name:'Show all shows',exact:true}).click();await expect(page).toHaveURL(/view=shows/)
   await page.locator('main a[href="/cartoons/avt"]').first().click({noWaitAfter:true});await expect(page).toHaveURL(/\/cartoons\/avt$/)
   await page.locator('main a[href="/cartoons/avt/avt-2"]').first().click({noWaitAfter:true});await expect(page.locator('main')).toContainText('Aang and The Guru');await healthy()
   const settings=page.getByRole(width<900?'tab':'button',{name:'Settings',exact:true}).filter({visible:true});await settings.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape')
   await page.goBack({waitUntil:'domcontentloaded'});await expect(page).toHaveURL(/\/cartoons\/avt$/);await healthy()
   await page.goForward({waitUntil:'domcontentloaded'});await expect(page).toHaveURL(/\/cartoons\/avt\/avt-2$/);await page.reload({waitUntil:'domcontentloaded'});await healthy()
   await page.goto('https://arabicwithm.com/books',{waitUntil:'domcontentloaded'});await page.locator('main a[href="/books/bos4"]').filter({visible:true}).first().click({noWaitAfter:true});await expect(page.getByRole('heading',{name:'99 Souls',exact:true})).toBeVisible()
   await page.locator('main a[href="/books/bos4/bos4-1"]').click({noWaitAfter:true});await expect(page.getByRole('dialog')).toBeVisible()
   await expect(page).toHaveURL(/\/books\/bos4$/);await page.keyboard.press('Escape');await page.goBack({waitUntil:'domcontentloaded'});await expect(page).toHaveURL(/\/books$/);await page.goForward({waitUntil:'domcontentloaded'});await expect(page).toHaveURL(/\/books\/bos4$/);await page.reload({waitUntil:'domcontentloaded'});await healthy()
   await page.goto('https://arabicwithm.com/explore?view=foryou',{waitUntil:'domcontentloaded'});await expect(page.locator('[data-for-you-source]')).toBeVisible({timeout:30000});await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
   await page.screenshot({path:`${dir}/production-${name}-${width}.png`});results.push({width,status:'PASS',flows:['Home/Watch/Show/Episode/Settings/Back/Forward/refresh','Read/Book/Chapter sign-in/Back/Forward/refresh','For You real source/iframe'],errors})
  }catch(error){results.push({width,status:'BLOCKED',error:error.message,errors});await page.screenshot({path:`${dir}/production-${name}-${width}-failure.png`}).catch(()=>{})}
  console.log(JSON.stringify({browser:name,...results.at(-1)}));await page.close()
 }
 writeFileSync(`${dir}/production-flows-${name}.json`,JSON.stringify(results,null,2));await browser.close()
}
