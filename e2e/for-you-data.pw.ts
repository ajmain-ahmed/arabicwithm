import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext,premium=false){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:premium?'premium@fixture.example':'free@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [390,1440])test(`raw fallback survives mobile feed navigation and request failure at ${width}`,async({page,context,request})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await request.post(`${backend}/fixture/for-you-data`,{data:{fail:true}})
 await signIn(context,true);await installYouTubeFixture(page);await page.setViewportSize({width,height:950})
 await page.goto('/explore?view=explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 await expect(page.getByText('For You couldn’t load. Please try again.')).toBeVisible()
 await expect(page.locator('body')).not.toContainText('Server Components render')
 await page.getByRole('button',{name:'Retry',exact:true}).click()
 const clip=page.locator('[data-for-you-source]')
 await expect(clip.locator('iframe')).toBeVisible()
 const sources=new Set<string>()
 for(let i=0;i<7;i++){
  await expect(clip.locator('[lang="ar"]').filter({visible:true}).first()).toBeVisible()
  sources.add((await clip.getAttribute('data-for-you-source'))!)
  if(i<6){const old=await clip.getAttribute('data-for-you-source');await page.getByRole('button',{name:'Next video',exact:true}).click();await expect(clip).not.toHaveAttribute('data-for-you-source',old!)}
 }
 expect(sources.size).toBe(7)
 const last=await clip.getAttribute('data-for-you-source')
 await page.getByRole('button',{name:'Previous video',exact:true}).click();await expect(clip).not.toHaveAttribute('data-for-you-source',last!)
 await page.getByRole('button',{name:'Next video',exact:true}).click();await expect(clip).toHaveAttribute('data-for-you-source',last!)
 await page.getByRole('button',{name:'Filter content',exact:true}).click()
 await expect(page.getByLabel('Fallback sources')).toBeVisible()
 await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(clip.locator('iframe')).toBeVisible()
 const mode=width<900?page.locator('[data-mobile-mode]'):page.getByRole('button',{name:'Full',exact:true})
 await mode.click();await expect(clip.locator('iframe')).toBeVisible()
 await page.frameLocator('[data-for-you-source] iframe').getByRole('slider',{name:'Native timeline fixture'}).fill('1')
 await page.reload();await page.getByRole('button',{name:'For You feed',exact:true}).click();await expect(clip.locator('iframe')).toBeVisible()
 await page.getByRole('button',{name:'Explore feed',exact:true}).click();await page.getByRole('button',{name:'For You feed',exact:true}).click();await expect(clip.locator('iframe')).toBeVisible()
 expect(errors).toEqual([])
})
