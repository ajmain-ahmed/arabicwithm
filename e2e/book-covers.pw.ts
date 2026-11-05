import {test,expect,type BrowserContext} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext,premium=true){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'audio@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

for(const width of [390,1440])for(const path of ['/','/books','/books?mode=listen','/books/test-book','/listen/test-book'])test(`book artwork bypasses unavailable optimizer: ${path} at ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/audiobook-audit`);await signIn(context)
 await page.setViewportSize({width,height:1000})
 const optimized:string[]=[]
 await page.route('**/_next/image?**',route=>{
  const source=new URL(route.request().url()).searchParams.get('url')??''
  if(source.startsWith('/api/covers/books/'))optimized.push(source)
  return route.fulfill({status:402,body:'OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED'})
 })
 await page.goto(path)
 if(path==='/')await page.getByRole('heading',{name:'Books',exact:true}).scrollIntoViewIfNeeded()
 const cover=page.locator('img[alt="Test Book cover"]:visible').first()
 await expect(cover).toBeVisible();await cover.scrollIntoViewIfNeeded()
 await expect(cover).toHaveAttribute('src',/^\/api\/covers\/books\//)
 await expect.poll(()=>cover.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true)
 expect(await cover.evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain')
 expect(optimized).toEqual([])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
