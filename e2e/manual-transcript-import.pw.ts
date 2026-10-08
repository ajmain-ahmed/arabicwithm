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
for(const [duration,end] of [['10:57',657000],['1:10:57',4257000]] as const){
 test(`start-only 98 blocks require a clear duration then import with ${duration}`,async({page,request})=>{
  const dialog=page.getByRole('dialog'),blocks=Array.from({length:98},(_,index)=>({tokens:[{pos:'noun',cefr:'A1',arabic:'\u0645\u0631\u062d\u0628\u0627',english:'hello',headword:'\u0645\u0631\u062d\u0628\u0627',entry_type:'word',transliteration:'marhaba'}],start_ms:index*6500,translation:'Hello',paragraph:1}))
  await dialog.getByLabel('YouTube URL or video ID').fill('AWMTEST0001');await dialog.getByLabel('Video Title').fill('Manual timing test');await dialog.getByLabel('Transcript JSON').fill(JSON.stringify(blocks))
  await expect(dialog.getByText(/This transcript uses start-only timestamps/)).toBeVisible();await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeDisabled();await expect(dialog.getByRole('textbox',{name:'Video duration',exact:true})).toHaveAttribute('required','')
  await dialog.getByRole('textbox',{name:'Video duration',exact:true}).fill(duration);await expect(dialog.getByText('98 segments ready to import.')).toBeVisible();await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(page.getByText('Transcript imported.',{exact:true})).toBeVisible()
  await page.reload();await expect(page.getByRole('heading',{name:'Manual timing test'})).toBeVisible()
  const saved=await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json();expect(saved[0].canonical_url).toBe('https://www.youtube.com/watch?v=AWMTEST0001');expect(saved[0].raw_transcript.content[97]).toMatchObject({offset:630500,duration:end-630500,paragraph:1,tokens:blocks[97].tokens})
 })
}
test('fully timed JSON leaves duration optional and validates URL and clock time before Import',async({page})=>{
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Video Title').fill('Complete timing');await dialog.getByLabel('YouTube URL or video ID').fill('bad-id');await dialog.getByLabel('Transcript JSON').fill(JSON.stringify([{arabic:'\u0645\u0631\u062d\u0628\u0627',start_ms:1000,end_ms:5000}]))
 await expect(dialog.getByText('Enter a YouTube URL or video ID.',{exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeDisabled()
 await dialog.getByLabel('YouTube URL or video ID').fill('https://www.youtube.com/shorts/ZBynl03Vp-w');await expect(dialog.getByText('1 segment ready to import.')).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Video duration',exact:true})).not.toHaveAttribute('required','')
 await dialog.getByRole('textbox',{name:'Video duration',exact:true}).fill('657');await expect(dialog.getByText(/Enter a time as MM:SS or HH:MM:SS/)).toBeVisible();await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeDisabled()
 await dialog.getByRole('textbox',{name:'Video duration',exact:true}).fill('');await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(page.getByText('Transcript imported.',{exact:true})).toBeVisible()
})
test('human-readable duration inside JSON needs no duration field',async({page,request})=>{
 const dialog=page.getByRole('dialog');await dialog.getByLabel('YouTube URL or video ID').fill('https://youtu.be/ZBynl03Vp-w');await dialog.getByLabel('Video Title').fill('JSON duration');await dialog.getByLabel('Transcript JSON').fill(JSON.stringify({duration:'10:57',segments:[{arabic:'\u0645\u0631\u062d\u0628\u0627',start_ms:630000}]}))
 await expect(dialog.getByText('1 segment ready to import.')).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Video duration',exact:true})).toHaveValue('');await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(page.getByText('Transcript imported.',{exact:true})).toBeVisible()
 const saved=await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json();expect(saved[0].raw_transcript.content[0]).toMatchObject({offset:630000,duration:27000})
})

test('imports enriched AWM words and phrases ungrouped without requesting an unnecessary duration',async({page,request})=>{
 const input=readFileSync('app/lib/fixtures/manual-awm-word-and-phrase.json','utf8'),blocks=JSON.parse(input),dialog=page.getByRole('dialog')
 await dialog.getByLabel('YouTube URL or video ID').fill('AWMFILE0001')
 await dialog.getByLabel('Video Title').fill('AWM words and phrases')
 await dialog.getByLabel('Transcript JSON').fill(input)
 await expect(dialog.getByText('3 segments ready to import.')).toBeVisible()
 await expect(dialog.getByRole('textbox',{name:'Video duration',exact:true})).toHaveValue('')
 await dialog.getByRole('button',{name:'Import',exact:true}).click()
 await expect(page.getByText('Transcript imported.',{exact:true})).toBeVisible()
 const saved=await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 expect(saved[0].raw_transcript.content.map((chunk:{offset:number;duration:number})=>[chunk.offset,chunk.duration])).toEqual([[1234,1266],[2500,2067],[4567,3433]])
 expect(saved[0].raw_transcript.content[1].tokens).toEqual([...blocks[1].tokens,...blocks[2].tokens])
 expect(saved[0].raw_transcript.content[1].english).toBe('Praise be to God. Welcome.')
 expect(saved[0].raw_transcript.content[0].tokens).toEqual(blocks[0].tokens)
 const membership=await (await request.get(`${backend}/rest/v1/admin_manual_transcripts`)).json()
 expect(membership[0].group_id).toBeNull()
 await page.reload()
 await expect(page.getByRole('heading',{name:'AWM words and phrases'})).toBeVisible()
})

test('shows a complete Admin-only token report and imports safely attached punctuation after correction',async({page,request})=>{
 const dialog=page.getByRole('dialog'),field=dialog.getByLabel('Transcript JSON')
 await dialog.getByLabel('YouTube URL or video ID').fill('AWMTOK00001');await dialog.getByLabel('Video Title').fill('Punctuation check')
 await field.fill(JSON.stringify([{tokens:[{arabic:''},{arabic:'َُّ'}],start_ms:1234,end_ms:2500},{tokens:[{arabic:'hello'}],start_ms:2500,end_ms:5000}]))
 for(const error of ['Segment 1, token 1','Segment 1, token 2','Segment 2, token 1'])await expect(dialog.getByText(error,{exact:false})).toBeVisible()
 await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeDisabled()
 expect(await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()).toEqual([])
 await expect(field).not.toHaveValue(/Segment/)
 await field.fill(JSON.stringify([{tokens:[{arabic:'مرحبا',english:'hello',pos:'noun',headword:'مرحبا',entry_type:'word',transliteration:'marhaba'},{arabic:'!'}],start_ms:1234,end_ms:5000,translation:'Hello!'}]))
 await expect(dialog.getByText('1 segment ready to import.')).toBeVisible()
 await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(page.getByText('Transcript imported.',{exact:true})).toBeVisible()
 const saved=await (await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 expect(saved[0].raw_transcript.content[0]).toMatchObject({text:'مرحبا!',english:'Hello!',offset:1234,duration:3766,tokens:[{arabic:'مرحبا!'}]})
 expect(JSON.stringify(saved[0].raw_transcript)).not.toMatch(/Segment|diagnostic|warning/)
 await page.goto(`/transcripts/${saved[0].id}`)
 await expect(page.getByText(/Segment 1, token|Import database|must contain at least/)).toHaveCount(0)
})
