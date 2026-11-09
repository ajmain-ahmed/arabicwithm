import {test,expect} from '@playwright/test'
import example from './source-language-data.json'
const backend='https://localhost:4347',english='5b98c563-5c35-4696-98e1-06aa000eb622',child='77777777-7777-4777-8777-777777777775'
for(const group of [english,child])test(`English-group auto language persists through import and edit ${group}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/reset-overhaul`);await request.post(`${backend}/fixture/english-for-you`)
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
 await page.goto('/admin/transcripts');await page.getByRole('button',{name:'Add Transcript',exact:true}).first().click()
 let dialog=page.getByRole('dialog');const language=()=>dialog.getByLabel('Original Audio Language'),selection=()=>dialog.getByLabel('Group (optional)')
 await expect(language()).toHaveValue('ar');await selection().selectOption(group);await expect(language()).toHaveValue('en');await expect(language()).toBeDisabled()
 await selection().selectOption('');await expect(language()).toHaveValue('ar');await expect(language()).toBeEnabled()
 await language().selectOption('en');await selection().selectOption(group);await selection().selectOption('');await expect(language()).toHaveValue('en')
 await language().selectOption('ar');await selection().selectOption(group)
 const json=JSON.stringify([example]),title=`Auto English ${group===english?'root':'child'}`
 await dialog.getByLabel('YouTube URL or video ID').fill('AWMFILE0001');await dialog.getByLabel('Video Title').fill(title);await dialog.getByLabel('Transcript JSON').fill(json);await dialog.getByLabel('Video duration',{exact:true}).fill('00:45')
 await expect(dialog.getByLabel('Transcript JSON')).toHaveValue(json)
 await dialog.screenshot({path:`test-results/${test.info().project.name}-auto-english-${group===english?'root':'child'}.png`})
 await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(dialog).not.toBeVisible()
 const rows=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json(),saved=rows.find((row:{title:string})=>row.title===title)
 expect(saved.raw_transcript.source_language).toBe('en');expect(saved.raw_transcript.content[0].tokens).toEqual(example.tokens);expect(saved.original_json).toBe(json)
 const before=JSON.stringify(saved.raw_transcript.content)
 await page.reload();await page.getByLabel('Filter by group').selectOption(group);await page.locator('.MuiCard-root').filter({hasText:title}).getByRole('button',{name:'Edit / Publish',exact:true}).click();dialog=page.getByRole('dialog')
 await expect(language()).toHaveValue('en');await expect(language()).toBeDisabled()
 await selection().selectOption('');await expect(language()).toHaveValue('en');await language().selectOption('ar')
 await dialog.getByRole('button',{name:'Save Changes',exact:true}).click();await expect(dialog.getByRole('button',{name:'Saved',exact:true})).toBeVisible()
 const after=(await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()).find((row:{id:string})=>row.id===saved.id)
 expect(after.raw_transcript.source_language).toBe('ar');expect(JSON.stringify(after.raw_transcript.content)).toBe(before);expect(after.original_json).toBe(json)
})
