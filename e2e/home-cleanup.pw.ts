import {test,expect,type BrowserContext} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,375,390,430,1440])test(`guest app reminder and full book artwork at ${width}`,async({page,request})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/')
 const card=page.locator('#download-app')
 await expect(card.getByRole('heading',{name:'Take Arabic with M with you everywhere you go.',exact:true})).toBeVisible()
 await expect(card).toHaveCount(1)
 await page.getByRole('heading',{name:'Books',exact:true}).scrollIntoViewIfNeeded()
 await expect(page.getByRole('region',{name:'Books',exact:true})).toBeVisible()
 await card.scrollIntoViewIfNeeded()
 const layout=await page.evaluate(()=>{
  const card=document.querySelector('#download-app')!.getBoundingClientRect()
  const quick=document.querySelector('[data-mobile-home-actions]')!.getBoundingClientRect()
  const books=document.querySelector('[aria-label="Books"]')!.getBoundingClientRect()
  const footer=document.querySelector('footer')!.getBoundingClientRect()
  return {before:card.top-(innerWidth<900?quick.bottom:books.bottom),after:footer.top-card.bottom}
 })
 expect(layout.before).toBeCloseTo(width<900?24:32,0)
 expect(layout.after).toBeCloseTo(width<900?16:40,0)
 const field=card.getByRole('textbox',{name:'Email address',exact:true})
 const bounds=(await field.boundingBox())!,container=(await card.boundingBox())!
 expect(bounds.x).toBeGreaterThanOrEqual(container.x)
 expect(bounds.x+bounds.width).toBeLessThanOrEqual(container.x+container.width)
 const email=`home-cleanup-${width}@fixture.example`
 for(let attempt=0;attempt<2;attempt++){
  await card.getByRole('textbox',{name:'Email address',exact:true}).fill(attempt===0?`  ${email.toUpperCase()} `:email)
  await card.getByRole('button',{name:'Remind Me',exact:true}).click()
  await expect(card.getByRole('status')).toContainText('You’re on the list')
  if(attempt===0)await page.reload()
 }
 const rows=await(await request.get(`${backend}/rest/v1/email_preferences?email=eq.${email}`)).json()
 expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({purpose:'app_launch',subscribed:true,user_id:null,consent_version:'app-launch-v1'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 const books=page.getByRole('region',{name:'Books',exact:true})
 await books.scrollIntoViewIfNeeded()
 const cover=books.locator('img').first();await expect(cover).toBeVisible()
 expect(await cover.evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain')
 expect(await cover.evaluate(el=>{const box=el.parentElement!.getBoundingClientRect();return Math.abs(box.width/box.height-2/3)<.01})).toBe(true)
 await page.screenshot({path:`docs/validation/app-reminder/guest-${width}.png`,fullPage:true})
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
 await expect(page.getByRole('heading',{name:/Good (morning|afternoon|evening)/})).toBeVisible()
 await expect(page.locator('#download-app')).toHaveCount(0)
})
