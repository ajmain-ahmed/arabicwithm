import { test, expect, type Page } from '@playwright/test'
import { signInFixture } from './helpers/account'
import { installYouTubeFixture } from './helpers/youtube'

const phoneWidths=[320,375,390,414,430]
async function healthy(page:Page){
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('[data-awm-page-error]:visible')).toHaveCount(0)
}
async function catalogue(page:Page){
  await expect(page.getByRole('group',{name:'Watch catalogue view'})).toBeVisible()
  await expect(page.locator('main a[href^="/cartoons/"]').first()).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-awm-hydrated','true')
  await expect(page.getByText(/No (episodes|shows) match/)).toHaveCount(0)
  await healthy(page)
}
async function topWatch(page:Page,width:number){
  if(width<900){
    await page.getByRole('button',{name:'Open menu',exact:true}).click()
    return page.locator('.MuiDrawer-paper').getByRole('link',{name:'Watch',exact:true})
  }
  return page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Watch',exact:true})
}
test.beforeEach(async({page,browserName})=>{
  if(browserName==='firefox')process.env.PLAYWRIGHT_SKIP_NAVIGATION_CHECK='1'
  await installYouTubeFixture(page)
  await page.emulateMedia({reducedMotion:'reduce'})
})

for(const width of [...phoneWidths,768,1024,1440])test(`Watch, Show, Episode, controls and history at ${width}`,async({page,context})=>{
  await signInFixture(context);await page.setViewportSize({width,height:1000})
  // This request failure reproduced a silent no-op before Watch used native links.
  await page.route('**/cartoons*',async route=>{
    if(route.request().isNavigationRequest())return route.continue()
    await new Promise(()=>{})
  })
  await page.goto('/')
  const watch=await topWatch(page,width)
  await expect(watch).toHaveAttribute('href','/cartoons')
  const navigationRequest=page.waitForRequest(request=>request.isNavigationRequest()&&new URL(request.url()).pathname==='/cartoons')
  await watch.click();await navigationRequest;await expect(page).toHaveURL('/cartoons');await catalogue(page)
  await page.unroute('**/cartoons*')
  await expect.poll(()=>page.locator('main a[href^="/cartoons/"] img').first().evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.getByRole('button',{name:'Show all shows',exact:true}).click();await expect(page).toHaveURL('/cartoons?view=shows')
  await page.locator('main a[href="/cartoons/test-show"]').first().click();await expect(page).toHaveURL('/cartoons/test-show')
  await page.locator('main a[href="/cartoons/test-show/clip-0"]').first().click();await expect(page).toHaveURL('/cartoons/test-show/clip-0')
  await expect(page.locator('iframe[title="YouTube video player"]')).toBeVisible()
  await expect(page.locator('[data-watch-tab-content]')).toContainText('This is a book.')
  await page.getByRole(width<900?'tab':'button',{name:'Settings',exact:true}).filter({visible:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
  if(width<900){
    await page.getByRole('tab',{name:'More',exact:true}).click()
    await expect(page.locator('main a[href="/cartoons/test-show/clip-1"]').filter({visible:true}).first()).toBeVisible()
    await page.getByRole('tab',{name:'Script',exact:true}).click()
  }
  await page.getByRole(width<900?'tab':'button',{name:'Memory',exact:true}).filter({visible:true}).click()
  await expect(page).toHaveURL(/\/memory\?episode=/);await healthy(page)
  for(const destination of ['/cartoons/test-show/clip-0','/cartoons/test-show','/cartoons?view=shows','/cartoons','/']){
    await page.goBack();await expect(page).toHaveURL(destination);await healthy(page)
  }
  await page.goForward();await expect(page).toHaveURL('/cartoons');await catalogue(page)
  await page.reload();await catalogue(page)
  if(width<900){
    await page.goto('/');await page.getByRole('button',{name:'Open navigation',exact:true}).click()
    const floating=page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('link',{name:'Watch',exact:true})
    await expect(floating).toHaveAttribute('href','/cartoons');await floating.click();await expect(page).toHaveURL('/cartoons');await catalogue(page)
  }
  await page.goto('/')
  // The footer is below streamed/lazy catalogue sections. Finish their layout
  // before clicking, rather than releasing the pointer into a moving page.
  await expect(page.locator('html')).toHaveAttribute('data-awm-hydrated','true')
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect.poll(async()=>{
    const first=await page.locator('footer').boundingBox()
    await page.waitForTimeout(200)
    const second=await page.locator('footer').boundingBox()
    return Math.abs((first?.y??0)-(second?.y??0))
  }).toBeLessThan(1)
  await page.locator('footer').getByRole('link',{name:'Watch',exact:true}).click();await expect(page).toHaveURL('/cartoons');await catalogue(page)
})

for(const width of phoneWidths)test(`first-session animated Watch shortcut at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/')
  const introduction=page.getByRole('navigation',{name:'Navigation introduction'})
  await expect(introduction).toBeVisible()
  const watch=introduction.getByRole('link',{name:'Watch',exact:true})
  await expect(watch).toHaveAttribute('href','/cartoons');await watch.click();await expect(page).toHaveURL('/cartoons');await catalogue(page)
})

test('server-rendered phone header has no overlaid desktop Watch target',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,ignoreHTTPSErrors:true})
  const page=await context.newPage()
  for(const width of phoneWidths){
    await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:3077/')
    await expect(page.locator('[data-navbar-mobile]')).toBeVisible()
    await expect(page.locator('[data-navbar-desktop]')).toBeHidden()
    await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeHidden()
    const menu=page.getByRole('button',{name:'Open menu',exact:true}),brand=page.getByRole('button',{name:'ArabicWithM home',exact:true}).filter({visible:true})
    const mb=(await menu.boundingBox())!,bb=(await brand.boundingBox())!
    expect(mb.x+mb.width).toBeLessThanOrEqual(bb.x+1)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
    if(width===390)await page.screenshot({path:`docs/validation/watch/ssr-mobile-${test.info().project.name}.png`})
  }
  await context.close()
})

test('desktop Watch performs document navigation with JavaScript disabled',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}})
  const page=await context.newPage();await page.goto('http://127.0.0.1:3077/learn')
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Watch',exact:true}).click()
  await expect(page).toHaveURL('http://127.0.0.1:3077/cartoons')
  // Filtering/player UI requires JavaScript; the link and server response do not.
  await expect(page.locator('body')).toContainText('Test Show')
  await page.goBack();await expect(page).toHaveURL('http://127.0.0.1:3077/learn')
  await context.close()
})

for(const width of [390,1440])test(`Watch from Explore, For You, Library, Profile and Learn at ${width}`,async({page,context,request})=>{
  await signInFixture(context);await page.setViewportSize({width,height:1000})
  await request.post('https://localhost:4377/fixture/english-for-you')
  for(const route of ['/explore','/explore?view=foryou','/books','/profile','/learn']){
    await page.goto(route);await healthy(page)
    if(route==='/profile')await expect(page).toHaveURL(/\/profile\/[\da-f-]+$/)
    if(route.includes('view=foryou'))await expect(page.locator('[data-for-you-source]').first()).toBeVisible()
    const watch=await topWatch(page,width);await watch.click();await expect(page).toHaveURL('/cartoons');await catalogue(page)
  }
  await page.goto('/');const featured=page.locator('[data-featured-slide][aria-hidden="false"]').first()
  await expect(page.locator('[data-home-hero]')).toHaveCount(0)
  await featured.getByRole('link',{name:'Play',exact:true}).click();await expect(page).toHaveURL('/cartoons/test-show/clip-0');await healthy(page)
  await page.goBack();await featured.getByRole('link',{name:'Episodes',exact:true}).click();await expect(page).toHaveURL('/cartoons/test-show');await healthy(page)
})

test('All Categories bookmarks retain existing shows and episodes',async({page})=>{
  await page.goto('/cartoons?category=All%20Categories');await catalogue(page)
  await page.getByRole('button',{name:'Show all shows',exact:true}).click()
  await expect(page.locator('main a[href="/cartoons/test-show"]').first()).toBeVisible()
})

test('the deferred Admin Show editor still opens',async({page,context})=>{
  const id='44444444-4444-4444-8444-444444444444',exp=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
  const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
  const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp,role:'authenticated'})}.fixture-signature`
  await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:exp,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
  await page.setViewportSize({width:1440,height:1000});await page.goto('/cartoons?view=shows')
  await page.locator('main a[href="/cartoons/test-show"]').first().locator('..').getByRole('button').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
