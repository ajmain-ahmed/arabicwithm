import {test,expect,type BrowserContext} from '@playwright/test'
async function admin(context:BrowserContext){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const entry of ['/admin','/admin/shows']){
test(`${entry} loads Shows and remains usable after navigation`,async({page,context})=>{
 await admin(context)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(entry)
 await expect(page).toHaveURL(/\/admin\/shows$/)
 await expect(page.getByRole('heading',{name:'Shows',exact:true})).toBeVisible()
 await expect(page.getByText('Test Show',{exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Books',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Books',exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Shows',exact:true}).click()
 await expect(page.getByText('Test Show',{exact:true})).toBeVisible()
 expect(errors).toEqual([])
})
}
test('the Admin entry redirect keeps unauthenticated visitors outside Admin',async({page})=>{
 await page.goto('/admin')
 await expect(page).toHaveURL('/')
 await expect(page.getByRole('button',{name:'New show',exact:true})).toHaveCount(0)
 await expect(page.locator('.awm-admin-shell')).toHaveCount(0)
})
