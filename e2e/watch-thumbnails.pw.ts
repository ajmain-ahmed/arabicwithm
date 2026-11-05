import {installYouTubeFixture} from './helpers/youtube'
import {test,expect,type BrowserContext} from '@playwright/test'
// A larger isolated catalogue leaves the standard fixture unchanged.
test.skip(process.env.AWM_TEST_WATCH_THUMBNAILS!=='1','Run with AWM_TEST_WATCH_THUMBNAILS=1')
async function signIn(context:BrowserContext,premium=true){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'audio@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}


async function thumbnails(page:import('@playwright/test').Page,count:number){
 const cards=page.locator('main a.MuiPaper-root')
 await expect(cards).toHaveCount(count)
 for(let i=0;i<count;i++){
  const card=cards.nth(i);await card.scrollIntoViewIfNeeded()
  const image=card.locator('img');await expect(image).toBeVisible()
  expect(await image.evaluate((el:HTMLImageElement)=>new URL(el.src).pathname)).toMatch(/^\/api\/covers\/(shows|episodes)\//)
  await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0&&getComputedStyle(el).opacity==='1')).toBe(true)
  expect(await image.evaluate(el=>getComputedStyle(el).objectFit)).toBe('cover')
 }
}
for(const width of [390,1440])for(const member of [false,true])test(`Watch originals and lazy lists at ${width}, signed in=${member}`,async({page,context})=>{
 await context.setExtraHTTPHeaders({'x-forwarded-for':`192.0.2.${(width===390?10:20)+(member?1:0)}`})
 if(member)await signIn(context)
 await page.setViewportSize({width,height:900})
 const failures:string[]=[],optimized:string[]=[],errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('response',r=>{if(r.url().includes('/api/covers/')&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`)})
 await page.route('**/_next/image?**',route=>{
  if((new URL(route.request().url()).searchParams.get('url')??'').startsWith('/api/covers/'))optimized.push(route.request().url())
  return route.fulfill({status:402,body:'OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED'})
 })
 await page.goto('/cartoons?view=shows');await thumbnails(page,12)
 await page.goto('/cartoons');await thumbnails(page,24)
 await page.getByRole('button',{name:'Go to page 2',exact:true}).click();await thumbnails(page,12)
 await page.goto('/cartoons/test-show');await thumbnails(page,36)
 const last=page.locator('main a.MuiPaper-root').last();await last.hover()
 await expect(last).toHaveCSS('cursor','pointer')
 await page.goto('/')
 if(width<900){await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('dialog',{name:'Site navigation',exact:true}).getByRole('button',{name:'Watch',exact:true}).click()}
 else await page.getByRole('navigation',{name:'Primary navigation',exact:true}).getByRole('link',{name:'Watch',exact:true}).click()
 await expect(page).toHaveURL(/\/cartoons/);await thumbnails(page,24)
 expect(failures).toEqual([]);expect(optimized).toEqual([]);expect(errors).toEqual([])
})

for(const width of [390,1440])test(`Explore playback and original posters at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await installYouTubeFixture(page)
 const optimized:string[]=[]
 await page.route('**/_next/image?**',route=>{
  if((new URL(route.request().url()).searchParams.get('url')??'').startsWith('/api/covers/'))optimized.push(route.request().url())
  return route.fulfill({status:402,body:'OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED'})
 })
 await page.goto('/explore')
 await expect(page.locator('[data-explore-player=active] iframe')).toBeVisible()
 const poster=page.locator('[data-explore-player=inactive] img').first()
 await expect(poster).toHaveCount(1)
 // Load the same rendered poster URL without scrolling the feed into activation.
 const src=await poster.getAttribute('src')
 expect(new URL(src!,page.url()).pathname).toMatch(/^\/api\/covers\/episodes\//)
 expect(await poster.evaluate((el:HTMLImageElement)=>new Promise<boolean>(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src=el.src}))).toBe(true)
 expect(optimized).toEqual([])
})
