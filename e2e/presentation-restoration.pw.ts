import {test,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {installYouTubeFixture} from './helpers/youtube'

for(const width of [320,375,390,414,430,1440])test(`restored language menu, compact introduction and retained practice ${width}`,async({page,context},info)=>{
 const directory=`artifacts/presentation/${info.project.name}/${width}`;await mkdir(directory,{recursive:true})
 await installYouTubeFixture(page);await page.setViewportSize({width,height:844});await page.goto('/')
 const toolbar=page.locator('[data-site-toolbar]'),floating=page.locator('[data-mobile-nav-float]')
 let intro:unknown=null
 if(width<900){
  await expect(toolbar.locator('[data-language-indicator]').filter({visible:true})).toHaveCount(0)
  await expect(floating).toHaveAttribute('data-intro-state','expanded')
  // Wait for the width transition, not only the state update.
  await expect.poll(async()=>Math.round((await floating.boundingBox())!.width)).toBe(Math.min(306,width-28))
  intro=await floating.boundingBox();expect((intro as {height:number}).height).toBe(44)
  await page.screenshot({path:`${directory}/intro.png`})
  await expect(floating).toHaveAttribute('data-intro-state','idle',{timeout:10000})
 }
 const set=async(locale:'en'|'ar')=>{
  if(width<900){await toolbar.locator('[data-mobile-menu-trigger]').first().click();await expect(page.locator('[data-mobile-menu-controls]')).toBeVisible()}
  await page.locator('[data-language-indicator]').filter({visible:true}).click()
  await page.getByRole('menuitem',{name:locale==='ar'?'العربية — AR':'English — EN',exact:true}).click()
  await expect(page.getByRole('menu')).not.toBeVisible()
  if(width<900){await page.screenshot({path:`${directory}/menu-${locale}.png`});await page.keyboard.press('Escape')}
  await expect(page.locator('html')).toHaveAttribute('lang',locale)
  await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr')
 }
 await set('ar');await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','ar')
 expect((await context.cookies()).some(c=>c.name==='awm-website-locale'&&c.value==='ar')).toBe(true)
 await set('en');await toolbar.screenshot({path:`${directory}/navbar-en.png`})
 let apiCalls=0;page.on('request',r=>{if(r.url().includes('/api/learn/'))apiCalls++})
 await page.goto('/learn');await expect(page.locator('[data-practice-launcher]')).toHaveCount(3)
 expect(apiCalls).toBe(0);await expect(page.getByRole('grid')).toHaveCount(0)
 await page.locator('[data-practice-launcher=puzzle]').getByRole('button',{name:'Start',exact:true}).click()
 const grid=page.getByRole('grid');await expect(grid).toBeVisible();const text=await grid.textContent()
 await grid.evaluate(el=>el.setAttribute('data-retained','yes'));const count=apiCalls
 await set('ar');await expect(grid).toHaveAttribute('data-retained','yes');await expect(grid).toHaveText(text!);expect(apiCalls).toBe(count)
 const shell=page.locator('[data-word-search-shell]');expect(await shell.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
 await page.screenshot({path:`${directory}/practice-ar.png`,fullPage:true})
 await set('en')
 for(const theme of ['dark','light']){
  const toggle=toolbar.getByRole('button',{name:`Switch to ${theme} mode`,exact:true});if(await toggle.count())await toggle.click()
  expect(await shell.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await shell.screenshot({path:`${directory}/activity-${theme}.png`})
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>sessionStorage.removeItem('awm-mobile-nav-intro-seen'));await page.reload()
 if(width<900)await expect(page.locator('[data-mobile-nav-float]')).toHaveAttribute('data-intro-state','idle')
 await writeFile(`${directory}/metrics.json`,JSON.stringify({width,intro,initialPracticeRequests:0,requestsAfterPuzzle:count},null,2))
})
