import {test,expect,type BrowserContext,type Page} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function account(context:BrowserContext,premium=false){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,email:'synthetic@fixture.example',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}
 await context.addCookies([{name:'sb-localhost-auth-token',domain:'127.0.0.1',path:'/',value:`base64-${encode({access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,exp:expires,role:'authenticated'})}.fixture-signature`,refresh_token:'fixture-refresh',expires_at:expires,token_type:'bearer',user})}`}])
}

const quotaKey='awm-for-you-guest-playback-v1'
async function seedGuest(page:Page,used:number,advance=false){await page.addInitScript(({key,used,advance})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,String(used));(window as unknown as {__ytAdvanceClock:boolean}).__ytAdvanceClock=advance},{key:quotaKey,used,advance})}
async function used(page:Page){return page.evaluate(key=>Number(localStorage.getItem(key)??0),quotaKey)}
test.beforeEach(async({request})=>{await request.post(`${backend}/fixture/spotlight`);await request.post(`${backend}/fixture/for-you-allowance`,{data:{remainingMs:900000}})})
for(const width of [320,390,768,1024,1440])test(`centred native Spotlight and shared guest gateway at ${width}`,async({page,request,context})=>{
 if(width===390)await account(context);if(width===1024)await account(context,true)
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/')
 const section=page.locator('[data-home-spotlight]'),clip=section.locator('[data-spotlight-video]'),iframe=clip.locator('iframe')
 await expect(iframe).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
 const headings=await page.getByRole('heading',{level:2}).allTextContents()
 expect(headings.indexOf('Latest Episodes')).toBeLessThan(headings.indexOf('For You Spotlight'));expect(headings.indexOf('For You Spotlight')).toBeLessThan(headings.indexOf('Shows'));expect(headings.indexOf('Shows')).toBeLessThan(headings.indexOf('Books'))
 expect(Number((await clip.getAttribute('data-spotlight-video'))!.at(-1))).toBeLessThan(4)
 await expect(section.getByRole('button',{name:/^(Play|Pause|Mute|Unmute|Replay)$/})).toHaveCount(0);await expect(section.locator('[data-spotlight-video-link]')).toHaveCount(0)
 const native=iframe.contentFrame();await native.getByRole('button',{name:'Native play/pause fixture'}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)).toBe(false)
 await native.getByRole('button',{name:'Native play/pause fixture'}).click();await native.getByRole('button',{name:'Volume',exact:true}).click();await native.getByRole('button',{name:'CC',exact:true}).click();await native.getByRole('button',{name:'Settings',exact:true}).click();await expect(page).toHaveURL(/\/$/)
 await native.getByRole('slider',{name:'Native timeline fixture'}).fill('16');await expect(section.locator('[data-spotlight-subtitle]')).toContainText('Second Arabic subtitle')
 const box=(await section.boundingBox())!,player=(await clip.boundingBox())!,subtitle=(await section.locator('[data-spotlight-subtitle]').boundingBox())!
 expect(player.x+player.width/2).toBeCloseTo(box.x+box.width/2,0);expect(player.width/player.height).toBeCloseTo(16/9,1)
 if(width>=1024){expect(player.width/box.width).toBeGreaterThan(.44);expect(player.width/box.width).toBeLessThan(.53);expect(subtitle.width).toBeGreaterThan(player.width)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/guest-spotlight-${width}.png`,fullPage:true})
 const log=await(await request.get(`${backend}/fixture/request-log`)).json();expect(log.rpc.filter((r:string)=>r==='website_for_you_usage')).toHaveLength(0)
 await section.getByRole('button',{name:'Watch More',exact:true}).click();await expect(page).toHaveURL(/view=foryou/);await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('guest progressing playback persists across Home, feed, clips, refresh, and excludes paused/Explore time',async({page,request})=>{
 await seedGuest(page,120000);await installYouTubeFixture(page);await page.goto('/')
 const iframe=page.locator('[data-spotlight-video] iframe');await expect(iframe).toBeVisible()
 await page.evaluate(()=>{(window as unknown as {__ytAdvanceClock:boolean}).__ytAdvanceClock=true});await expect.poll(()=>used(page)).toBeGreaterThan(120500)
 await iframe.contentFrame().getByRole('button',{name:'Native play/pause fixture'}).click();const paused=await used(page);await page.waitForTimeout(700);expect(await used(page)).toBe(paused)
 await page.getByRole('button',{name:'Watch More',exact:true}).click();await expect(page.locator('[data-for-you-source]')).toHaveCount(1)
 const before=await used(page);await page.getByRole('button',{name:'Next video',exact:true}).click();expect(await used(page)).toBeGreaterThanOrEqual(before)
 await page.reload();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();expect(await used(page)).toBeGreaterThanOrEqual(before);expect(await used(page)).toBeLessThan(before+1500)
 await page.getByRole('button',{name:'Explore feed',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-explore-player=active]:visible iframe')).toBeVisible()
 const explored=await used(page);await page.evaluate(()=>{(window as unknown as {__ytAdvanceClock:boolean}).__ytAdvanceClock=true});await page.waitForTimeout(600);expect(await used(page)).toBe(explored)
 const log=await(await request.get(`${backend}/fixture/request-log`)).json();expect(log.rpc.filter((r:string)=>r==='website_for_you_usage')).toHaveLength(0)
})
test('exhausted Home blocks player and further feed requests across refresh/navigation',async({page,request})=>{
 await seedGuest(page,299200,true);await installYouTubeFixture(page);await page.goto('/')
 await expect(page.locator('[data-home-spotlight] [data-guest-for-you-exhausted]')).toBeVisible();expect(await used(page)).toBe(300000);await expect(page.locator('[data-spotlight-video]')).toHaveCount(0)
 const count=async()=>((await(await request.get(`${backend}/fixture/request-log`)).json()).rpc as string[]).filter(r=>r==='transcript_for_you_groups').length
 const before=await count();await page.getByRole('button',{name:'Watch More',exact:true}).click();await expect(page.locator('[data-guest-for-you-exhausted]')).toBeVisible();await expect(page.locator('[data-for-you-source]')).toHaveCount(0)
 await page.reload();await expect(page.locator('[data-guest-for-you-exhausted]')).toBeVisible();expect(await count()).toBe(before)
 await page.goto('/');await expect(page.getByText('Want more For You?',{exact:true})).toBeVisible();expect(await count()).toBe(before)
})
test('reaching the guest limit inside full For You stops playback and opens existing Auth',async({page})=>{
 await seedGuest(page,299200,true);await installYouTubeFixture(page);await page.goto('/explore?view=foryou')
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('[data-for-you-source]')).toHaveCount(0);expect(await used(page)).toBe(300000)
})
for(const signedIn of [false,true])test(`Explore default, independent catalogue, For You language pools and history; signed in ${signedIn}`,async({page,context})=>{
 if(signedIn)await account(context,true);await installYouTubeFixture(page);await page.setViewportSize({width:1440,height:1000});await page.goto('/explore')
 await expect(page.locator('[data-explore-player=active]:visible iframe')).toBeVisible();await expect(page.locator('[data-for-you-source]')).toHaveCount(0);await expect(page.getByRole('group',{name:'Source video language'}).filter({visible:true})).toHaveCount(0)
 await page.getByRole('button',{name:'For You feed',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 const language=page.getByRole('group',{name:'Source video language'}).filter({visible:true}),source=page.locator('[data-for-you-source]');await expect(language.getByRole('button',{name:'AR',exact:true})).toHaveAttribute('aria-pressed','true')
 expect(Number((await source.getAttribute('data-for-you-source'))!.at(-1))).toBeLessThan(4)
 await language.getByRole('button',{name:'EN',exact:true}).click();await expect.poll(async()=>Number((await source.getAttribute('data-for-you-source'))?.at(-1))).toBeGreaterThanOrEqual(4)
 await page.goBack();await expect(page).toHaveURL(/\/explore$/);await expect(page.locator('[data-explore-player=active]:visible iframe')).toBeVisible();await page.goForward();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
})
test('empty EN never falls back to AR',async({page,request})=>{await request.post(`${backend}/fixture/spotlight`,{data:{english:false}});await installYouTubeFixture(page);await page.goto('/explore?view=foryou');await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await page.getByRole('group',{name:'Source video language'}).filter({visible:true}).getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByText('No more clips available.',{exact:true})).toBeVisible()})
test('fresh Homepage loads randomise while ordinary re-renders keep one clip',async({page})=>{
 await installYouTubeFixture(page);await page.goto('/');const clip=page.locator('[data-spotlight-video]');await expect(clip).toHaveCount(1);const first=await clip.getAttribute('data-spotlight-video');await page.getByRole('button',{name:/Switch to .* mode/}).first().click();await expect(clip).toHaveAttribute('data-spotlight-video',first!)
 const choices=new Set([first]);for(let i=0;i<6&&choices.size<2;i++){await page.reload();await expect(clip).toHaveCount(1);choices.add(await clip.getAttribute('data-spotlight-video'))}expect(choices.size).toBeGreaterThan(1)
})
test('native play at the clip boundary replays from the clip start',async({page})=>{
 await installYouTubeFixture(page);await page.goto('/');const iframe=page.locator('[data-spotlight-video] iframe');await expect(iframe).toBeVisible();await page.evaluate(()=>{(window as unknown as {__ytTime:(time:number,state:number)=>void}).__ytTime(30,1)});await iframe.contentFrame().getByRole('button',{name:'Native play/pause fixture'}).click();await expect(page.locator('[data-spotlight-subtitle]')).toContainText('First Arabic subtitle')
})
for(const confirmationRequired of [false,true])test(`exhausted guest registration restores account access to For You; confirmation ${confirmationRequired}`,async({page,request})=>{
 await request.post(`${backend}/fixture/spotlight`);await request.post(`${backend}/fixture/for-you-allowance`,{data:{remainingMs:900000}});await request.post(`${backend}/fixture/registration`,{data:{confirmationRequired,profileDelay:0}})
 await seedGuest(page,300000);await installYouTubeFixture(page);await page.setViewportSize({width:390,height:1000});await page.goto('/explore?view=foryou')
 await expect(page.locator('[data-guest-for-you-exhausted]')).toBeVisible();await page.getByRole('button',{name:'Sign up',exact:true}).click()
 const dialog=page.getByRole('dialog')
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
