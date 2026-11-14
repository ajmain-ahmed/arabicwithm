import {test,expect,type BrowserContext} from '@playwright/test'
async function signIn(context: BrowserContext, id = '44444444-4444-4444-8444-444444444444') {
 const expires=Math.floor(Date.now()/1000)+3600
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

const backend='https://localhost:4357'
test.afterEach(async({request})=>{await request.post(`${backend}/fixture/reliability`,{data:{reset:true}})})
const routes=['/admin','/admin/featured','/admin/transcripts','/admin/shows','/admin/books','/admin/users','/admin/reviews','/admin/phrases','/admin/hans-wehr','/admin/episodes','/admin/books/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','/admin/episodes/dddddddd-dddd-4ddd-8ddd-ddddddddddd0']
for(const id of [null,'11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333'])test(`Admin routes deny ${id??'signed-out'}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/reset-overhaul`)
 if(id)await signIn(context,id)
 for(const route of routes){await page.goto(route);await expect(page).toHaveURL('/')}
})
for(const path of ['/auth/v1/user','/rest/v1/rpc/account_role'])test(`auth outage stays an error and recovers ${path}`,async({page,context,request})=>{
 await signIn(context)
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,rules:[{path,remaining:-1,status:503}]}})
 await page.goto('/admin/featured')
 await expect(page.locator('[data-awm-page-error]')).toBeVisible();await expect(page).toHaveURL(/admin\/featured/)
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true}})
 await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(page.getByRole('heading',{name:'Featured',exact:true})).toBeVisible()
})
test('slow Featured reads settle and retain saved artwork',async({page,context,request})=>{
 await request.post(`${backend}/fixture/featured`);await signIn(context)
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,rules:[{path:'/rest/v1/featured_show_config',remaining:1,delay:1200}]}})
 await page.goto('/admin/featured');await expect(page.getByRole('region',{name:'test-show.webp',exact:true})).toBeVisible()
 await page.reload();await page.goBack();await page.goForward();await expect(page.getByRole('heading',{name:'Featured',exact:true})).toBeVisible()
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true}})
})
test('unavailable audio leaves chapter metadata editable without replacing audio',async({page,context,request})=>{
 await signIn(context);await page.setViewportSize({width:1440,height:1000})
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,rules:[{path:'/rest/v1/book_chapter_audio',remaining:-1,status:503}]}})
 await page.goto('/admin/books')
 const book=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Test Book',exact:true})})
 await book.getByRole('button').first().click()
 await page.getByRole('row',{name:'1 First Chapter chapter-1',exact:true}).getByRole('button').click()
 const dialog=page.getByRole('dialog')
 await expect(dialog.getByText('Chapter details loaded. Audio settings could not be loaded. Reload before editing audio.',{exact:true})).toBeVisible({timeout:35000})
 await expect(dialog.getByLabel(/^Title\s*\*?$/)).toHaveValue('First Chapter')
 await expect(dialog.getByRole('button',{name:'Save',exact:true})).toBeEnabled()
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true}})
})
test('chapter token edits persist after blur and reload',async({page,context,request})=>{
 await request.post(`${backend}/fixture/admin-audit`);await signIn(context);await page.setViewportSize({width:1440,height:1000})
 await page.goto('/admin/books/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
 const row=page.locator('tbody tr').first();await row.getByRole('button').first().click()
 await row.getByRole('textbox').nth(2).fill('adjective');await row.getByRole('textbox').nth(2).press('Tab')
 await expect.poll(async()=> (await (await request.get(`${backend}/rest/v1/chapters?id=eq.bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`,{headers:{authorization:'Bearer fixture-service-key'}})).json())[0].content[0].tokens[0].pos).toBe('adjective')
 await page.reload();await expect(page.getByText('adjective',{exact:true}).first()).toBeVisible()
})

test('Hans partial IDs and scoped Admin exports work through real endpoints',async({page,context,request})=>{
 await request.post(`${backend}/fixture/admin-audit`);await signIn(context)
 await page.goto('/admin/hans-wehr');await page.getByLabel('Hans ID',{exact:true}).fill('1')
 await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByText('book',{exact:true}).first()).toBeVisible()
 for(const format of ['csv','json','pdf']){
  const response=await page.request.get(`/api/reviewer/export?format=${format}&type=book&parent=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-disposition']).toContain('attachment')
  expect((await response.body()).length).toBeGreaterThan(20)
 }
})
