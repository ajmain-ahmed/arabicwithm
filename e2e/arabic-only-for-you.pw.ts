import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
test.skip(process.env.AWM_SIZING_PHASE==='before','Current Arabic-only policy is checked after implementation.')
for(const width of [375,1440])test(`Arabic-only For You, saved locale and history at ${width}`,async({page,context,request})=>{
 await request.post('https://localhost:4365/fixture/english-for-you',{data:{subtitleLayout:true,seek:true}})
 await context.addCookies([{name:'awm-website-locale',value:'ar',domain:'127.0.0.1',path:'/'}])
 await page.addInitScript(()=>localStorage.setItem('awm-website-locale','ar'))
 await installYouTubeFixture(page);await page.setViewportSize({width,height:844})
 const response=await page.goto('/explore?view=foryou')
 expect(await response!.text()).toMatch(/<html[^>]*lang="en"[^>]*dir="ltr"/)
 const source=page.locator('[data-for-you-source]')
 await expect(source.locator('iframe')).toBeVisible()
 for(let i=0;i<3;i++){
  await expect(source).toHaveAttribute('data-for-you-source',/^abcdefghij[0-3]$/)
  await expect(page.locator('[data-english-for-you]:visible')).toHaveCount(0)
  await page.getByRole('button',{name:'Next video',exact:true}).filter({visible:true}).click()
 }
 await expect(page.locator('[data-mobile-language-toggle]')).toHaveCount(0)
 await expect(page.getByRole('group',{name:'Source video language'})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Website language',exact:true})).toHaveCount(0)
 const nav=page.getByRole('button',{name:width<900?'For You selected — switch to Explore':'Explore feed',exact:true}).filter({visible:true})
 await nav.click();await expect(page).not.toHaveURL(/view=foryou/)
 await page.goBack();await expect(source.locator('iframe')).toBeVisible()
 await page.goForward();await expect(page).not.toHaveURL(/view=foryou/)
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('html')).toHaveAttribute('dir','ltr')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
