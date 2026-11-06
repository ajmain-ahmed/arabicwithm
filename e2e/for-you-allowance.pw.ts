import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext,premium=false){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:premium?'premium@fixture.example':'free@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
test('the final playback seconds pause For You, retain the feed, and permit free Explore',async({page,context,request})=>{
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 await request.post(`${backend}/fixture/for-you-playback`);await request.post(`${backend}/fixture/for-you-allowance`,{data:{remainingMs:2000}})
 await signIn(context);await installYouTubeFixture(page);await page.setViewportSize({width:390,height:900});await page.goto('/explore?view=explore')
 await page.getByRole('button',{name:/^(For You feed|Explore)$/}).filter({visible:true}).click();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 const source=await page.locator('[data-for-you-source]').getAttribute('data-for-you-source')
 await expect(page.getByText('Unlock unlimited For You',{exact:true})).toHaveCount(0)
 await page.evaluate(()=>{(window as unknown as {__ytAdvanceClock:boolean}).__ytAdvanceClock=true})
 await expect(page.getByRole('dialog',{name:'Unlock unlimited For You'})).toBeVisible()
 expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)).toBe(false)
 await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source',source!)
 await page.getByRole('button',{name:'Continue on Explore',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('button',{name:/^(For You feed|Explore)$/}).filter({visible:true})).toBeVisible()
 await page.getByRole('button',{name:/^(For You feed|Explore)$/}).filter({visible:true}).click();await expect(page.getByRole('dialog',{name:'Unlock unlimited For You'})).toBeVisible()
 await expect(page.locator('[data-for-you-source] iframe')).toHaveCount(0)
 await page.reload();await expect(page.getByRole('dialog',{name:'Unlock unlimited For You'})).toBeVisible()
 expect(errors).toEqual([])
})
test('premium playback bypasses an exhausted daily budget without a limit prompt',async({page,context,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await request.post(`${backend}/fixture/for-you-allowance`,{data:{remainingMs:0}})
 await signIn(context,true);await installYouTubeFixture(page);await page.goto('/explore?view=explore');await page.getByRole('button',{name:/^(For You feed|Explore)$/}).filter({visible:true}).click()
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
})
for(const width of [390,1440])test(`autoplays when the browser blocks sound at ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`)
 await signIn(context,true);await installYouTubeFixture(page)
 await page.addInitScript('window.__ytRejectAudible=true')
 await page.setViewportSize({width,height:950});await page.goto('/explore?view=explore')
 await page.getByRole('button',{name:/^(For You feed|Explore)$/}).filter({visible:true}).click()
 await expect.poll(()=>page.evaluate(()=>{
  const p=(window as unknown as {__ytPlayers?:{playing:boolean;muted:boolean}[]}).__ytPlayers?.at(-1)
  return !!p?.playing&&p.muted
 })).toBe(true)
 if(width>=900)await expect(page.getByRole('button',{name:'Unmute clip',exact:true}).filter({visible:true})).toBeVisible()
 else {await expect(page.getByRole('button',{name:'Unmute clip',exact:true})).not.toBeVisible();await expect(page.locator('[data-for-you-source] iframe').contentFrame().getByRole('button',{name:'Volume',exact:true})).toBeVisible()}
 await expect(page.getByText('Tap the video to play with sound.')).toHaveCount(0)
 await page.getByRole('button',{name:'Next video',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>{
  const players=(window as unknown as {__ytPlayers:{playing:boolean;muted:boolean}[]}).__ytPlayers
  return players.length>1&&players.at(-1)!.playing&&players.at(-1)!.muted
 })).toBe(true)
})
