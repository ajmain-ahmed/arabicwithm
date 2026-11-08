import {test,expect,type BrowserContext,type Page} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend='https://localhost:4347'
async function account(context:BrowserContext,premium=true){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'audio@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
const noOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
for(const width of [320,390,430])test(`mobile one-line views, language, filter, history and spacing ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/spotlight`);await account(context);await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore')
 const tools=page.locator('[data-mobile-view-tools]:visible'),views=tools.locator('[data-mobile-view-toggle]'),language=tools.locator('[data-mobile-language-toggle]')
 await expect(views).toHaveText('Explore')
 await expect(language).toHaveCount(0)
 await views.click();await expect(page).toHaveURL(/\/explore\?view=foryou$/)
 const source=page.locator('[data-for-you-source]');await expect(source.locator('iframe')).toBeVisible()
 await expect(language).toHaveText('AR');await expect(language).toHaveAccessibleName('Arabic selected \u2014 switch For You to English')
 await language.click();await expect(language).toHaveText('EN');await expect(language).toHaveAccessibleName('English selected \u2014 switch For You to Arabic')
 await expect.poll(async()=>Number((await source.getAttribute('data-for-you-source'))?.at(-1))).toBeGreaterThanOrEqual(4)
 await language.click();await expect(language).toHaveText('AR');await expect.poll(async()=>Number((await source.getAttribute('data-for-you-source'))?.at(-1))).toBeLessThan(4)
 await language.click();await expect(language).toHaveText('EN')
 const toolbar=page.locator('[data-mobile-for-you-toolbar]');await expect(toolbar).toBeVisible();await expect(toolbar).toHaveCSS('flex-wrap','nowrap')
 const boxes=await toolbar.locator('button:visible').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().toJSON()))
 expect(boxes).toHaveLength(9)
 for(let i=0;i<boxes.length;i++){expect(boxes[i].height).toBeGreaterThanOrEqual(33.9);expect(boxes[i].width).toBeGreaterThanOrEqual(24);expect(Math.abs(boxes[i].y+boxes[i].height/2-boxes[0].y-boxes[0].height/2)).toBeLessThan(1);expect(boxes[i].right).toBeLessThanOrEqual(width-3.9);if(i)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].right)}
 await toolbar.getByRole('button',{name:'Filter content',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Stories',exact:true})).toBeVisible();await expect(page.getByRole('checkbox',{name:'Imports',exact:true})).not.toBeVisible();await page.getByRole('button',{name:'Apply',exact:true}).click()
 await expect(views).toHaveText('For You')
 const rate=toolbar.getByRole('button',{name:'Playback speed',exact:true})
 await expect(rate).toHaveText('1\u00d7');await source.frameLocator('iframe').getByRole('slider',{name:'Native timeline fixture'}).fill('20')
 await rate.click();await expect(rate).toHaveText('1.5\u00d7')
 expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{time:number;rate:number}[]}).__ytPlayers.at(-1))).toMatchObject({time:20,rate:1.5})
 await toolbar.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('switch',{name:'Tashk\u012bl',exact:true})).toBeVisible();await page.getByRole('button',{name:'Done',exact:true}).click()
 const modes=toolbar.getByRole('group',{name:'Viewing mode'});await modes.getByRole('button',{name:'Full',exact:true}).click();await expect(modes.getByRole('button',{name:'Full',exact:true})).toHaveAttribute('aria-pressed','true');await modes.getByRole('button',{name:'Short',exact:true}).click();await expect(modes.getByRole('button',{name:'Short',exact:true})).toHaveAttribute('aria-pressed','true')
 const before=await source.getAttribute('data-for-you-source');await toolbar.getByRole('button',{name:'Next video',exact:true}).click();await expect(source).not.toHaveAttribute('data-for-you-source',before!);await toolbar.getByRole('button',{name:'Previous video',exact:true}).click();await expect(source).toHaveAttribute('data-for-you-source',before!)

 await views.click();await expect(page).toHaveURL(/\/explore$/);await expect(language).toHaveCount(0)
 await page.goBack();await expect(language).toHaveText('EN');await page.goForward();await expect(views).toHaveText('Explore');await expect(language).toHaveCount(0)
 await views.click();await expect(language).toHaveText('EN');await expect(source.locator('iframe')).toBeVisible();await noOverflow(page)
 await toolbar.screenshot({path:`test-results/${test.info().project.name}-one-line-toolbar-bar-${width}.png`})
 await page.screenshot({path:`test-results/${test.info().project.name}-one-line-toolbar-${width}.png`,fullPage:true})
})

test('guest language toggles preserve allowance and explicit sound preference',async({page,request})=>{
 await request.post(`${backend}/fixture/spotlight`);await installYouTubeFixture(page)
 await page.addInitScript(()=>{localStorage.setItem('awm-for-you-guest-playback-v1','123000');localStorage.setItem('awm-explore-sound-enabled-v1','muted')})
 await page.goto('/explore?view=foryou');const language=page.locator('[data-mobile-language-toggle]:visible');await expect(language).toHaveText('AR');await language.click();await expect(language).toHaveText('EN');await language.click();await expect(language).toHaveText('AR')
 expect(await page.evaluate(()=>localStorage.getItem('awm-for-you-guest-playback-v1'))).toBe('123000');expect(await page.evaluate(()=>localStorage.getItem('awm-explore-sound-enabled-v1'))).toBe('muted')
 await expect(page.getByRole('dialog')).toHaveCount(0)
})

for(const width of [1024,1440])test(`desktop Explore and For You controls unchanged ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/spotlight`);await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore')
 await expect(page.locator('[data-mobile-view-tools]:visible')).toHaveCount(0);await expect(page.getByRole('button',{name:/Turn Explore sound on|Mute Explore video/})).toBeVisible()
 const choose=(name:string)=>page.getByRole('button',{name,exact:true}).filter({visible:true})
 await choose('For You feed').click();const source=page.locator('[data-for-you-source]');await expect(source.locator('iframe')).toBeVisible()
 const languages=page.getByRole('group',{name:'Source video language'}).filter({visible:true});await expect(languages.getByRole('button',{name:'AR',exact:true})).toBeVisible();await expect(languages.getByRole('button',{name:'EN',exact:true})).toBeVisible()
 expect((await choose('Explore feed').boundingBox())!.width).toBe(82);await expect(choose('Settings')).toBeVisible();await expect(page.getByRole('button',{name:/^Mute clip$|^Unmute clip$/}).filter({visible:true})).toBeVisible()
 await languages.getByRole('button',{name:'EN',exact:true}).click();await expect.poll(async()=>Number((await source.getAttribute('data-for-you-source'))?.at(-1))).toBeGreaterThanOrEqual(4)
 await expect(page.locator('[data-mobile-for-you-toolbar]:visible')).toHaveCount(0);await noOverflow(page)
})
for(const premium of [false,true])test(`mobile Home membership placement and Profile banner alignment premium=${premium}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/spotlight`);await account(context,premium);await installYouTubeFixture(page);await page.goto('/');await expect(page.getByRole('heading',{name:/Good /})).toBeVisible()
 const actions=page.locator('[data-mobile-home-actions]'),promo=page.locator('[data-awm-plus-placement=home]')
 await expect(promo).toBeVisible();expect((await promo.boundingBox())!.y).toBeGreaterThan((await actions.boundingBox())!.y+(await actions.boundingBox())!.height)
 if(premium)await expect(promo.getByText('Upgrade to AWM+',{exact:true})).toHaveCount(0);else await expect(promo.getByText('Upgrade to AWM+',{exact:true})).toBeVisible()
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111'
 await page.goto(`/profile/${id}`)
 for(const width of [320,390,430,1024,1440]){
  await page.setViewportSize({width,height:1000});const banner=page.locator('[data-profile-header]:visible'),app=page.locator('#download-app:visible');await expect(app).toBeVisible()
  const b=(await banner.boundingBox())!,a=(await app.boundingBox())!;expect(a.x).toBeCloseTo(b.x,1);expect(a.width).toBeCloseTo(b.width,1)
  const status=page.getByText(premium?'AWM+ subscription active':'Free account',{exact:true}).filter({visible:true});expect(a.y).toBeGreaterThan((await status.boundingBox())!.y)
  await expect(page.locator('[data-awm-plus-placement]')).toHaveCount(0);await noOverflow(page)
 }
})
for(const width of [1024,1280,1440])test(`desktop Books rounded toolbar ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/books')
 const search=page.getByRole('textbox',{name:'Search books'}),filter=page.getByRole('button',{name:'Filters',exact:true}),mode=page.getByRole('group',{name:'Library mode'})
 const s=(await search.locator('..').boundingBox())!,f=(await filter.boundingBox())!,m=(await mode.boundingBox())!
 expect(s.width).toBeGreaterThanOrEqual(300);expect(s.height).toBe(m.height);expect(f.height).toBe(m.height);expect(s.y).toBe(m.y);expect(f.y).toBe(m.y)
 await expect(search.locator('..')).toHaveCSS('border-radius','9999px');await expect(filter).toHaveCSS('border-radius','9999px')
 await expect(page.getByRole('button',{name:'Sign In',exact:true})).toBeVisible()
 await search.fill('Test Book');await expect(search).toHaveValue('Test Book');await filter.click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Done',exact:true}).click();await noOverflow(page)
})
for(const width of [320,768,1440])test(`real audiobook rates preserve position, chapter and navigation ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/audiobook-audit`);await account(context);await page.setViewportSize({width,height:1000});await page.goto('/listen/test-book')
 const player=page.getByRole('region',{name:'Audiobook player'}),audio=page.locator('audio')
 await player.getByRole('button',{name:'Play Audio',exact:true}).click();await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>!el.paused&&el.currentTime>0)).toBe(true)
 await audio.evaluate((el:HTMLAudioElement)=>{el.currentTime=12})
 for(const rate of [.75,1,1.25,1.5,1.75,2]){
  await page.getByRole('button',{name:/Audiobook playback speed:/}).click();await page.getByRole('menuitem',{name:`${rate}×`,exact:true}).click()
  await expect(audio).toHaveJSProperty('playbackRate',rate);await expect(audio).toHaveJSProperty('paused',false);expect(await audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThanOrEqual(12)
 }
 await player.getByRole('button',{name:'Pause Audio',exact:true}).click();const time=await audio.evaluate((el:HTMLAudioElement)=>el.currentTime)
 await page.getByRole('button',{name:/Audiobook playback speed:/}).click();await page.getByRole('menuitem',{name:'1.5×',exact:true}).click();await expect(audio).toHaveJSProperty('paused',true);await expect(audio).toHaveJSProperty('currentTime',time)
 await audio.evaluate((el:HTMLAudioElement)=>{el.currentTime=20});await expect(audio).toHaveJSProperty('playbackRate',1.5)
 await player.getByRole('button',{name:'Next chapter',exact:true}).click();await player.getByRole('button',{name:'Play Audio',exact:true}).click();await expect(audio).toHaveJSProperty('playbackRate',1.5)
 await player.getByRole('button',{name:'Previous chapter',exact:true}).click();await expect(player).toContainText('Chapter 1 · First Chapter');await player.getByRole('link',{name:'Read This Chapter'}).click();const trigger=page.locator('[data-reader-audio-trigger][aria-expanded]:visible');await expect(trigger).toHaveAttribute('aria-expanded','false');await trigger.click();await page.getByRole('button',{name:'Play audio',exact:true}).click();await expect(audio).toHaveJSProperty('playbackRate',1.5)
 await page.getByRole('button',{name:/Audiobook playback speed:/}).click();await page.getByRole('menuitem',{name:'1.25×',exact:true}).click();await expect(audio).toHaveJSProperty('playbackRate',1.25)
 await noOverflow(page)
})
