import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
const ids={free:'11111111-1111-4111-8111-111111111111',plus:'22222222-2222-4222-8222-222222222222',admin:'44444444-4444-4444-8444-444444444444'}
async function signIn(context:BrowserContext,kind:keyof typeof ids){
 const id=ids[kind],expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:`${kind}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
test.beforeAll(async({browser,request})=>{
 await request.post(`${backend}/fixture/featured-carousel`)
 // Exercise the normal Admin save path to invalidate the public Featured cache.
 const context=await browser.newContext({ignoreHTTPSErrors:true});await signIn(context,'admin')
 try{const page=await context.newPage();await page.goto(`http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT??3000}/admin/featured`)
 await expect(page.getByText('In current Homepage rotation',{exact:true})).toHaveCount(3)
 await page.getByRole('region',{name:'hero-fixture-0.webp',exact:true}).getByRole('button',{name:'Edit / Position',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
 }finally{await context.close()}
})
for(const width of [320,390,768,1024,1440])for(const kind of ['guest','free','plus'] as const)test(`Featured and membership ${kind} at ${width}`,async({page,context})=>{
 if(kind!=='guest')await signIn(context,kind)
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/')
 const carousel=page.getByRole('region',{name:'Featured Shows',exact:true}),slides=carousel.locator('[data-featured-slide]')
 await expect(slides).toHaveCount(3);await expect(slides.filter({has:page.locator('[aria-label^="View "]')})).toHaveCount(3)
 await expect(slides.filter({has:page.getByRole('link',{name:/^View Hero Fixture/})})).toHaveCount(1)
 const first=slides.nth(0), slug=(await first.getAttribute('data-featured-slide'))!,num=Number(slug.at(-1))
 await expect(first.locator('img').first()).toHaveCSS('object-position',`${20+num*10}% ${30+num*10}%`)
 const viewport=carousel.locator('[aria-label="Swipe Featured Shows"]'),bounds=(await viewport.boundingBox())!,one=(await first.boundingBox())!
 expect(one.width).toBeCloseTo(bounds.width,0)
 if(width>=900)await carousel.getByRole('button',{name:'Next Featured Show',exact:true}).click()
 else await carousel.getByRole('button',{name:/^Show Featured/}).nth(1).click()
 await expect(slides.nth(1)).toHaveAttribute('aria-hidden','false')
 // aria-hidden changes halfway through smooth scrolling; wait for the actual slide boundary.
 await expect.poll(()=>viewport.evaluate(el=>Math.abs(el.scrollLeft-el.clientWidth))).toBeLessThan(1)
 if(width>=900)await carousel.getByRole('button',{name:'Previous Featured Show',exact:true}).click()
 else await carousel.getByRole('button',{name:/^Show Featured/}).nth(0).click()
 await expect(first).toHaveAttribute('aria-hidden','false')
 const promo=page.locator('[data-awm-plus-placement=home]')
 if(kind==='plus'){
  await expect(promo).toContainText('Your AWM+ membership is active.')
  await expect(promo.getByRole('button',{name:'Manage membership',exact:true})).toBeVisible()
  await expect(promo).not.toContainText('Upgrade to AWM+')
  await page.goto(`/profile/${ids.plus}`)
  await expect(page.locator('[data-awm-plus-placement]')).toHaveCount(0);await expect(page.locator('#download-app')).toHaveCount(1)
 }else{
  await expect(promo.getByRole('heading',{name:'Upgrade to AWM+',exact:true})).toBeVisible()
  if(kind==='guest'){
   await expect(page.locator('#download-app')).toHaveCount(0)
   await promo.getByRole('button',{name:'Get AWM+',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible()
  }else{
   await page.goto(`/profile/${ids.free}`);await expect(page.locator('[data-awm-plus-placement=profile]')).toHaveCount(0);await expect(page.locator('#download-app')).toHaveCount(1)
  }
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/featured-membership-${kind}-${width}.png`,fullPage:true})
})
test('swipe/drag never navigates, intentional links do; refresh and another user keep the same rotation',async({page,browser})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width:390,height:1000});await page.goto('/')
 const carousel=page.locator('[data-featured-carousel]'),slides=carousel.locator('[data-featured-slide]'),viewport=carousel.locator('[aria-label="Swipe Featured Shows"]')
 const sequence=await slides.evaluateAll(es=>es.map(el=>el.getAttribute('data-featured-slide')))
 const box=(await viewport.boundingBox())!
 await page.mouse.move(box.x+box.width*.8,box.y+100);await page.mouse.down();await page.mouse.move(box.x+box.width*.2,box.y+100,{steps:12});await page.mouse.up()
 await expect(page).toHaveURL(/\/$/);await expect(slides.nth(1)).toHaveAttribute('aria-hidden','false')
 await page.reload();await expect(slides).toHaveCount(3);expect(await slides.evaluateAll(es=>es.map(el=>el.getAttribute('data-featured-slide')))).toEqual(sequence)
 const other=await browser.newContext();try{await signIn(other,'plus');const visit=await other.newPage();await installYouTubeFixture(visit);await visit.goto(`http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT??3000}/`);expect(await visit.locator('[data-featured-slide]').evaluateAll(es=>es.map(el=>el.getAttribute('data-featured-slide')))).toEqual(sequence)}finally{await other.close()}
 await slides.nth(0).getByRole('link',{name:/^View Hero Fixture/}).click();await expect(page).toHaveURL(new RegExp(`/cartoons/${sequence[0]}$`))
})
test('active viewer never gets their membership card on another public profile',async({page,context})=>{
 await signIn(context,'plus');await page.goto(`/profile/${ids.free}`)
 await expect(page.getByText('free learner',{exact:true}).filter({visible:true}).first()).toBeVisible();await expect(page.locator('[data-awm-plus-placement]')).toHaveCount(0);await expect(page.locator('#download-app')).toHaveCount(0)
})

test('genuine touch swipe stays on Home, keyboard navigation and viewport resize preserve the selected slide',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','CDP supplies actual touch input in Chromium; pointer/keyboard coverage is shared.')
 await installYouTubeFixture(page);await page.setViewportSize({width:390,height:1000});await page.goto('/')
 const carousel=page.locator('[data-featured-carousel]'),viewport=carousel.locator('[aria-label="Swipe Featured Shows"]'),slides=carousel.locator('[data-featured-slide]')
 await expect(slides).toHaveCount(3);const box=(await viewport.boundingBox())!,cdp=await context.newCDPSession(page)
 const y=box.y+150
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.2,y}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await expect(slides.nth(1)).toHaveAttribute('aria-hidden','false');await expect(page).toHaveURL(/\/$/)
 await viewport.press('ArrowRight');await expect(slides.nth(2)).toHaveAttribute('aria-hidden','false')
 await page.waitForTimeout(1100);await expect(slides.nth(2)).toHaveAttribute('aria-hidden','false')
 await page.setViewportSize({width:1024,height:1000});await expect(slides.nth(2)).toHaveAttribute('aria-hidden','false')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const width of [320,390,430,899,900,1440])test(`Featured responsive controls ${width}`,async({page})=>{
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/');await page.evaluate(()=>document.fonts.ready)
 const slide=page.locator('[data-featured-slide][aria-hidden=false]'),play=slide.getByRole('link',{name:'Play',exact:true}),episodes=slide.getByRole('link',{name:'Episodes',exact:true}),dots=slide.locator('[data-featured-pagination]:visible'),image=slide.locator('img').first()
 const p=(await play.boundingBox())!,e=(await episodes.boundingBox())!,d=(await dots.boundingBox())!,i=(await image.boundingBox())!
 expect(p.y).toBeCloseTo(e.y,0)
 if(width<900){expect(d.x+d.width).toBeCloseTo(i.x+i.width-12,0);expect(d.y).toBeCloseTo(i.y+12,0);expect(d.y+d.height).toBeLessThan(p.y);expect(p.x+p.width).toBeLessThan(e.x)}else{expect(d.x+d.width/2).toBeCloseTo(i.x+i.width/2,0);expect(d.y+d.height/2).toBeCloseTo(e.y+e.height/2,0)}
 expect(e.x).toBeGreaterThan(i.x);expect(e.y+e.height).toBeLessThan(i.y+i.height);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(play).toHaveAttribute('href',/\/cartoons\/hero-fixture-/);await expect(episodes).toHaveAttribute('href',/\/cartoons\/hero-fixture-/)
 for(const index of [1,2,0]){await page.evaluate(()=>window.scrollTo(0,0));await dots.getByRole('button',{name:/^Show Featured/}).nth(index).click();await expect(page).toHaveURL(/\/$/);await expect(page.locator('[data-featured-slide]').nth(index)).toHaveAttribute('aria-hidden','false');await expect.poll(()=>page.locator('[aria-label="Swipe Featured Shows"]').evaluate((el,index)=>Math.abs(el.scrollLeft-index*el.clientWidth),index)).toBeLessThan(1)}
 await page.locator('[data-featured-carousel]').screenshot({path:`test-results/mobile-featured-controls-${width}.png`})
 if(width<900){const target=await episodes.getAttribute('href');await episodes.click();await expect(page).toHaveURL(new RegExp(target+'$'));await page.goto('/');const playTarget=await play.getAttribute('href');await play.click();await expect(page).toHaveURL(new RegExp(playTarget+'$'))}
})
