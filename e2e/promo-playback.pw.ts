import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
import example from './english-for-you-data.json'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
const ids={free:'11111111-1111-4111-8111-111111111111',plus:'22222222-2222-4222-8222-222222222222'}
async function signIn(context:BrowserContext,kind:keyof typeof ids){const id=ids[kind],expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),user={id,aud:'authenticated',role:'authenticated',email:kind+'@fixture.example',app_metadata:{provider:'email'},user_metadata:{}},access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`;await context.addCookies([{name:'sb-localhost-auth-token',value:'base64-'+encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,token_type:'bearer',user}),domain:'127.0.0.1',path:'/',sameSite:'Lax'}])}
for(const width of [320,390,768,1024,1440])for(const kind of ['guest','free','plus','expired'] as const)test(`Promo location, entitlement and compact app ${kind} ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/expired-membership`,{data:{expired:kind==='expired'}});if(kind!=='guest')await signIn(context,kind==='expired'?'free':kind)
 await request.post(`${backend}/fixture/spotlight`);await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/')
 const promo=page.locator('#awm-plus-promo');await expect(promo).toBeVisible();await expect(page.locator('[data-awm-plus-placement=home]')).toHaveCount(1)
 expect(await promo.evaluate(el=>{const wrapper=el.closest('[data-awm-plus-placement]')!;return wrapper.previousElementSibling?.textContent?.includes('Books')})).toBe(true)
 await expect(page.locator('#download-app')).toHaveCount(0)
 const box=(await promo.boundingBox())!;expect(box.x+box.width/2).toBeCloseTo(width/2,0);expect(box.width).toBeLessThanOrEqual(1200);expect(box.x).toBeGreaterThanOrEqual(16)
 const heading=promo.getByRole('heading');expect(await heading.evaluate(el=>getComputedStyle(el).textAlign)).toBe('center')
 if(kind==='plus'){await expect(promo).toContainText('Your AWM+ membership is active.');await expect(promo).not.toContainText('Upgrade to AWM+');await expect(promo.getByRole('button',{name:'Manage membership',exact:true})).toBeVisible()}
 else await expect(promo.getByRole('heading',{name:'Upgrade to AWM+',exact:true})).toBeVisible()
 if(kind==='guest'){await promo.getByRole('button',{name:'Get AWM+',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible()}
 else {await page.goto(`/profile/${ids[kind==='expired'?'free':kind]}`);await expect(page.locator('[data-awm-plus-placement]')).toHaveCount(0);const app=page.locator('#download-app');await expect(app).toBeVisible();await expect(app.getByRole('heading',{name:'ArabicwithM on the go!',exact:true})).toBeVisible();const bounds=(await app.boundingBox())!;expect(bounds.x+bounds.width/2).toBeCloseTo(width/2,0);expect(bounds.width).toBeLessThanOrEqual(1200);if(width>=1024){expect(bounds.width).toBeLessThan(950);expect((await app.locator('img').boundingBox())!.width).toBeLessThanOrEqual(200)}await page.screenshot({path:`test-results/compact-app-${kind}-${width}.png`,fullPage:true})}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
for(const width of [320,390,768,1024,1440])test(`English native playing/paused/rapid seeking ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/english-for-you`,{data:{seek:true}});await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore?view=foryou');await page.getByRole('group',{name:'Source video language'}).filter({visible:true}).getByRole('button',{name:'EN',exact:true}).click()
 const area=page.locator(width<900?'[data-mobile-clip-transcript]':'[data-desktop-clip-transcript]'),active=area.locator('[data-active-segment=true]'),iframe=page.locator('[data-for-you-source] iframe'),source=await page.locator('[data-for-you-source]').getAttribute('data-for-you-source')
 await expect(active.locator('[data-english-token] [lang=en]').first()).toHaveText('Sentence 0')
 const native=iframe.contentFrame(),timeline=native.getByRole('slider',{name:'Native timeline fixture'}),toggle=native.getByRole('button',{name:'Native play/pause fixture'})
 async function assertAt(time:number){const position=Math.floor(time/15);await expect(active.locator('[data-english-token] [lang=en]').first()).toHaveText('Sentence '+position);await expect(active.locator('[data-english-token] [lang=ar]').first()).toHaveText(example.tokens[0].arabic+' '+position);await expect(active.locator('[data-sentence-translation]')).toHaveText(example.translation+' '+position)}
 await timeline.fill('20');await assertAt(20);await toggle.click();expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)).toBe(false)
 await timeline.fill('97');await assertAt(97);expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)).toBe(false)
 for(const time of [70,48,125,42,97,14,15,16,44,45,46]){await timeline.fill(String(time));await assertAt(time)}
 await timeline.fill('20');await timeline.fill('70');await timeline.fill('48');await timeline.fill('125');await assertAt(125)
 await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source',source!);expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{destroyed?:boolean}[]}).__ytPlayers.filter(p=>!p.destroyed).length)).toBe(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/english-seek-${width}.png`,fullPage:true})
})

test('natural playback still advances once at the short boundary',async({page,request})=>{
 await request.post(`${backend}/fixture/english-for-you`,{data:{seek:true}});await installYouTubeFixture(page);await page.setViewportSize({width:390,height:1000});await page.goto('/explore?view=foryou');await page.getByRole('group',{name:'Source video language'}).filter({visible:true}).getByRole('button',{name:'EN',exact:true}).click();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();const before=await page.locator('[data-for-you-source]').getAttribute('data-for-you-source')
 await page.evaluate(()=>{const w=window as unknown as {__ytTime:(t:number,s:number)=>void;__ytAdvanceClock:boolean};w.__ytTime(44.5,1);w.__ytAdvanceClock=true})
 await expect(page.locator('[data-for-you-source]')).not.toHaveAttribute('data-for-you-source',before!);expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{destroyed?:boolean}[]}).__ytPlayers.filter(p=>!p.destroyed).length)).toBe(1)
})
