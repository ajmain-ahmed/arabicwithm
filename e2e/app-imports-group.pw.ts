import {test,expect,type BrowserContext} from '@playwright/test'
import {readFile} from 'node:fs/promises'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function session(context:BrowserContext,admin=true){
 const id=admin?'44444444-4444-4444-8444-444444444444':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'user@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
test.beforeEach(async({request})=>{await request.post(`${backend}/fixture/reset-overhaul`);await request.post(`${backend}/fixture/standalone-transcripts`)})
for(const width of [1280,390]){
 test(`automatic Imports uses normal cards, full pagination and saved JSON at ${width}px`,async({request,context,page})=>{
  const fixture=await(await request.post(`${backend}/fixture/app-imports`,{data:{count:35}})).json()
  await session(context);await page.setViewportSize({width,height:900});await page.goto('/admin/transcripts')
  await page.getByLabel('Filter by group').selectOption(fixture.groupId)
  await expect(page.getByRole('button',{name:'Imports (36)',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'App import 35',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Existing standalone transcript',exact:true})).toHaveCount(0)
  const before=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
  const card=page.locator('.MuiCard-root').filter({has:page.getByRole('heading',{name:'App import 35',exact:true})})
  const pending=page.waitForEvent('download');await card.getByRole('button',{name:'Download JSON',exact:true}).click()
  const download=await pending
  expect(download.suggestedFilename()).toBe('App_import_35_transcript.json')
  expect(JSON.parse(await readFile((await download.path())!,'utf8'))).toEqual(fixture.canonical)
  await card.getByRole('button',{name:'Edit / Publish',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await expect(dialog.getByLabel('Group (optional)')).toBeDisabled()
  await expect(dialog.getByLabel('Transcript JSON')).not.toHaveValue('')
  expect(JSON.parse(await dialog.getByLabel('Transcript JSON').inputValue())).toEqual(fixture.canonical)
  await expect(dialog.getByLabel('Publish to searchable transcript library')).not.toBeChecked()
  await expect(dialog.getByLabel('Publish to For You')).not.toBeChecked()
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'Next',exact:true}).click()
  await expect(page.getByRole('heading',{name:'App import 01',exact:true})).toBeVisible()
  const failed=page.locator('.MuiCard-root').filter({has:page.getByRole('heading',{name:'Failed app import',exact:true})})
  await expect(failed.getByRole('button',{name:'Download JSON',exact:true})).toBeDisabled()
  await expect(failed.getByRole('button',{name:'Edit / Publish',exact:true})).toBeDisabled()
  await page.reload();await page.getByLabel('Filter by group').selectOption(fixture.groupId)
  await expect(page.getByRole('heading',{name:'App import 35',exact:true})).toBeVisible()
  expect(await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()).toEqual(before)
  const log=await(await request.get(`${backend}/fixture/request-log`)).json()
  for(const rpc of ['admin_generate_youtube_transcript','register_youtube_transcript','website_begin_manual_import'])expect(log.rpc).not.toContain(rpc)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({animations:'disabled',path:`.next/transcript-ui-qa/app-imports-${width}.png`})
 })
}
test('Imports refetches newly saved app records without a deployment or manual grouping',async({request,context,page})=>{
 const fixture=await(await request.post(`${backend}/fixture/app-imports`,{data:{count:1}})).json()
 await session(context);await page.goto('/admin/transcripts');await page.getByLabel('Filter by group').selectOption(fixture.groupId)
 await expect(page.getByRole('heading',{name:'App import 01',exact:true})).toBeVisible()
 await request.post(`${backend}/fixture/app-imports`,{data:{count:1}})
 await expect(page.getByRole('heading',{name:'App import 02',exact:true})).toBeVisible({timeout:15000})
})
test('normal users cannot enter Admin Imports',async({request,context,page})=>{
 await request.post(`${backend}/fixture/app-imports`,{data:{count:1}})
 await session(context,false);await page.goto('/admin/transcripts');await expect(page).toHaveURL('/')
 await expect(page.getByRole('heading',{name:'App import 01',exact:true})).toHaveCount(0)
})

for(const width of [1280,390])test(`legacy enrichment requires explicit paid confirmation at ${width}px`,async({request,context,page})=>{
 const fixture=await(await request.post(`${backend}/fixture/app-imports`,{data:{count:1}})).json()
 const legacy=await(await request.post(`${backend}/fixture/gemini-enrichment-legacy`)).json()
 const before=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 const baselineLog=await(await request.get(`${backend}/fixture/request-log`)).json()
 const retriesBefore=baselineLog.rpc.filter((name:string)=>name==='admin_retry_gemini_enrichment').length
 await session(context);await page.setViewportSize({width,height:900});await page.goto('/admin/transcripts');await page.getByLabel('Filter by group').selectOption(fixture.groupId)
 await page.getByRole('button',{name:'Retry Enrichment',exact:true}).click()
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('The raw transcript is safe')
 await expect(dialog).toContainText('may incur a new Gemini enrichment charge')
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 let log=await(await request.get(`${backend}/fixture/request-log`)).json()
 expect(log.rpc.filter((name:string)=>name==='admin_retry_gemini_enrichment')).toHaveLength(retriesBefore)
 await page.getByRole('button',{name:'Retry Enrichment',exact:true}).click()
 await page.getByRole('button',{name:'Confirm paid enrichment retry',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Retry Enrichment',exact:true})).toHaveCount(0)
 const after=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 const original=before.find((row:{id:string})=>row.id===legacy.id),saved=after.find((row:{id:string})=>row.id===legacy.id)
 expect(saved.raw_transcript).toEqual(original.raw_transcript);expect(saved.provider_job_id).toBe(original.provider_job_id)
 expect(saved.searchable).toBe(false);expect(saved.explore_published).toBe(false);expect(saved.status).toBe('indexing')
 log=await(await request.get(`${backend}/fixture/request-log`)).json()
 expect(log.rpc.filter((name:string)=>name==='admin_retry_gemini_enrichment')).toHaveLength(retriesBefore+1)
 expect(log.rpc).not.toContain('register_gemini_youtube_transcript')
})
