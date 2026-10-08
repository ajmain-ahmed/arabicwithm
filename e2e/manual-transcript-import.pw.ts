import {readFileSync} from 'node:fs'
import {test,expect,type BrowserContext} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function admin(context:BrowserContext){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
test.beforeEach(async({request,context,page})=>{await request.post(`${backend}/fixture/reset-overhaul`);await admin(context);await page.goto('/admin/transcripts');await page.getByRole('button',{name:'Add Transcript',exact:true}).first().click()})
for(const duration of ['', '10:57','1:10:57'])test(`start-only import succeeds with optional duration ${duration||'unknown'}`,async({page,request})=>{
 const dialog=page.getByRole('dialog'),source=[{text:'مرحبا 50% hello',start_ms:1234,tokens:{unusable:true}},{text:'[Music] ١٢ 😀',start_ms:2500}]
 await dialog.getByLabel('YouTube URL or video ID').fill('AWMFILE0001');await dialog.getByLabel('Video Title').fill('Source preserved');await dialog.getByLabel('Transcript JSON').fill(JSON.stringify(source))
 await expect(dialog.getByText('2 segments ready to import.')).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Video duration',exact:true})).not.toHaveAttribute('required','')
 if(duration)await dialog.getByRole('textbox',{name:'Video duration',exact:true}).fill(duration)
 await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(page.getByText('Transcript imported with unavailable enrichment. Original content is saved.',{exact:true})).toBeVisible()
 const saved=await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 expect(saved[0].raw_transcript.content[0]).toMatchObject({text:source[0].text,offset:1234,tokens:source[0].tokens})
 expect(saved[0].raw_transcript.content[1].duration).toBe(duration?duration==='10:57'?654500:4254500:null)
 await page.goto(`/transcripts/${saved[0].id}`);await expect(page.locator('p:visible').filter({hasText:source[0].text})).toBeVisible();await expect(page.locator('p:visible').filter({hasText:source[1].text})).toBeVisible();await expect(page.getByText(/Optional enrichment|Import database|diagnostic|token 1/)).toHaveCount(0)
})
test('keeps repeated timestamps and supports enrichment retry from saved source',async({page,request})=>{
 const source=JSON.parse(readFileSync('app/lib/fixtures/manual-awm-word-and-phrase.json','utf8')),dialog=page.getByRole('dialog')
 await dialog.getByLabel('YouTube URL or video ID').fill('AWMFILE0001');await dialog.getByLabel('Video Title').fill('Repeated source');await dialog.getByLabel('Transcript JSON').fill(JSON.stringify(source))
 await expect(dialog.getByText('4 segments ready to import.')).toBeVisible();await dialog.getByRole('button',{name:'Import',exact:true}).click()
 await expect(page.getByText(/Transcript imported with/)).toBeVisible()
 const before=await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 expect(before[0].raw_transcript.content.map((c:{offset:number})=>c.offset)).toEqual([1234,2500,2500,4567]);expect(before[0].raw_transcript.content[1].tokens).toEqual(source[1].tokens)
 await page.getByRole('button',{name:'Edit / Publish'}).click();await page.getByRole('button',{name:'Retry enrichment'}).click();await expect(page.getByRole('dialog').getByText('Optional enrichment: unavailable')).toBeVisible()
 const after=await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json();expect(after[0].raw_transcript).toEqual(before[0].raw_transcript)
})
test('blocks all genuine structural failures before writing and leaves the source editor intact',async({page,request})=>{
 const dialog=page.getByRole('dialog'),input=JSON.stringify([{text:'',start_ms:1000},{text:'Text',start_ms:0}])
 await dialog.getByLabel('YouTube URL or video ID').fill('AWMFILE0001');await dialog.getByLabel('Video Title').fill('Invalid structure');await dialog.getByLabel('Transcript JSON').fill(input)
 await expect(dialog.getByText(/Segment 1:[\s\S]*Segment 2:/)).toBeVisible();await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeDisabled();await expect(dialog.getByLabel('Transcript JSON')).toHaveValue(input)
 expect(await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()).toEqual([])
})
