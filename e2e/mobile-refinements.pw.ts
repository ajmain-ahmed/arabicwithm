import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'

for(const width of [320,390,430,767,768,769,899,900,1024,1440])test(`watch layout, related navigation and tablet boundaries ${width}`,async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/cartoons/test-show/clip-0')
 const tabs=page.locator('[data-watch-tabs]'),content=page.locator('[data-watch-tab-content]')
 if(width<900){
  await expect(tabs.getByRole('tab')).toHaveText(['Script','More','Settings','Memory'])
  const bounds=(await tabs.boundingBox())!
  expect(bounds.x).toBe(width<768?8:20);expect(bounds.width).toBe(width-(width<768?16:40))
  await tabs.getByRole('tab',{name:'More',exact:true}).click();await expect(tabs.getByRole('tab',{name:'More',exact:true})).toHaveAttribute('aria-selected','true')
  const cards=content.getByRole('region',{name:'Up next'}).getByRole('link');await expect(cards).toHaveCount(3)
  if(width<768){
   const geometry=await cards.evaluateAll(els=>els.map(el=>({box:el.getBoundingClientRect().toJSON(),radius:getComputedStyle(el).borderRadius,ratio:getComputedStyle(el).aspectRatio,title:el.querySelector('[data-related-title]')!.getBoundingClientRect().toJSON(),clamp:getComputedStyle(el.querySelector('[data-related-title] span')!).webkitLineClamp})))
   for(let i=0;i<geometry.length;i++){const g=geometry[i];expect(g.radius).toBe('10px');expect(g.ratio).toBe('4 / 5');expect(g.clamp).toBe('2');expect(Math.abs(g.box.y-geometry[0].box.y)).toBeLessThan(1);expect(g.title.bottom).toBeLessThanOrEqual(g.box.bottom+.1);expect(g.box.width).toBeGreaterThan(85);if(i)expect(g.box.x).toBeGreaterThan(geometry[i-1].box.right)}
   await content.screenshot({path:`test-results/${test.info().project.name}-mobile-more-${width}.png`})
  }else{
   await expect(page.locator('[data-mobile-related]')).toHaveCount(0)
   await expect(cards.first().locator('img')).toHaveCSS('width','138px')
  }
  await tabs.getByRole('tab',{name:'Script',exact:true}).click();await expect(tabs.getByRole('tab',{name:'Script',exact:true})).toHaveAttribute('aria-selected','true')
  await tabs.getByRole('tab',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape')
  await tabs.getByRole('tab',{name:'More',exact:true}).click();const href=await cards.first().getAttribute('href');await cards.first().click();await expect(page).toHaveURL(new RegExp(`${href}$`));await expect(page.locator('iframe').first()).toBeVisible()
  await page.goBack();await page.locator('[data-watch-tabs]').getByRole('tab',{name:'Memory',exact:true}).click();await expect(page).toHaveURL(/\/memory\?episode=/)
 }else{
  await expect(tabs).toBeHidden();await expect(page.locator('[data-mobile-related]')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Memory',exact:true})).toBeVisible()
 }
 // Desktop watch overflow at 900/1440px also reproduces against HEAD; keep this mobile-only assertion.
 if(width<900)expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const width of [767,768,769,899,900])test(`Explore and For You tablet boundaries ${width}`,async({page,request})=>{
 await request.post('https://localhost:4347/fixture/spotlight');await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore')
 const tools=page.locator('[data-mobile-view-tools]:visible')
 if(width<768){await expect(tools.getByRole('group',{name:'Explore views'}).getByRole('button')).toHaveText(['Explore','For You']);await tools.getByRole('button',{name:'For You feed',exact:true}).click()}
 else if(width<900){await expect(tools.locator('[data-mobile-view-toggle]')).toHaveText('Explore');await tools.locator('[data-mobile-view-toggle]').click()}
 else{await expect(tools).toHaveCount(0);await page.getByRole('button',{name:'For You feed',exact:true}).filter({visible:true}).click()}
 await expect(page).toHaveURL(/\/explore\?view=foryou$/)
 if(width<900){const toolbar=page.locator('[data-mobile-for-you-toolbar]');await expect(toolbar.getByRole('button',{name:'Settings',exact:true})).toBeVisible();if(width>=768){await expect(toolbar.getByRole('button',{name:'Settings',exact:true})).toHaveCSS('width','32px');await expect(toolbar.getByRole('button',{name:'Settings',exact:true})).toHaveCSS('height','36px')}}
 else await expect(page.locator('[data-mobile-for-you-toolbar]')).toBeHidden()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
