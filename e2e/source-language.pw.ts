import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
import example from './source-language-data.json'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function admin(context:BrowserContext){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [320,375,390,430,1440])test(`English import/edit/public viewer, dictionary and Arabic regression ${width}`,async({page,request,context})=>{
 await request.post(`${backend}/fixture/reset-overhaul`);await admin(context);await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/admin/transcripts')
 await page.getByRole('button',{name:'Add Transcript',exact:true}).first().click();let dialog=page.getByRole('dialog')
 await expect(dialog.getByLabel('Original Audio Language')).toHaveValue('ar');await dialog.getByLabel('Original Audio Language').selectOption('en')
 await dialog.getByLabel('YouTube URL or video ID').fill('AWMFILE0001');await dialog.getByLabel('Video Title').fill('English source fire safety');await dialog.getByLabel('Transcript JSON').fill(JSON.stringify([example]));await dialog.getByLabel('Video duration',{exact:true}).fill('00:45')
 await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(dialog).not.toBeVisible()
 const rows=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json(),row=rows[0],before=JSON.stringify(row.raw_transcript.content)
 expect(row.raw_transcript.source_language).toBe('en');expect(row.raw_transcript.content[0].tokens).toEqual(example.tokens)
 await page.reload();await page.getByRole('button',{name:'Edit / Publish',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Original Audio Language')).toHaveValue('en')
 const json=await dialog.getByLabel('Transcript JSON').inputValue();await dialog.getByLabel('Original Audio Language').selectOption('ar');await dialog.getByRole('button',{name:'Save audio language only'}).click();await expect(page.getByText('Original audio language saved. JSON was not replaced.')).toBeVisible();await expect(dialog.getByLabel('Transcript JSON')).toHaveValue(json)
 const changed=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json();expect(changed[0].raw_transcript.source_language).toBe('ar');expect(JSON.stringify(changed[0].raw_transcript.content)).toBe(before)
 await page.goto(`/transcripts/${row.id}`);await expect(page.locator('[data-english-for-you]')).toHaveCount(0);await expect(page.getByText(example.translation,{exact:true})).toBeVisible()
 await page.goto('/admin/transcripts');await page.getByRole('button',{name:'Edit / Publish',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Original Audio Language')).toHaveValue('ar');await dialog.getByLabel('Original Audio Language').selectOption('en');await dialog.getByRole('button',{name:'Save audio language only'}).click();await expect(page.getByText('Original audio language saved. JSON was not replaced.')).toBeVisible()
 await context.clearCookies();await page.goto(`/transcripts/${row.id}`)
 const pairs=page.locator('[data-english-token]');await expect(pairs.locator('[lang=en]')).toHaveText(example.tokens.map(t=>t.english));await expect(pairs.locator('[lang=ar]')).toHaveText(example.tokens.map(t=>t.arabic));await expect(page.locator('[data-sentence-translation]')).toHaveText(example.translation)
 await expect(page.locator('[data-english-source]')).toHaveAttribute('dir','ltr');await expect(page.locator('[data-sentence-translation]')).toHaveAttribute('dir','rtl')
 for(let i=0;i<4;i++){const bounds=await pairs.nth(i).evaluate(el=>{const en=el.querySelector('[lang=en]')!.getBoundingClientRect(),ar=el.querySelector('[lang=ar]')!.getBoundingClientRect();return {en:en.toJSON(),ar:ar.toJSON()}});expect(bounds.ar.y).toBeGreaterThanOrEqual(bounds.en.bottom-.01);expect(bounds.en.x+bounds.en.width/2).toBeCloseTo(bounds.ar.x+bounds.ar.width/2,0)}
 await pairs.nth(2).click();await expect(page.getByText('a fire safety talk',{exact:true})).toHaveCount(2);await expect(page.getByText('A2',{exact:true})).toBeVisible();await page.keyboard.press('Escape')
 await expect(page.locator('iframe')).toBeVisible();await expect(page.getByRole('button',{name:'00:00',exact:true})).toBeEnabled();await page.getByRole('button',{name:'00:00',exact:true}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/source-language-${width}.png`,fullPage:true})
})
