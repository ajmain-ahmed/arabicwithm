import {test,expect,type BrowserContext} from '@playwright/test'
const ids={user:'11111111-1111-4111-8111-111111111111',premium:'22222222-2222-4222-8222-222222222222',editor:'33333333-3333-4333-8333-333333333333',admin:'44444444-4444-4444-8444-444444444444'}
async function signIn(context:BrowserContext,role:keyof typeof ids){
 const id=ids[role],expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:`${role}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [320,390])for(const role of ['user','premium','editor','admin'] as const)test(`${role} drawer groups at ${width}`,async({page,context})=>{
 await signIn(context,role);await page.setViewportSize({width,height:740});await page.goto('/books')
 await page.getByRole('button',{name:'Open menu',exact:true}).click()
 const drawer=page.getByRole('dialog',{name:'Site navigation',exact:true})
 await expect(drawer).toBeVisible()
 const privileged=role==='admin'||role==='editor'
 const management=privileged?[...(role==='admin'?['Admin']:[]),'Reviewer','Memory','Grammar','Word Search']:[]
 await expect(drawer.locator('.mobile-list-btn')).toHaveText(['My Profile','Home','Explore','Watch','Read','Learn',...management,'Give Feedback','Support Us','Settings','Sign Out'])
 const separators=drawer.locator('[data-nav-divider]')
 expect(await separators.evaluateAll(nodes=>nodes.map(node=>node.previousElementSibling?.textContent))).toEqual(['My Profile','Learn',...(privileged?['Word Search']:[]),'Support Us'])
 for(const line of await separators.all()){
  await expect(line).toBeVisible()
  expect(await line.evaluate(el=>parseFloat(getComputedStyle(el).borderBottomWidth))).toBeLessThanOrEqual(1)
 }
 await drawer.getByRole('button',{name:'Sign Out',exact:true}).scrollIntoViewIfNeeded()
 await expect(drawer.getByRole('button',{name:'Sign Out',exact:true})).toBeInViewport()
 await drawer.getByRole('button',{name:privileged?'Reviewer':'Learn',exact:true}).click()
 await expect(page).toHaveURL(privileged?'/reviewer':'/learn')
 await expect(drawer).not.toBeVisible()
})
