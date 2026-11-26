import {test,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {installYouTubeFixture} from './helpers/youtube'
test('loaded guest Home comparison across phone widths and desktop',async({page},info)=>{
 const phase=process.env.AWM_SIZING_PHASE??'after',rows:unknown[]=[]
 await page.addInitScript(()=>sessionStorage.setItem('awm-mobile-nav-intro-seen','1'))
 await installYouTubeFixture(page)
 await page.setViewportSize({width:390,height:844});await page.goto('/')
 const episodes=page.getByRole('region',{name:'Latest Episodes',exact:true})
 await expect(episodes.locator('a').first()).toBeVisible()
 await page.evaluate(()=>document.fonts.ready)
 for(const width of [320,375,390,414,430,1440]){
  await page.setViewportSize({width,height:844})
  await page.evaluate(()=>{window.scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))})
  const directory=`artifacts/mobile-compact/${phase}/${info.project.name}/${width}`
  await mkdir(directory,{recursive:true})
  await page.screenshot({path:`${directory}/home-guest.png`,animations:'disabled'})
  rows.push(await page.evaluate(()=>{
   const frame=document.querySelector('[data-featured-hero] > div')!.getBoundingClientRect(),row=document.querySelector('[role=region][aria-label="Latest Episodes"]')!.getBoundingClientRect()
   return {width:innerWidth,navbar:document.querySelector('header')!.getBoundingClientRect().height,featured:frame.height,latestEpisodesTop:row.y,rowHeight:row.height,visibleRowPixels:Math.max(0,Math.min(row.bottom,innerHeight)-Math.max(0,row.top)),root:getComputedStyle(document.documentElement).fontSize,overflow:document.documentElement.scrollWidth>innerWidth}
  }))
 }
 await writeFile(`artifacts/mobile-compact/${phase}/${info.project.name}/home-comparison.json`,JSON.stringify(rows,null,2))
})
