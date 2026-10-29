import {test,expect,type BrowserContext} from '@playwright/test'
async function signIn(context:BrowserContext){
 const id='11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'free@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [390,1440])for(const route of ['/','/profile/11111111-1111-4111-8111-111111111111'])test(`sign out replaces ${route} at ${width} with public home`,async({page,context})=>{
 await signIn(context);await page.setViewportSize({width,height:844});await page.goto('/books');await page.goto(route)
 if(width<900){await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('dialog',{name:'Site navigation',exact:true}).getByRole('button',{name:'Sign Out',exact:true}).click()}else{await page.getByRole('button',{name:'Open user menu',exact:true}).click();await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click()}
 await expect(page).toHaveURL('/');await expect(page.getByRole('button',{name:/^sign in$/i})).toBeVisible()
 await expect(page.getByText('This page could not be found.')).toHaveCount(0)
 await page.goBack();await expect(page).toHaveURL('/books')
})
test('missing public URLs remain genuine 404s',async({page})=>{
 const response=await page.goto('/this-public-page-does-not-exist')
 expect(response?.status()).toBe(404);await expect(page).toHaveURL('/this-public-page-does-not-exist')
})
