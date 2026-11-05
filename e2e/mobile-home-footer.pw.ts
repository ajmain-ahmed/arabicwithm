import {test,expect,type Page} from '@playwright/test'

async function checkMobile(page:Page,safeArea=0){
 const quick=page.locator('[data-mobile-home-actions]'),footer=page.locator('footer')
 await quick.scrollIntoViewIfNeeded();await expect(quick).toBeVisible()
 const gap=await page.evaluate(()=>{
  const quick=document.querySelector('[data-mobile-home-actions]')!.getBoundingClientRect()
  const footer=document.querySelector('footer')!.getBoundingClientRect()
  const logo=document.querySelector('footer img')!.getBoundingClientRect()
  return {boundary:footer.top-quick.bottom,content:logo.top-quick.bottom}
 })
 expect(gap.boundary).toBeCloseTo(16,0);expect(gap.content).toBeCloseTo(33,0)
 expect(await footer.evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom))).toBe(72+safeArea)
 await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}))
 const legal=footer.getByRole('button',{name:'Terms of Service',exact:true}),nav=page.getByRole('button',{name:'Open navigation',exact:true})
 await expect(legal).toBeInViewport();await expect(nav).toBeInViewport()
 const endGap=await legal.evaluate(el=>document.documentElement.scrollHeight-(el.getBoundingClientRect().bottom+window.scrollY))
 expect(endGap).toBeCloseTo(80+safeArea,0)
 const link=(await legal.boundingBox())!,button=(await nav.boundingBox())!
 expect(link.y+link.height).toBeLessThanOrEqual(button.y-7)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await nav.click();await expect(page.getByRole('navigation',{name:'Mobile navigation',exact:true})).toBeVisible();await page.keyboard.press('Escape')
}

for(const width of [320,375,390,430])test(`mobile homepage footer spacing at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/')
 await checkMobile(page)
 await page.screenshot({path:`docs/validation/mobile-home-footer/footer-${width}.png`})
 await page.locator('[data-mobile-home-actions]').scrollIntoViewIfNeeded()
 await page.screenshot({path:`docs/validation/mobile-home-footer/quick-actions-${width}.png`})
})

test('safe-area clearance is included once on the mobile homepage',async({page,context})=>{
 await page.setViewportSize({width:390,height:900})
 const cdp=await context.newCDPSession(page)
 await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:34}})
 await page.goto('/');await checkMobile(page,34)
})

test('desktop homepage and other-route footer spacing stays unchanged',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/')
 const footer=page.locator('footer'),columns=footer.locator(':scope > .MuiContainer-root')
 expect(await footer.evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom))).toBe(0)
 expect(await columns.evaluate(el=>parseFloat(getComputedStyle(el).paddingTop))).toBe(72)
 await page.setViewportSize({width:390,height:900});await page.goto('/learn')
 expect(await footer.evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom))).toBe(76)
 expect(await columns.evaluate(el=>parseFloat(getComputedStyle(el).paddingTop))).toBe(56)
})
