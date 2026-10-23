import {test,expect,type BrowserContext} from '@playwright/test'
async function admin(context:BrowserContext,metadata:Record<string,unknown>={}){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:metadata}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

for(const width of [320,390,768,1440])test(`shared homepage hero and reading resume at ${width}`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/')
 const hero=page.locator('[data-home-hero]');await expect(hero.getByRole('heading',{name:'Learn Arabic through cartoons and books',exact:true})).toBeVisible()
 await expect(hero.getByRole('link')).toHaveCount(2);await expect(page.getByRole('heading',{name:'Shows',exact:true})).toBeVisible()
 const background=await hero.evaluate(el=>getComputedStyle(el).backgroundImage)
 const metadata={avatar_url:'https://example.com/saved-avatar.webp',banner_url:'https://example.com/saved-banner.webp',book_progress:{'test-book':{chapterSlug:'chapter-6',updatedAt:'2026-10-23T12:00:00Z'}}}
 await admin(context,metadata);await page.reload()
 await expect(page.locator('[data-home-profile]')).toHaveCount(0);await expect(hero).toHaveCount(1);await expect(hero.getByRole('link',{name:'Start Listening',exact:true})).toBeVisible();expect(await hero.evaluate(el=>getComputedStyle(el).backgroundImage)).toBe(background)
 for(const [name,path] of [['Start Watching','/cartoons'],['Start Reading','/books'],['Start Learning','/learn'],['Start Listening','/books?mode=listen']])await expect(hero.getByRole('link',{name,exact:true})).toHaveAttribute('href',path)
 await expect(page.getByRole('heading',{name:'Shows',exact:true})).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'Continue Reading',exact:true})).toBeVisible()
 await expect(page.locator('[data-continue-reading]')).toContainText('Sixth Chapter')
 await expect(page.locator('[data-continue-reading]').getByRole('link',{name:'Continue Reading',exact:true})).toHaveAttribute('href','/books/test-book/chapter-6')
 await expect(page.getByRole('heading',{name:'My List',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Books',exact:true})).toBeVisible()
 if(width<900)await expect(page.locator('[data-mobile-home-actions]')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/home-reversion-${width}.png`,fullPage:true})
 await page.locator('[data-continue-reading]').getByRole('link',{name:'Continue Reading',exact:true}).click();await expect(page).toHaveURL(/\/books\/test-book\/chapter-6$/)
 await admin(context);await page.goto('/');await expect(page.getByRole('link',{name:'Browse books',exact:true})).toBeVisible();await expect(page.locator('[data-continue-reading]')).toHaveCount(0)
})
