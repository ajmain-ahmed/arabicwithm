import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function admin(context:BrowserContext){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

for(const width of [390,1440])test(`profile images persist at ${width}`,async({page,context})=>{
 await page.request.post(`${backend}/fixture/reset-overhaul`);await admin(context);await page.setViewportSize({width,height:1000});await page.goto('/')
 const header=page.locator('[data-home-profile]');await expect(header).toBeVisible();await expect(page.getByText(/Good morning|Good afternoon|Good evening/)).toHaveCount(0)
 await expect(header.locator('[data-profile-banner]')).toHaveAttribute('src','/homepage/profile-banner.png')
 await expect(header.getByText('XP',{exact:true})).toBeVisible()
 await page.screenshot({path:`test-results/profile-default-${width}.png`})
 await header.getByRole('button',{name:'Edit Profile',exact:true}).click()
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;c.getContext('2d')!.fillRect(0,0,100,100);return c.toDataURL('image/png').split(',')[1]})
 const image={name:'photo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}
 await page.getByLabel('Choose a banner', {exact:true}).setInputFiles(image)
 await expect(header.locator('[data-profile-banner]')).toHaveAttribute('src',/profile-media.*banner-/)
 await page.getByLabel('Choose a profile picture',{exact:true}).setInputFiles(image);await page.getByRole('button',{name:'Adjust photo',exact:true}).click();await page.getByRole('button',{name:'Save photo',exact:true}).click()
 await page.getByRole('button',{name:'Done',exact:true}).click();await page.reload()
 await expect(header.locator('[data-profile-banner]')).toHaveAttribute('src',/profile-media.*banner-/)
 await expect(header.locator('.MuiAvatar-img')).toHaveAttribute('src',/profile-media.*avatar-/)
 await expect(header.getByText('XP',{exact:true})).toBeVisible();await expect(header.getByText('AWM Plus',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/profile-header-${width}.png`})
})
for(const width of [320,390,1440])test(`Short Full preserves source and time at ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 const source=page.locator('[data-for-you-source]');await expect(source.locator('iframe')).toBeVisible();const id=await source.getAttribute('data-for-you-source')
 await page.evaluate(()=>{(window as unknown as {__ytTime:(t:number)=>void}).__ytTime(501)})
 await page.getByRole('button',{name:'Full',exact:true}).filter({visible:true}).click()
 await expect(source).toHaveAttribute('data-for-you-source',id!)
 await expect(page.locator('[data-clip-line]').filter({visible:true})).toHaveCount(1)
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{time:number}[]}).__ytPlayers.at(-1)!.time)).toBe(501)
 if(width<900){await page.locator('[data-mobile-clip-feed]').dispatchEvent('wheel',{deltaY:150});await expect(source).toHaveAttribute('data-for-you-source',id!)}
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.length)).toBeGreaterThan(1)
 await page.waitForTimeout(300)
 await page.evaluate(()=>{(window as unknown as {__ytTime:(t:number)=>void}).__ytTime(10)})
 await page.waitForTimeout(300)
 await page.getByRole('button',{name:'Short',exact:true}).filter({visible:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{time:number}[]}).__ytPlayers.at(-1)!.time)).toBe(495)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/mode-toolbar-${width}.png`})
})
for(const width of [390,1440])test(`unpublished unsaved Admin preview at ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/reset-overhaul`);await admin(context);await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/admin/transcripts');await page.getByRole('button',{name:'Add Transcript',exact:true}).first().click()
 const editor=page.getByRole('dialog');await editor.getByLabel('YouTube URL or video ID').fill('abcdefghij0');await editor.getByLabel('Video Title').fill('Private preview')
 await editor.getByLabel('Transcript JSON').fill(JSON.stringify({content:[{text:'\u0643\u062a\u0627\u0628',offset:10000,duration:15000,english:'First',tokens:[{arabic:'\u0643\u062a\u0627\u0628',english:'book'}]},{text:'\u0642\u0644\u0645',offset:25000,duration:15000,english:'Second'},{text:'\u0628\u064a\u062a',offset:70000,duration:10000,english:'Third'}]}))
 await editor.getByLabel('Publish to searchable transcript library').uncheck();await editor.getByLabel('Publish to For You').uncheck()
 const before=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 await editor.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByText('Preview Mode',{exact:true})).toBeVisible();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 await page.getByRole('button',{name:'Full',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-clip-line]').filter({visible:true})).toHaveCount(1)
 await page.getByRole('button',{name:'Back to Edit',exact:true}).click();await expect(editor.getByLabel('Video Title')).toHaveValue('Private preview');await expect(editor.getByLabel('Publish to For You')).not.toBeChecked()
 expect(await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()).toEqual(before)
 await editor.getByRole('button',{name:'Cancel',exact:true}).click()
 await request.post(`${backend}/fixture/standalone-transcripts`);await page.reload();await page.getByRole('button',{name:'Edit / Publish',exact:true}).first().click()
 await expect(editor.getByLabel('Transcript JSON')).not.toHaveValue('')
 await editor.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByText('Preview Mode',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Full',exact:true}).filter({visible:true}).click();await expect(page.locator('[data-clip-line]').filter({visible:true})).toHaveCount(1)
 await page.screenshot({path:`test-results/admin-preview-${width}.png`})
})
