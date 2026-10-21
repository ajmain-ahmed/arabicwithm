import {test,expect,type Page,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture as youtube} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function premium(context:BrowserContext){
 const id='22222222-2222-4222-8222-222222222222',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'premium@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{full_name:'Premium learner'}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

async function time(page:Page,seconds:number,state=2){await page.evaluate(({seconds,state})=>(window as unknown as {__ytTime:(seconds:number,state:number)=>void}).__ytTime(seconds,state),{seconds,state})}
for(const width of [390,1440]){
 test(`restores historical hero and QR app section at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/')
  const hero=page.locator('[data-home-hero]');expect((await hero.boundingBox())!.height).toBeGreaterThanOrEqual(width>=900?610:520)
  expect(await hero.evaluate(el=>getComputedStyle(el).backgroundPosition)).toBe('50% 50%')
  const app=page.locator('#download-app');await expect(app.getByRole('img',{name:'QR code placeholder'})).toBeVisible()
  await expect(app.getByRole('img',{name:'ArabicWithM mobile app home screen'})).toBeVisible()
  await expect(app.getByLabel('Email address')).toHaveCount(0)
  await expect(app.getByRole('link',{name:/App Store/})).toBeVisible();await expect(app.getByRole('link',{name:/Google Play/})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await hero.screenshot({path:`test-results/restored-hero-${width}.png`});await app.screenshot({path:`test-results/restored-app-${width}.png`})
 })
 test(`playback, seeking, replay and compact Settings at ${width}`,async({page,request})=>{
  await request.post(`${backend}/fixture/for-you-playback`);await youtube(page);await page.setViewportSize({width,height:1000});await page.goto('/explore')
  await page.getByRole('button',{name:'For You feed',exact:true}).click()
  await expect(page.getByText('Opening sentence',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Mute',exact:true})).toHaveCount(0)
  const settings=page.getByRole('button',{name:'Settings',exact:true});const frame=page.locator('[data-for-you-source] iframe')
  if(width>=900){const [s,f]=await Promise.all([settings.boundingBox(),frame.boundingBox()]);expect(s!.x).toBeGreaterThan(f!.x+f!.width);expect(s!.y).toBeLessThan(f!.y+f!.height)}
  await settings.click();await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible()
  const panel=page.getByRole('heading',{name:'Settings',exact:true}).locator('..');const bounds=await panel.boundingBox();expect(bounds!.width).toBeLessThan(330);expect(bounds!.height).toBeLessThan(300)
  await panel.getByRole('button',{name:'Done',exact:true}).click()
  await time(page,500.5);await expect(page.locator('[data-active-token=true]')).toHaveText('جَدِيدٌnew')
  await time(page,510);await expect(page.getByText('Later sentence',{exact:true})).toBeVisible()
  await time(page,375);await expect(page.getByText('Earlier sentence',{exact:true})).toBeVisible()
  await time(page,522);await page.getByRole('button',{name:'Replay clip',exact:true}).click()
  await expect(page.getByText('Opening sentence',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{time:number}[]}).__ytPlayers.at(-1)!.time)).toBe(495)
  await time(page,522);await time(page,0,1);await expect(page.getByText('Opening sentence',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Replay clip',exact:true})).toHaveCount(0)
  expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{time:number}[]}).__ytPlayers.at(-1)!.time)).toBe(495)
  await page.screenshot({path:`test-results/for-you-corrections-${width}.png`,fullPage:true})
 })
}
test('gem belongs inside the hero AWM Plus control, never beside the profile',async({page,context})=>{
 await premium(context);await page.goto('/')
 const hero=page.locator('[data-home-hero]');await expect(hero.getByRole('button',{name:'AWM+',exact:true}).getByTestId('DiamondOutlinedIcon')).toBeVisible()
 await expect(page.getByRole('img',{name:'AWM Plus member'})).toHaveCount(0)
})
test('alternate-mode bubble points at the alternate button, dismisses and expires',async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await youtube(page);await page.setViewportSize({width:1440,height:1000});await page.goto('/explore')
 const hint=page.getByRole('note');await expect(hint).toBeVisible()
 const [note,button]=await Promise.all([hint.boundingBox(),page.getByRole('button',{name:'For You feed',exact:true}).boundingBox()]);expect(note!.x).toBeGreaterThan(button!.x+button!.width);expect(Math.abs(note!.y-button!.y)).toBeLessThan(2)
 await page.getByRole('button',{name:'Dismiss navigation hint'}).click();await expect(hint).not.toBeVisible()
 await page.getByRole('button',{name:'For You feed',exact:true}).click();await expect(page.getByRole('note').getByText('Click here to return to Explore')).toBeVisible()
 const [returnHint,alternate]=await Promise.all([page.getByRole('note').boundingBox(),page.getByRole('button',{name:'Explore feed',exact:true}).boundingBox()]);expect(Math.abs(returnHint!.y-alternate!.y)).toBeLessThan(2)
 await expect(page.getByRole('note')).not.toBeVisible({timeout:5500})
})
test('embed-restricted source is skipped and stays excluded after reload',async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await youtube(page);await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source','abcdefghij0')
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 await page.evaluate(()=>(window as unknown as {__ytError:(code:number)=>void}).__ytError(150))
 await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source','abcdefghij1')
 await page.reload();await page.getByRole('button',{name:'For You feed',exact:true}).click()
 await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source','abcdefghij1')
})
test.describe('pointer library hover',()=>{
 test.use({hasTouch:false})
 test('enlarges cover with no grid movement, preserves ratio and reduced-motion static glow',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/books')
  const card=page.getByRole('region',{name:'Book library',exact:true}).getByRole('link').first()
  const before=await card.boundingBox();const base=await card.evaluate(el=>({width:(el as HTMLElement).offsetWidth,height:(el as HTMLElement).offsetHeight,top:(el as HTMLElement).offsetTop}))
  expect(base.width).toBeGreaterThanOrEqual(200)
  await card.hover();await expect.poll(()=>card.evaluate(el=>getComputedStyle(el).transform)).not.toBe('none')
  await expect.poll(async()=> (await card.boundingBox())!.width).toBeGreaterThan(before!.width*1.02)
  expect(await card.evaluate(el=>({width:(el as HTMLElement).offsetWidth,height:(el as HTMLElement).offsetHeight,top:(el as HTMLElement).offsetTop}))).toEqual(base)
  expect(await card.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none')
  await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>card.evaluate(el=>getComputedStyle(el).transform)).toBe('none')
  expect(await card.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none')
  await page.screenshot({path:'test-results/library-corrections.png',fullPage:true})
 })
})
