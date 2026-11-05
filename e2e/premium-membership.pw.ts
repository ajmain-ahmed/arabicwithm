import {test,expect,type BrowserContext} from '@playwright/test'
const ids={user:'11111111-1111-4111-8111-111111111111',premium:'22222222-2222-4222-8222-222222222222',editor:'33333333-3333-4333-8333-333333333333',admin:'44444444-4444-4444-8444-444444444444'}
async function signIn(context:BrowserContext,role:keyof typeof ids){
 const id=ids[role],expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:`${role}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [320,1440])for(const role of ['user','premium','editor','admin'] as const)test(`${role} AWM Plus status at ${width}`,async({page,context})=>{
 await signIn(context,role);await page.setViewportSize({width,height:740});await page.goto('/books')
 if(width<900)await page.getByRole('button',{name:'Open menu',exact:true}).click()
 const active=role==='premium'||role==='admin'
 for(let i=0;i<(active?3:1);i++){
  await page.getByRole('button',{name:'AWM Plus',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:active?'AWM Plus':'Upgrade to AWM+',exact:true})
  await expect(dialog).toBeVisible()
  if(active){
   await expect(dialog).toContainText(role==='admin'?'Your AWM Plus access is active.':'Your AWM Plus membership is active.')
   expect(await dialog.getByRole('listitem').allTextContents()).toEqual(['Offline books','Audiobooks','Unlimited For You viewing','Unlimited Memory Practice'])
   await expect(dialog.getByRole('button',{name:/Upgrade|Subscribe|Choose Plan/})).toHaveCount(0)
   await expect(dialog.getByRole('progressbar')).toHaveCount(0)
   const bounds=(await dialog.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width)
   const profile=dialog.getByRole('button',{name:'Go to Profile',exact:true});await expect(profile).toBeInViewport()
   if(i<2){await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible()}
   else {await profile.click();await expect(page).toHaveURL(`/profile/${ids[role]}`);await expect(dialog).not.toBeVisible();if(width<900)await expect(page.getByRole('dialog',{name:'Site navigation',exact:true})).not.toBeVisible()}
  }else{
   await expect(dialog).not.toContainText('3.99')
   expect((await dialog.textContent())?.match(/\u00a34\.99/g)).toHaveLength(2)
   const upgrade=dialog.getByRole('button',{name:'Upgrade to AWM+',exact:true})
   await expect(upgrade).toBeVisible();await expect(upgrade).toHaveText('Upgrade to AWM+')
   await upgrade.scrollIntoViewIfNeeded()
   const bounds=(await upgrade.boundingBox())!
   expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width)
   expect(await upgrade.evaluate(el=>getComputedStyle(el,'::before').animationDuration)).toBe('3.6s')
   expect(await upgrade.evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('awmUpgradeSparkle')
   await upgrade.evaluate(el=>{for(const animation of el.getAnimations({subtree:true}))animation.currentTime=2600})
   expect((await upgrade.boundingBox())!.width).toBe(bounds.width)
   await expect(upgrade).toHaveText('Upgrade to AWM+')
   await page.emulateMedia({reducedMotion:'reduce'})
   expect(await upgrade.evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none')
   expect(await upgrade.evaluate(el=>getComputedStyle(el,'::after').animationName)).toBe('none')
   await expect(upgrade).toBeVisible()
   await expect(dialog.getByRole('button',{name:'Go to Profile',exact:true})).toHaveCount(0)
   await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible()
  }
 }
})
