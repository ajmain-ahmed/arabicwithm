import {test,expect,type BrowserContext} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function admin(context:BrowserContext){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

test.beforeEach(async({request,context,page})=>{await request.post(`${backend}/fixture/reset-overhaul`);await request.post(`${backend}/fixture/standalone-transcripts`);await admin(context);await page.goto('/admin/transcripts')})
for(const width of [1280,390]){
 test(`restores old imports and keeps optional group and duration controls readable at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900})
  await expect(page.getByRole('heading',{name:'Existing standalone transcript'})).toBeVisible()
  await page.getByRole('button',{name:'Add Transcript',exact:true}).first().click()
  const dialog=page.getByRole('dialog'),select=dialog.getByLabel('Group (optional)')
  await expect(select).toHaveValue('')
  const overlaps=await select.evaluate(el=>{const select=el as HTMLSelectElement;const label=document.querySelector(`label[for="${select.id}"]`)!;return label.getBoundingClientRect().bottom>select.getBoundingClientRect().top+parseFloat(getComputedStyle(select).paddingTop)+2})
  expect(overlaps).toBe(false)
  const duration=await dialog.getByRole('textbox',{name:'Video duration',exact:true}).boundingBox(),format=await dialog.getByRole('button',{name:'Minutes & Seconds',exact:true}).boundingBox()
  expect(format!.y).toBeGreaterThan(duration!.y+duration!.height)
  await dialog.getByRole('button',{name:'Video duration information'}).click()
  await expect(page.getByText(/Enter the video's duration as MM:SS or HH:MM:SS/).last()).toBeVisible()
  await expect(page.getByText(/optional when the transcript JSON already contains complete timing information/).last()).toBeVisible()
  await page.keyboard.press('Escape')
  await page.screenshot({animations:'disabled',path:`.next/transcript-ui-qa/duration-${width}.png`})
 })
}
test('creates a flat group, preselects Add Transcript, moves real JSON both ways and preserves all transcript fields',async({page,request})=>{
 const longName='Arabic Stories with a deliberately long group name to verify mobile truncation'
 const before=await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()
 await page.getByRole('button',{name:'Create Group',exact:true}).click()
 const manager=page.getByRole('dialog')
 await expect(manager.getByLabel('Parent group')).toHaveCount(0)
 await manager.getByLabel('Group name').fill(longName)
 await manager.getByRole('button',{name:'Create group',exact:true}).click()
 await manager.getByRole('button',{name:'Done',exact:true}).click()
 await page.getByRole('button',{name:longName+' (0)',exact:true}).click()
 await expect(page.getByText('No transcripts in this group yet.')).toBeVisible()
 await page.getByRole('button',{name:'Add Transcript',exact:true}).last().click()
 const dialog=page.getByRole('dialog'),group=dialog.getByLabel('Group (optional)')
 expect(await group.locator('option:checked').textContent()).toBe(longName)
 await page.setViewportSize({width:390,height:900})
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await page.screenshot({animations:'disabled',path:'.next/transcript-ui-qa/long-group-mobile.png'})
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 await page.getByRole('button',{name:'Ungrouped (1)',exact:true}).click()
 await page.getByRole('button',{name:'Edit / Publish',exact:true}).click()
 const editor=page.getByRole('dialog')
 await expect(editor.getByLabel('Transcript JSON')).toContainText('')
 const original=await editor.getByLabel('Transcript JSON').inputValue()
 await editor.getByLabel('Group (optional)').selectOption({label:longName})
 await editor.getByRole('button',{name:'Save Changes',exact:true}).click()
 await expect(editor.getByRole('button',{name:'Saved',exact:true})).toBeVisible()
 await expect(editor.getByLabel('Transcript JSON')).toHaveValue(original)
 expect(await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()).toEqual(before)
 await editor.getByLabel('Group (optional)').selectOption('')
 await editor.getByRole('button',{name:'Save Changes',exact:true}).click()
 await expect(editor.getByRole('button',{name:'Saved',exact:true})).toBeVisible()
 expect(await(await request.get(`${backend}/rest/v1/youtube_transcripts`)).json()).toEqual(before)
 await editor.getByRole('button',{name:'Close',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Existing standalone transcript'})).toBeVisible()
})
