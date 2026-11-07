import {test,expect,type BrowserContext} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,375,390,430,1440])test(`own-profile app reminder and full Homepage book artwork at ${width}`,async({page,context,request})=>{
 await signIn(context,'user');await page.setViewportSize({width,height:1000});await page.goto('/')
 await expect(page.locator('#download-app')).toHaveCount(0)
 const books=page.getByRole('region',{name:'Books',exact:true})
 await page.getByRole('heading',{name:'Books',exact:true}).scrollIntoViewIfNeeded();await expect(books).toBeVisible()
 const cover=books.locator('img').first();await expect(cover).toBeVisible()
 expect(await cover.evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain')
 expect(await cover.evaluate(el=>{const box=el.parentElement!.getBoundingClientRect();return Math.abs(box.width/box.height-2/3)<.01})).toBe(true)
 await page.goto(`/profile/${ids.user}`)
 const card=page.locator('#download-app')
 await expect(card.getByRole('heading',{name:'ArabicwithM on the go!',exact:true})).toBeVisible();await expect(card).toHaveCount(1)
 const field=card.getByRole('textbox',{name:'Email address',exact:true})
 await expect(field).toHaveAttribute('readonly','')
 const bounds=(await field.boundingBox())!,container=(await card.boundingBox())!
 expect(bounds.x).toBeGreaterThanOrEqual(container.x);expect(bounds.x+bounds.width).toBeLessThanOrEqual(container.x+container.width)
 if(width===390){
  await card.getByRole('button',{name:'Remind Me',exact:true}).click();await expect(card.getByRole('status')).toContainText('on the list')
  await page.reload();await expect(card.getByRole('button',{name:'Turn off app-launch emails',exact:true})).toBeVisible()
  await card.getByRole('button',{name:'Turn off app-launch emails',exact:true}).click();await expect(card.getByRole('status')).toContainText('switched off')
  const rows=await(await request.get(`${backend}/rest/v1/email_preferences?email=eq.free@fixture.example`)).json()
  expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({purpose:'app_launch',subscribed:false,user_id:ids.user,consent_version:'app-launch-v1'})
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/profile-app-reminder-${width}.png`,fullPage:true})
})

const ids={user:'11111111-1111-4111-8111-111111111111',premium:'22222222-2222-4222-8222-222222222222',editor:'33333333-3333-4333-8333-333333333333',admin:'44444444-4444-4444-8444-444444444444'}
async function signIn(context:BrowserContext,role:keyof typeof ids){
 const id=ids[role],expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:`${role}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

for(const role of ['user','premium','editor','admin'] as const)test(`app reminder absent for authenticated ${role}`,async({page,context})=>{
 await signIn(context,role);await page.goto('/')
 if(await page.locator('[data-featured-carousel]').count()===0)await expect(page.getByRole('heading',{name:/Good (morning|afternoon|evening)/})).toBeVisible()
 await expect(page.locator('#download-app')).toHaveCount(0)
 await page.setViewportSize({width:390,height:900})
 const quick=page.locator('[data-mobile-home-actions]')
 await quick.scrollIntoViewIfNeeded()
 if(role==='premium'||role==='admin')expect(await page.evaluate(()=>document.querySelector('footer')!.getBoundingClientRect().top-document.querySelector('[data-mobile-home-actions]')!.getBoundingClientRect().bottom)).toBeCloseTo(24,0)
 await page.goto(`/profile/${ids[role]}`);await expect(page.locator('#download-app')).toHaveCount(1)
})

test('signed-out Homepage has no app reminder but retains the AWM+ card',async({page})=>{
 await page.goto('/');await expect(page.locator('#download-app')).toHaveCount(0)
 await expect(page.locator('[data-awm-plus-placement=home]')).toContainText('Upgrade to AWM+')
})
