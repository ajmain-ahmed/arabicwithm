import {test,expect,type BrowserContext} from '@playwright/test'
async function signIn(context:BrowserContext){
 const id='11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'free@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [320,390,768,1440])for(const ratio of [2/3,3/4,1])test(`book detail at ${width} with ${ratio} cover`,async({page,context})=>{
 await signIn(context);await page.setViewportSize({width,height:1000})
 await page.route('**/api/covers/books/**',route=>route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${ratio*600}" height="600"><rect width="100%" height="100%" fill="#174832"/><text x="10" y="30" fill="white">Complete cover</text></svg>`}))
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto('/books/test-book')
 const cover=page.getByRole('img',{name:'Test Book cover',exact:true}).filter({visible:true})
 await expect(cover).toBeVisible();await expect.poll(()=>cover.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0)
 const fit=await cover.evaluate(el=>({fit:getComputedStyle(el).objectFit,transform:getComputedStyle(el).transform}))
 expect(fit).toEqual({fit:'contain',transform:'none'})
 const frame=await cover.boundingBox();expect(frame!.width).toBeLessThanOrEqual(width<600?220:300);expect(Math.abs(frame!.width/frame!.height-2/3)).toBeLessThan(.01)
 const arabic=page.getByRole('link',{name:'Arabic',exact:true}).filter({visible:true}),english=page.getByRole('link',{name:'English',exact:true}).filter({visible:true})
 await expect(arabic).toBeVisible();await expect(english).toBeVisible();await expect(page.getByRole('link',{name:/Read in (Arabic|English)/})).toHaveCount(0)
 await expect(arabic).toHaveCSS('background-color','rgb(184, 134, 11)');await expect(english).toHaveCSS('background-color','rgb(184, 134, 11)')
 const styles=await Promise.all([arabic,english].map(button=>button.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return [r.width,r.height,s.padding,s.borderRadius,s.fontSize,s.backgroundColor]})))
 expect(styles[0]).toEqual(styles[1])
 const card=await arabic.evaluate(el=>{const b=el.closest('.MuiPaper-root')!.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}})
 if(width>=600){expect(card.x).toBeGreaterThan(frame!.x+frame!.width);expect(card.width).toBeGreaterThan(frame!.width)}else{expect(Math.abs(frame!.x+frame!.width/2-width/2)).toBeLessThan(2)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/book-detail-${width}-${ratio}.png`,fullPage:true})
 if(ratio===2/3){await arabic.click();await expect(page).toHaveURL(/\/books\/test-book\/chapter-1\?lang=ar$/);await page.goto('/books/test-book');await page.getByRole('link',{name:'English',exact:true}).filter({visible:true}).click();await expect(page).toHaveURL(/\/books\/test-book\/chapter-1\?lang=en$/)}
 expect(errors).toEqual([])
})
