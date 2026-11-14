import { test, expect, type BrowserContext } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

async function signIn(context: BrowserContext, id = '44444444-4444-4444-8444-444444444444') {
 const expires=Math.floor(Date.now()/1000)+3600
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
function routes(directory='app/(admin)/admin', prefix='/admin'):string[] {
 return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?routes(join(directory,entry.name),`${prefix}/${entry.name}`):entry.name==='page.tsx'?[prefix]:[])
}
const inventory=routes().map(route=>route.replace('[chapterId]','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').replace('[episodeId]','dddddddd-dddd-4ddd-8ddd-ddddddddddd0'))
for(const route of inventory)test(`route lifecycle ${route}`,async({page,context})=>{
 await signIn(context)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 for(let cycle=0;cycle<2;cycle++) {
  const response=await page.goto(route)
  expect(response!.status()).toBeLessThan(400)
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('main').getByRole('heading').first()).toBeVisible()
  await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('main').getByRole('heading').first()).toBeVisible()
  await page.goto('/admin/shows');await page.goBack();await page.goForward()
 }
 const fresh=await context.newPage();await fresh.goto(route)
 await expect(fresh.locator('main').getByRole('heading').first()).toBeVisible();await fresh.close()
 expect(errors).toEqual([])
})

test('Featured survives twenty loads and saved position readbacks',async({page,context,request})=>{
 await request.post('https://localhost:4357/fixture/featured');await signIn(context)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 for(let cycle=0;cycle<20;cycle++){
  await page.goto('/admin/featured')
  await expect(page.getByRole('heading',{name:'Featured',exact:true})).toBeVisible()
  if(cycle%5===0){
   await page.getByRole('region',{name:'test-show.webp',exact:true}).getByRole('button',{name:'Edit / Position'}).click()
   const dialog=page.getByRole('dialog',{name:'Edit / Position',exact:true})
   const slider=dialog.getByRole('slider',{name:/Horizontal/});await slider.focus();await slider.press('Home');await slider.press('ArrowRight')
   await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
   await page.reload()
   await page.getByRole('region',{name:'test-show.webp',exact:true}).getByRole('button',{name:'Edit / Position'}).click()
   await expect(dialog.getByRole('slider',{name:/Horizontal/})).toHaveAttribute('aria-valuenow','1')
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
  }
 }
 expect(errors).toEqual([])
})

const backend='https://localhost:4357'
test('Shows and episode metadata persist after save and reload',async({page,context})=>{
 await signIn(context);await page.setViewportSize({width:1440,height:1000})
 await page.goto('/admin/shows')
 const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Test Show',exact:true})})
 await row.getByRole('button').last().click()
 let dialog=page.getByRole('dialog')
 await dialog.getByLabel(/^Title\s*\*?$/).fill('Audit Show')
 await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.reload();await expect(page.getByRole('cell',{name:'Audit Show',exact:true})).toBeVisible()
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'Audit Show',exact:true})}).getByRole('button').last().click()
 await dialog.getByLabel(/^Title\s*\*?$/).fill('Test Show');await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.goto('/admin/episodes/dddddddd-dddd-4ddd-8ddd-ddddddddddd0')
 await page.getByRole('button',{name:'Edit episode details',exact:true}).click()
 dialog=page.getByRole('dialog');await dialog.getByLabel(/^Title\s*\*?$/).fill('Audit Episode')
 await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.reload();await expect(page.getByRole('heading',{name:'Audit Episode',exact:true})).toBeVisible()
})

test('Phrases edits, dictionary search, user access and review decisions persist',async({page,context,request})=>{
 await request.post(`${backend}/fixture/admin-audit`);await signIn(context);await page.setViewportSize({width:1440,height:1000})
 await page.goto('/admin/phrases')
 const row=page.getByRole('row').filter({hasText:'Audit phrase'})
 await row.getByRole('button').last().click()
 await row.getByRole('textbox').nth(2).fill('Audit greeting');await row.getByRole('textbox').nth(2).press('Tab')
 await expect.poll(async()=> (await (await request.get(`${backend}/rest/v1/phrases`)).json())[0].english).toBe('Audit greeting')
 await page.reload();await expect(page.getByText('Audit greeting',{exact:true})).toBeVisible()
 await page.goto('/admin/hans-wehr');await page.getByLabel('Word (Hans headword)',{exact:true}).fill('??????')
 await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByText('book',{exact:true}).first()).toBeVisible()
 await page.goto('/admin/users');await page.getByLabel('Search by name or email').fill('free')
 await page.getByRole('button',{name:'View User',exact:true}).first().click()
 let dialog=page.getByRole('dialog');await dialog.getByLabel('Editor',{exact:true}).check()
 await dialog.getByLabel('Notes (optional)').fill('Isolated audit role change')
 await dialog.getByRole('button',{name:'Save access',exact:true}).click()
 await expect(dialog.getByText('Access saved.',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.reload();await page.getByLabel('Search by name or email').fill('free')
 await page.getByRole('button',{name:'View User',exact:true}).first().click();dialog=page.getByRole('dialog')
 await expect(dialog.getByLabel('Editor',{exact:true})).toBeChecked();await dialog.getByRole('button',{name:'Close',exact:true}).click()
 await page.goto('/admin/reviews');await page.getByRole('button',{name:'Review / Reply',exact:true}).first().click()
 dialog=page.getByRole('dialog');await dialog.getByLabel('Admin response').fill('Audited rejection')
 await dialog.getByRole('button',{name:'Reject',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.reload();await page.getByRole('tab',{name:'rejected',exact:true}).click();await page.getByRole('button',{name:'Review / Reply',exact:true}).first().click()
 await expect(page.getByRole('dialog').getByLabel('Admin response')).toHaveValue('Audited rejection')
})

for(const width of [320,390,430,1024,1440])test(`Admin navigation and forms fit ${width}px`,async({page,context})=>{
 await signIn(context);await page.setViewportSize({width,height:1000})
 for(const route of ['/admin/featured','/admin/transcripts','/admin/shows','/admin/books','/admin/users','/admin/reviews','/admin/phrases','/admin/hans-wehr']){
  await page.goto(route);await expect(page.locator('main').getByRole('heading').first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  if(width<900){await page.getByRole('button',{name:'Admin',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Featured',exact:true})).toBeVisible();await page.keyboard.press('Escape')}
 }
})

for(const [route,path] of [
 ['/admin/featured','/rest/v1/featured_show_config'],['/admin/books','/rest/v1/books'],['/admin/shows','/rest/v1/shows'],
 ['/admin/transcripts','/rest/v1/rpc/admin_list_manual_transcripts'],['/admin/users','/rest/v1/rpc/admin_user_directory'],
 ['/admin/reviews','/rest/v1/content_suggestions'],['/admin/phrases','/rest/v1/phrases'],
 ['/admin/books/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','/rest/v1/chapters'],
 ['/admin/episodes/dddddddd-dddd-4ddd-8ddd-ddddddddddd0','/rest/v1/episodes'],
])test(`failure and Reload recover ${route}`,async({page,context,request})=>{
 await signIn(context)
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,rules:[{path,remaining:-1,status:503}]}})
 await page.goto(route)
 const card=page.locator('[data-awm-page-error]');await expect(card).toBeVisible()
 await expect(card).toContainText('This page took a little detour')
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true}})
 await card.getByRole('button',{name:'Reload',exact:true}).click();await page.waitForLoadState('networkidle');await expect(card).toHaveCount(0)
})
