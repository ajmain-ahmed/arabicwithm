import {test,expect,type BrowserContext} from '@playwright/test'
const ids={free:'11111111-1111-4111-8111-111111111111',premium:'22222222-2222-4222-8222-222222222222',editor:'33333333-3333-4333-8333-333333333333',admin:'44444444-4444-4444-8444-444444444444'}
async function account(context:BrowserContext,kind:keyof typeof ids){
 const id=ids[kind],expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:`${kind}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{role:'admin'}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const role of ['anonymous','free','premium','editor','admin'] as const)test(`canonical Admin visibility and direct access: ${role}`,async({page,context})=>{
 if(role!=='anonymous')await account(context,role)
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/learn')
  if(width<900)await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const entry=page.getByRole(width<900?'button':'link',{name:'Admin',exact:true}).filter({visible:true})
  if(role==='admin')await expect(entry).toBeVisible();else await expect(entry).toHaveCount(0)
  await page.goto('/admin/books')
  if(role==='admin'){await expect(page.getByRole('button',{name:'New book',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'Test Book',exact:true})).toBeVisible()}
  else await expect(page).toHaveURL('/')
 }
})
test('Admin Books existing list, editor, create, chapters and history',async({page,context})=>{
 await account(context,'admin');await page.setViewportSize({width:1440,height:1000});await page.goto('/admin/shows')
 await page.getByRole('link',{name:'Books',exact:true}).click();await expect(page).toHaveURL('/admin/books')
 await page.getByRole('cell',{name:'Test Book',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
 await page.getByRole('button',{name:'New book',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
 await page.reload();await expect(page.getByRole('cell',{name:'Test Book',exact:true})).toBeVisible()
 await page.goBack();await expect(page).toHaveURL('/admin/shows');await page.goForward();await expect(page).toHaveURL('/admin/books')
 await page.getByRole('button',{name:'Expand chapters for Test Book',exact:true}).click()
 await page.getByRole('link',{name:'Preview',exact:true}).first().click();await expect(page).toHaveURL(/\/admin\/books\/preview\//);await expect(page.getByRole('heading',{name:'Test Book — First Chapter',exact:true})).toBeVisible();await page.goBack();await expect(page).toHaveURL('/admin/books')
 await expect(page.getByRole('cell',{name:'Test Book',exact:true})).toBeVisible()
 const chapterLink=page.getByRole('link',{name:'First Chapter',exact:true});if(!await chapterLink.isVisible())await page.getByRole('button',{name:'Expand chapters for Test Book',exact:true}).click()
 await page.getByRole('link',{name:'First Chapter',exact:true}).click();await expect(page).toHaveURL('/admin/books/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');await expect(page.locator('main')).toContainText('First Chapter')
})
test('Admin grammar diagnostics retain authored review and show missing configuration',async({page,context})=>{
 await account(context,'admin');await page.goto('/admin/grammar-notes')
 await expect(page.getByText(/Context grammar analysis is not configured on this server/)).toBeVisible()
 await expect(page.getByRole('heading',{name:'Enrichment status',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Retry enrichment',exact:true})).toBeVisible()
 await expect(page.locator('main')).toContainText('Authored rule evidence remains available')
})
