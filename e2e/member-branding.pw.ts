import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend='https://localhost:4351'
async function account(context:BrowserContext,premium=true){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'audio@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

for(const width of [320,390,430,768,1440]) test(`active member branding fits at ${width}px`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/member-branding`,{data:{state:'active'}})
 await account(context);await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/')
 const logo=page.getByRole('button',{name:'ArabicWithM Plus home',exact:true})
 await expect(logo).toBeVisible();await expect(logo).toHaveText('ArabicWithM+')
 const footer=page.locator('footer [aria-label="ArabicWithM Plus"]')
 await expect(footer).toHaveText('ArabicWithM+')
 await expect(page.locator('#awm-plus-promo h2')).toHaveText('Your AWM+ subscription is active.')
 await expect(page.locator('#awm-plus-promo').getByText('AWM+',{exact:true})).toHaveCSS('color','rgb(212, 168, 67)')
 await expect(page.getByRole('button',{name:'Manage membership',exact:true})).toBeVisible()
 for(const brand of [logo,footer]) {
  await expect(brand.locator('[data-member-brand-plus]')).toHaveCSS('color','rgb(240, 207, 122)')
  const geometry=await brand.evaluate(el=>{
   const plus=el.querySelector('[data-member-brand-plus]')!.getBoundingClientRect(),box=el.getBoundingClientRect()
   return {fits:plus.left>=box.left&&plus.right<=box.right+1,inline:plus.top>=box.top-1&&plus.bottom<=box.bottom+1}
  })
  expect(geometry).toEqual({fits:true,inline:true})
 }
 const logoBox=await logo.boundingBox();expect(logoBox!.x).toBeGreaterThanOrEqual(0);expect(logoBox!.x+logoBox!.width).toBeLessThanOrEqual(width)
 if(width<900){const menu=await page.getByRole('button',{name:'Open menu',exact:true}).boundingBox();expect(logoBox!.x).toBeGreaterThanOrEqual(menu!.x+menu!.width)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/${test.info().project.name}-member-navbar-${width}.png`})
 await footer.scrollIntoViewIfNeeded();await page.locator('footer').screenshot({path:`test-results/${test.info().project.name}-member-footer-${width}.png`})
})
for(const state of ['guest','free','expired','cancelled','cancel-at-period-end']) test(`canonical branding for ${state}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/member-branding`,{data:{state}})
 if(state!=='guest')await account(context,state!=='free')
 await installYouTubeFixture(page);await page.goto('/')
 const active=state==='cancel-at-period-end'
 await expect(page.getByRole('button',{name:active?'ArabicWithM Plus home':'ArabicWithM home',exact:true})).toBeVisible()
 await expect(page.locator('footer [data-member-brand-plus]')).toHaveCount(active?1:0)
 await expect(page.locator('#awm-plus-promo h2')).toHaveText(active?'Your AWM+ subscription is active.':'Upgrade to AWM+')
 if(active)await expect(page.locator('#awm-plus-promo')).toContainText('Cancellation scheduled')
})
test('all surfaces revert together after expiry and signout',async({page,context,request})=>{
 await request.post(`${backend}/fixture/member-branding`,{data:{state:'active'}});await account(context);await installYouTubeFixture(page);await page.goto('/')
 await expect(page.getByRole('button',{name:'ArabicWithM Plus home',exact:true})).toBeVisible()
 await request.post(`${backend}/fixture/member-branding`,{data:{state:'expired'}})
 await page.evaluate(()=>window.dispatchEvent(new Event('account-access-changed')))
 await expect(page.getByRole('button',{name:'ArabicWithM home',exact:true})).toBeVisible()
 await expect(page.locator('footer [data-member-brand-plus]')).toHaveCount(0)
 await expect(page.locator('#awm-plus-promo h2')).toHaveText('Upgrade to AWM+')
 await context.clearCookies();await page.reload()
 await expect(page.getByRole('button',{name:'ArabicWithM home',exact:true})).toBeVisible();await expect(page.locator('footer [data-member-brand-plus]')).toHaveCount(0)
})
