import {test,expect,type BrowserContext} from '@playwright/test'
async function admin(context:BrowserContext,metadata:Record<string,unknown>={}){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'admin@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:metadata}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

for(const width of [320,390,768,1440,1920])test(`historical homepage restored at ${width}`,async({page,context})=>{
 await page.setViewportSize({width,height:1000});await admin(context,{full_name:'Test Learner',book_progress:{'test-book':{chapterSlug:'chapter-6',updatedAt:'2026-10-23'}}});await page.goto('/')
 const hero=page.locator('[data-home-hero]');await expect(hero.getByRole('heading')).toContainText(/Good (morning|afternoon|evening), Test!/)
 expect(await hero.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('/homepage/hero.avif')
 await expect(page.locator('[data-home-profile]')).toHaveCount(0);await expect(page.locator('[data-continue-reading]')).toHaveCount(0)
 const bookmark=page.locator('[data-mobile-continue-reading]'),actions=page.getByRole('navigation',{name:'Quick Actions',exact:true})
 if(width<900){await expect(bookmark).toBeVisible();await expect(bookmark.getByRole('link')).toHaveAttribute('href','/books/test-book/chapter-6')}else{
  await expect(bookmark).toHaveCount(0)
  const cards=await actions.getByRole('link').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return {title:el.textContent!.trim(),x:b.x,y:b.y,w:b.width,h:b.height}}))
  expect(cards.map(c=>c.title)).toEqual(['Memory','Explore','Grammar','Word Search'])
  expect(cards[0].y).toBe(cards[1].y);expect(cards[2].y).toBe(cards[3].y);expect(cards[2].y).toBeGreaterThan(cards[0].y)
  for(const card of cards){expect(card.w).toBe(cards[0].w);expect(card.h).toBe(cards[0].h)}
  const box=(await actions.boundingBox())!;expect(box.width).toBeLessThanOrEqual(680);expect(Math.abs(box.x+box.width/2-width/2)).toBeLessThan(2)
 }

 await expect(actions).toBeVisible()
 for(const title of ['Memory','Grammar','Word Search','Explore'])await expect(actions.getByRole('link',{name:title,exact:true})).toBeVisible()
 await expect(hero.getByRole('button',{name:'AWM+',exact:true})).toBeVisible();await expect(hero.getByRole('link')).toHaveCount(0)
 for(const name of ['My List','Shows','Latest Episodes','Books'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible()
 if(width<900)await expect(page.locator('[data-mobile-home-actions]')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 if(width<900){
  expect(await actions.getByRole('link').allTextContents()).toEqual(['Memory','Grammar','Word Search','Explore'])
  await bookmark.getByRole('link').click();await expect(page).toHaveURL(/\/books\/test-book\/chapter-6$/);await page.goto('/')
 }
 await page.screenshot({path:`test-results/historical-home-${width}.png`})
})
