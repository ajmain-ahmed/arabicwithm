import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
test.beforeEach(async({request})=>{await request.post('https://localhost:4351/fixture/mobile-more')})
for(const width of [320,390,430])test(`mobile More has nine tappable cards in three rows at ${width}px`,async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/cartoons/test-show/clip-0')
 const tabs=page.locator('[data-watch-tabs]'),content=page.locator('[data-watch-tab-content]')
 await expect(tabs.getByRole('tab')).toHaveText(['Script','More','Settings','Memory'])
 const bounds=(await tabs.boundingBox())!;expect(bounds.x).toBe(8);expect(bounds.width).toBe(width-16)
 await tabs.getByRole('tab',{name:'More',exact:true}).click()
 const grid=content.locator('[data-mobile-related]'),cards=grid.getByRole('link')
 await expect(cards).toHaveCount(9)
 const geometry=await cards.evaluateAll(els=>els.map(el=>({box:el.getBoundingClientRect().toJSON(),radius:getComputedStyle(el).borderRadius,ratio:getComputedStyle(el).aspectRatio,title:el.querySelector('[data-related-title]')!.getBoundingClientRect().toJSON(),clamp:getComputedStyle(el.querySelector('[data-related-title] span')!).webkitLineClamp})))
 for(let i=0;i<9;i++){
  const g=geometry[i];expect(g.radius).toBe('10px');expect(g.ratio).toBe('4 / 5');expect(g.clamp).toBe('2')
  expect(Math.abs(g.box.y-geometry[Math.floor(i/3)*3].box.y)).toBeLessThan(1)
  expect(g.title.bottom).toBeLessThanOrEqual(g.box.bottom+.1);expect(g.box.width).toBeGreaterThan(85)
  if(i%3)expect(g.box.x).toBeGreaterThan(geometry[i-1].box.right)
  if(i>=3)expect(g.box.top).toBeGreaterThan(geometry[i-3].box.bottom)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await grid.screenshot({path:`test-results/${test.info().project.name}-nine-mobile-more-${width}.png`})
 // Every item follows its own canonical route and loads the watch player/script.
 const hrefs=await cards.evaluateAll(els=>els.map(el=>el.getAttribute('href')!))
 for(const href of hrefs){
  await grid.locator(`a[href="${href}"]`).click();await expect(page).toHaveURL(new RegExp(`${href}$`));await expect(page.locator('iframe').first()).toBeVisible()
  await page.locator('[data-watch-tabs]').getByRole('tab',{name:'Script',exact:true}).click();await expect(page.locator('[data-watch-tabs]').getByRole('tab',{name:'Script',exact:true})).toHaveAttribute('aria-selected','true')
  await page.goBack();await tabs.getByRole('tab',{name:'More',exact:true}).click()
 }
 await tabs.getByRole('tab',{name:'Script',exact:true}).click();await expect(tabs.getByRole('tab',{name:'Script',exact:true})).toHaveAttribute('aria-selected','true')
 await tabs.getByRole('tab',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape')
 await tabs.getByRole('tab',{name:'Memory',exact:true}).click();await expect(page).toHaveURL(/\/memory\?episode=/)
})
for(const width of [768,900,1440])test(`wider watch recommendation layout stays unchanged at ${width}px`,async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/cartoons/test-show/clip-0')
 await expect(page.locator('[data-mobile-related]')).toHaveCount(0)
 const tabs=page.locator('[data-watch-tabs]')
 if(width<900){await tabs.getByRole('tab',{name:'More',exact:true}).click();const cards=page.locator('[data-watch-tab-content]').getByRole('region',{name:'Up next'}).getByRole('link');await expect(cards).toHaveCount(12);await expect(cards.first().locator('img')).toHaveCSS('width','138px')}
 else{await expect(tabs).toBeHidden();await expect(page.getByRole(width>=1200?'complementary':'region',{name:'Up next'}).getByRole('link')).toHaveCount(12);await expect(page.getByRole('button',{name:'Memory',exact:true})).toBeVisible()}
})
