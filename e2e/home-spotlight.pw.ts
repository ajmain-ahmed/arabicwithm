import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function account(context:BrowserContext,premium=false){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,email:'synthetic@fixture.example',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}
 await context.addCookies([{name:'sb-localhost-auth-token',domain:'127.0.0.1',path:'/',value:`base64-${encode({access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,exp:expires,role:'authenticated'})}.fixture-signature`,refresh_token:'fixture-refresh',expires_at:expires,token_type:'bearer',user})}`}])
}
for(const width of [320,390,768,1024,1440])test(`one public Arabic Spotlight at ${width}`,async({page,request,context})=>{
 await request.post(`${backend}/fixture/spotlight`);await request.post(`${backend}/fixture/for-you-allowance`,{data:{remainingMs:900000}})
 if(width===390)await account(context)
 if(width===1024)await account(context,true)
 await installYouTubeFixture(page);await page.addInitScript(()=>{(window as unknown as {__ytRejectAudible:boolean}).__ytRejectAudible=true})
 await page.setViewportSize({width,height:1000});await page.goto('/')
 const section=page.locator('[data-home-spotlight]'),clip=section.locator('[data-spotlight-video]')
 await expect(clip).toHaveCount(1);await expect(section.getByRole('button',{name:'Pause',exact:true})).toBeEnabled()
 expect(Number((await clip.getAttribute('data-spotlight-video'))!.at(-1))).toBeLessThan(4)
 await expect(section.getByRole('button',{name:'Unmute',exact:true})).toBeVisible()
 const headings=await page.getByRole('heading',{level:2}).allTextContents()
 expect(headings.indexOf('Latest Episodes')).toBeLessThan(headings.indexOf('For You Spotlight'));expect(headings.indexOf('For You Spotlight')).toBeLessThan(headings.indexOf('Shows'))
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Next video',exact:true})).toHaveCount(0)
 await expect(section.locator('[data-spotlight-subtitle]')).toContainText('First Arabic subtitle')
 await section.getByRole('button',{name:'Pause',exact:true}).click();await expect(page).toHaveURL(/\/$/)
 await section.getByRole('button',{name:'Play',exact:true}).click()
 const native=clip.frameLocator('iframe')
 await native.getByRole('button',{name:'Native play/pause fixture'}).click();await expect(page).toHaveURL(/\/$/)
 await native.getByRole('button',{name:'Native play/pause fixture'}).click()
 await native.getByRole('slider',{name:'Native timeline fixture'}).click({position:{x:8,y:14}});await expect(page).toHaveURL(/\/$/)
 await native.getByRole('slider',{name:'Native timeline fixture'}).fill('16');await expect(page).toHaveURL(/\/$/)

 await page.evaluate(()=>{(window as unknown as {__ytTime:(time:number,state:number)=>void}).__ytTime(16,1)})
 await expect(section.locator('[data-spotlight-subtitle]')).toContainText('Second Arabic subtitle')
 if(width===1440){
  const count=await page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)
  await page.evaluate(()=>{(window as unknown as {__ytRejectAudible:boolean}).__ytRejectAudible=false})
  await section.getByRole('button',{name:'Unmute',exact:true}).click();await section.getByRole('button',{name:'Mute',exact:true}).click()
  await expect(section.locator('[data-spotlight-subtitle]')).toContainText('Second Arabic subtitle')
  expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)).toBe(count)
 }
 await page.screenshot({path:`test-results/integrated-main-home-${width}.png`,fullPage:true})
 await section.screenshot({path:`artifacts/home-for-you-spotlight/spotlight-${width}.png`})
 const selected=await clip.getAttribute('data-spotlight-video')
 await page.getByRole('button',{name:/Switch to .* mode/}).first().click();await expect(clip).toHaveAttribute('data-spotlight-video',selected!)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const log=await (await request.get(`${backend}/fixture/request-log`)).json();expect(log.rpc.filter((rpc:string)=>rpc==='website_for_you_usage')).toHaveLength(0)
 const player=await clip.locator('iframe').boundingBox();expect(player!.width).toBeLessThanOrEqual(width)
 const videoLink=section.getByRole('link',{name:'Open For You from video preview',exact:true}),cta=section.getByRole('link',{name:'Go to For You',exact:true})
 expect(await videoLink.getAttribute('href')).toBe(await cta.getAttribute('href'))
 await (width===390||width===768?cta:videoLink).click();await expect(page).toHaveURL(/\/explore\?view=foryou$/)
 if(width!==390&&width!==1024){
  await expect(page.getByRole('dialog').getByText('Sign in to explore For You',{exact:true})).toBeVisible()
  await expect(page.locator('[data-for-you-source]')).toHaveCount(0)
 }else{await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('[data-for-you-source]')).toHaveCount(1)}
})
test('refresh rerolls while re-rendering preserves the clip',async({page,request})=>{
 await request.post(`${backend}/fixture/spotlight`);await installYouTubeFixture(page);await page.goto('/')
 const clips=new Set<string>();for(let i=0;i<8;i++){await expect(page.locator('[data-spotlight-video]')).toHaveCount(1);clips.add((await page.locator('[data-spotlight-video]').getAttribute('data-spotlight-video'))!);if(clips.size>1)break;await page.reload()}
 expect(clips.size).toBeGreaterThan(1)
})
test('desktop language filter, default view, explicit Explore and history',async({page,request,context})=>{
 await request.post(`${backend}/fixture/spotlight`);await account(context,true);await installYouTubeFixture(page);await page.setViewportSize({width:1440,height:1000});await page.goto('/explore')
 const language=page.getByRole('group',{name:'Source video language'});await expect(language.getByRole('button',{name:'AR',exact:true})).toHaveAttribute('aria-pressed','true')
 const source=page.locator('[data-for-you-source]');await expect(source).toHaveCount(1);expect(Number((await source.getAttribute('data-for-you-source'))!.at(-1))).toBeLessThan(4)
 await language.getByRole('button',{name:'EN',exact:true}).click();await expect.poll(async()=>Number((await source.getAttribute('data-for-you-source'))?.at(-1))).toBeGreaterThanOrEqual(4)
 await page.screenshot({path:'artifacts/home-for-you-spotlight/for-you-en-desktop.png'})
 await language.getByRole('button',{name:'AR',exact:true}).click();await expect.poll(async()=>Number((await source.getAttribute('data-for-you-source'))?.at(-1))).toBeLessThan(4)
 await page.getByRole('button',{name:'Explore feed',exact:true}).locator('visible=true').click();await expect(page).toHaveURL(/view=explore/)
 await page.goBack();await expect(language.getByRole('button',{name:'AR',exact:true})).toBeVisible()
 await page.goto('/explore?tab=explore');await expect(page.getByRole('button',{name:'Explore feed',exact:true}).locator('visible=true')).toHaveAttribute('aria-pressed','true')
})
test('empty English pool never falls back to Arabic',async({page,request,context})=>{
 await request.post(`${backend}/fixture/spotlight`,{data:{english:false}});await account(context,true);await installYouTubeFixture(page);await page.setViewportSize({width:1440,height:1000});await page.goto('/explore')
 await page.getByRole('group',{name:'Source video language'}).getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByText('No more clips available.',{exact:true})).toBeVisible();await expect(page.locator('[data-for-you-source]')).toHaveCount(0)
})

for(const confirmationRequired of [false,true])test(`teaser registration returns to For You; confirmation ${confirmationRequired}`,async({page,request})=>{
 await request.post(`${backend}/fixture/spotlight`);await request.post(`${backend}/fixture/for-you-allowance`,{data:{remainingMs:900000}});await request.post(`${backend}/fixture/registration`,{data:{confirmationRequired,profileDelay:0}})
 await installYouTubeFixture(page);await page.setViewportSize({width:390,height:1000});await page.goto('/')
 const section=page.locator('[data-home-spotlight]');await expect(section.locator('[data-spotlight-video] iframe')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
 await section.getByRole('link',{name:'Open For You from video preview'}).click()
 await expect(page.getByRole('dialog').getByText('Sign in to explore For You',{exact:true})).toBeVisible();await expect(page.locator('[data-for-you-source]')).toHaveCount(0)
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Register',exact:true}).click()
 const email=`spotlight-${confirmationRequired}-${Date.now()}@example.test`,password='fixture-password-123'
 await dialog.getByRole('textbox',{name:'Email address',exact:true}).fill(email);await dialog.getByLabel('Password',{exact:true}).fill(password)
 const signup=page.waitForRequest(req=>new URL(req.url()).pathname==='/auth/v1/signup')
 await dialog.getByRole('button',{name:'Create Account',exact:true}).click()
 const redirect=new URL((await signup).url()).searchParams.get('redirect_to');expect(redirect).toBe(`http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT??3000}/explore?view=foryou`)
 if(confirmationRequired){
  await expect(page.getByText('Check your inbox \u2014 verify your email before signing in.')).toBeVisible();await expect(page.locator('[data-for-you-source]')).toHaveCount(0)
  await request.post(`${backend}/fixture/registration`,{data:{confirmEmail:email}})
  await dialog.getByRole('textbox',{name:'Email address',exact:true}).fill(email);await dialog.getByLabel('Password',{exact:true}).fill(password)
  await dialog.getByRole('button',{name:'Sign In',exact:true}).last().click()
 }
 await expect(page).toHaveURL(/\/explore\?view=foryou$/);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
})
