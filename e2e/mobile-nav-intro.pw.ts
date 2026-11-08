import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'

for(const width of [320,390,430])test(`first-session leftwards intro, five-second hold and smooth collapse ${width}`,async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/learn')
 const floating=page.locator('[data-mobile-nav-float]'),button=page.getByRole('button',{name:'Open navigation',exact:true}),preview=page.getByRole('navigation',{name:'Navigation introduction'})
 await expect(floating).toHaveAttribute('data-intro-state','expanded')
 const expandedAt=Date.now()
 const heading=page.getByRole('heading',{level:1}),beforeHeading=(await heading.boundingBox())!
 await expect(preview.getByRole('button')).toHaveText(['Explore','Watch','Read','Learn']);await expect(preview.getByRole('button',{name:'Home',exact:true})).toHaveCount(0)
 await expect(floating).toHaveCSS('transition-duration','0.45s')
 await page.waitForTimeout(500)
 const circle=(await button.boundingBox())!,expanded=(await floating.boundingBox())!
 expect(circle.width).toBe(52);expect(circle.height).toBe(52);expect(circle.x+circle.width).toBe(width-16);expect(circle.y+circle.height).toBe(980)
 expect(expanded.width).toBeGreaterThan(250);expect(expanded.x).toBeGreaterThanOrEqual(11.9);expect(expanded.x+expanded.width).toBeCloseTo(circle.x+circle.width,1)
 const buttons=await preview.getByRole('button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()))
 for(let i=0;i<buttons.length;i++){expect(buttons[i].height).toBeGreaterThanOrEqual(43.9);expect(Math.abs(buttons[i].y-buttons[0].y)).toBeLessThan(1);if(i)expect(buttons[i].x).toBeGreaterThanOrEqual(buttons[i-1].right-.1)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect((await heading.boundingBox())!.y).toBe(beforeHeading.y)
 await floating.screenshot({path:`test-results/${test.info().project.name}-nav-intro-${width}.png`})
 await page.waitForTimeout(Math.max(0,4700-(Date.now()-expandedAt)));await expect(floating).toHaveAttribute('data-intro-state','expanded')
 await expect(floating).toHaveAttribute('data-intro-state','closing',{timeout:2000});await expect(floating).toHaveCSS('transition-duration','0.8s')
 await page.waitForTimeout(150);const early=(await floating.boundingBox())!.width
 await page.waitForTimeout(250);const later=(await floating.boundingBox())!.width
 expect(early).toBeLessThan(expanded.width);expect(later).toBeLessThan(early);expect(later).toBeGreaterThan(52)
 await expect(floating).toHaveAttribute('data-intro-state','idle');await expect(floating).toHaveCSS('width','52px');await expect(button).toBeVisible()
 await button.click();const full=page.getByRole('navigation',{name:'Mobile navigation',exact:true});await expect(full.getByRole('button')).toHaveText(['Home','Explore','Watch','Read','Learn'])
 await full.getByRole('button',{name:'Read',exact:true}).click();await expect(page).toHaveURL(/\/books$/);await expect(floating).toHaveAttribute('data-intro-state','idle')
 await page.reload();await expect(button).toBeVisible();await expect(floating).toHaveAttribute('data-intro-state','idle')
})

test('hamburger during intro opens the complete menu and the old timer cannot close it',async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width:390,height:1000});await page.goto('/learn')
 await expect(page.locator('[data-mobile-nav-float]')).toHaveAttribute('data-intro-state','expanded')
 await page.getByRole('button',{name:'Open navigation',exact:true}).click()
 const full=page.getByRole('navigation',{name:'Mobile navigation',exact:true})
 await expect(full.getByRole('button')).toHaveText(['Home','Explore','Watch','Read','Learn'])
 await page.waitForTimeout(6500);await expect(full).toBeVisible();await full.getByRole('button',{name:'Home',exact:true}).click();await expect(page).toHaveURL(/\/$/)
 await expect(page.locator('[data-mobile-nav-float]')).toHaveAttribute('data-intro-state','idle')
})

for(const [label,path] of [['Explore','/explore'],['Watch','/cartoons'],['Read','/books'],['Learn','/learn']])test(`intro destination ${label} uses ${path}`,async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width:320,height:1000});await page.goto('/')
 const preview=page.getByRole('navigation',{name:'Navigation introduction'});await expect(preview).toBeVisible()
 await preview.getByRole('button',{name:label,exact:true}).click();await expect(page).toHaveURL(new RegExp(path==='/'?'/$':`${path}$`))
 await expect(page.locator('[data-mobile-nav-float]')).toHaveAttribute('data-intro-state','idle')
})

test('route changes cancel the introduction, and reduced motion disables animated transitions',async({page})=>{
 await installYouTubeFixture(page);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:1000});await page.goto('/learn')
 const floating=page.locator('[data-mobile-nav-float]'),preview=page.getByRole('navigation',{name:'Navigation introduction'})
 await expect(floating).toHaveAttribute('data-intro-state','expanded');await expect(floating).toHaveCSS('transition-duration','0s');await expect(preview).toHaveCSS('transition-duration','0s')
 await page.getByRole('button',{name:'Open menu',exact:true}).click()
 await page.locator('.mobile-list-btn').filter({hasText:/^Read$/}).click();await expect(page).toHaveURL(/\/books$/);await expect(floating).toHaveAttribute('data-intro-state','idle')
})

test('desktop keeps its existing navigation and does not consume the mobile intro',async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width:1440,height:1000});await page.goto('/learn')
 await expect(page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link')).toHaveText(['Home','Explore','Watch','Read','Learn'])
 await expect(page.locator('[data-mobile-nav-float]')).toHaveCount(0)
 expect(await page.evaluate(()=>sessionStorage.getItem('awm-mobile-nav-intro-seen'))).toBeNull()
 await page.setViewportSize({width:390,height:1000});await expect(page.locator('[data-mobile-nav-float]')).toHaveAttribute('data-intro-state','expanded')
})

