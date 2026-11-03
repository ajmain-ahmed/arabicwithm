import {test,expect,type BrowserContext,type Locator,type Page} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext,premium=true){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'audio@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
async function play(player:Locator){
 await player.getByRole('button',{name:'Play Audio',exact:true}).click()
 const audio=player.locator('audio');await expect(audio).toHaveCount(1)
 await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>!el.paused&&el.currentTime>0&&el.readyState>=2)).toBe(true)
 return audio
}
async function choose(page:Page,label:string,value:string){await page.getByLabel(label,{exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click()}
for(const width of [320,390,1440])test(`audiobook actual playback, languages, seek, chapters and return at ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/audiobook-audit`);await signIn(context);await page.setViewportSize({width,height:1000})
 await page.goto('/books');await page.getByRole('button',{name:'Listen',exact:true}).click()
 await page.getByRole('region',{name:'Audiobook library'}).getByRole('link').first().click()
 await expect(page).toHaveURL(/\/listen\/test-book$/)
 const player=page.getByRole('region',{name:'Audiobook player'}),audio=await play(player)
 await audio.evaluate(el=>el.setAttribute('data-owned-media','one'))
 await expect(audio).toHaveAttribute('src',/\/ar\/chapter-1.wav/)
 await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.duration)).toBe(60)
 await player.getByRole('button',{name:'Pause Audio',exact:true}).click()
 const paused=await audio.evaluate((el:HTMLAudioElement)=>el.currentTime)
 await page.waitForTimeout(250);expect(await audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeCloseTo(paused,1)
 await play(player);await expect(audio).toHaveAttribute('data-owned-media','one');expect(await audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThanOrEqual(paused)
 await player.getByRole('button',{name:'Pause Audio',exact:true}).click()
 const slider=player.getByRole('slider',{name:'Audiobook position'}),box=(await player.locator('.MuiSlider-root').boundingBox())!
 const point=(fraction:number)=>({x:box.x+box.width*fraction,y:box.y+box.height/2})
 for(const fraction of [.7,.2]){const p=point(fraction);await page.mouse.click(p.x,p.y);await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(5);expect(Math.abs((await audio.evaluate((el:HTMLAudioElement)=>el.currentTime))-60*fraction)).toBeLessThan(3)}
 const cdp=await context.newCDPSession(page),from=point(.2),to=point(.55)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]})
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/8,y:to.y}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(25)
 await play(player);const old=await audio.elementHandle()
 await choose(page,'Audio language','English');await expect(audio).toHaveCount(0);expect(await old!.evaluate((el:HTMLAudioElement)=>el.paused)).toBe(true)
 await play(player);await expect(audio).toHaveAttribute('src',/\/en\/chapter-1.wav/)
 const english=await audio.elementHandle();await player.getByRole('button',{name:'Next chapter',exact:true}).click()
 await expect(player).toContainText('Chapter 6 · Sixth Chapter');expect(await english!.evaluate((el:HTMLAudioElement)=>el.paused)).toBe(true)
 await expect(slider).toHaveValue('0');await play(player);await expect(audio).toHaveAttribute('src',/\/en\/chapter-2.wav/);await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.duration)).toBe(45)
 const second=await audio.elementHandle();await player.getByRole('button',{name:'Previous chapter',exact:true}).click();expect(await second!.evaluate((el:HTMLAudioElement)=>el.paused)).toBe(true)
 await expect(player).toContainText('Chapter 1 · First Chapter');await choose(page,'Chapter','6. Sixth Chapter');await expect(player).toContainText('Chapter 6 · Sixth Chapter')
 await play(player);await audio.evaluate(el=>el.setAttribute('data-return-media','same'))
 const other=await context.newPage();await other.goto('/');await other.bringToFront();await page.bringToFront();await other.close()
 await expect(audio).toHaveAttribute('data-return-media','same');await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/audit-listen-${width}.png`,fullPage:true})
 const departing=await audio.elementHandle();await player.getByRole('link',{name:'Read This Chapter'}).click();await expect(page.locator('audio')).toHaveCount(0);expect(await departing!.evaluate((el:HTMLAudioElement)=>el.paused)).toBe(true)
})
for(const format of ['bucket','full','external'])test(`audiobook canonical ${format} source decodes and plays in both languages`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/audiobook-audit`,{data:{format}});await signIn(context);await page.goto('/listen/test-book')
 const player=page.getByRole('region',{name:'Audiobook player'})
 for(const language of ['Arabic','English']){if(language==='English')await choose(page,'Audio language',language);const audio=await play(player);await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>Number.isFinite(el.duration))).toBe(true)}
})
test('existing YouTube audiobook references retain one active player',async({page,context,request})=>{
 await request.post(`${backend}/fixture/audiobook-audit`,{data:{format:'youtube'}});await installYouTubeFixture(page);await signIn(context);await page.goto('/listen/test-book')
 const player=page.getByRole('region',{name:'Audiobook player'});await player.getByRole('button',{name:'Play Audio',exact:true}).click();await expect(player.locator('iframe')).toHaveCount(1)
 await choose(page,'Audio language','English');await expect(player.locator('iframe')).toHaveCount(0);await player.getByRole('button',{name:'Play Audio',exact:true}).click();await expect(player.locator('iframe')).toHaveCount(1)
 expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{destroyed?:boolean;playing?:boolean}[]}).__ytPlayers[0])).toMatchObject({destroyed:true,playing:false})
})
test('free listeners discover audio but cannot obtain playback',async({page,context,request})=>{
 await request.post(`${backend}/fixture/audiobook-audit`);await signIn(context,false);await page.goto('/books?mode=listen');await page.getByRole('region',{name:'Audiobook library'}).getByRole('link').first().click()
 await page.getByRole('button',{name:'Play Audio',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('AWM+');await expect(page.locator('audio, iframe')).toHaveCount(0)
})
