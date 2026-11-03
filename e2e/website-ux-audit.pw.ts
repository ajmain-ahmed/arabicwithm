import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext){
 const id='22222222-2222-4222-8222-222222222222',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'ux@fixture.example',app_metadata:{provider:'email'},user_metadata:{my_list_books:['test-book'],book_progress:{'test-book':{chapterSlug:'chapter-1',page:3,blockIndex:28,language:'en',updatedAt:Date.now()}}}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
 await context.request.put(`${backend}/auth/v1/user`,{headers:{Authorization:`Bearer ${access_token}`},data:{data:user.user_metadata}})
}
for(const width of [320,390,1440])test(`Grammar compact options and natural feedback at ${width}`,async({page,context})=>{
 await signIn(context);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/grammar')
 for(const activity of ['Word Type','Sentence Role','Case Endings','Context Ṣarf','Weak Verbs','Word Patterns']){
  await page.getByRole('button',{name:activity,exact:true}).click();const options=page.locator('[data-grammar-options]'),area=page.locator('[data-grammar-answer-area]')
  await expect(options).toBeVisible();const initial=(await area.boundingBox())!,content=(await options.boundingBox())!
  expect(Math.abs(initial.height-content.height)).toBeLessThan(3)
  expect(Math.abs(initial.y-content.y)).toBeLessThan(3)
  const control=page.locator('[data-grammar-controls]');await expect(control).toHaveCount(1)
  if(['Word Type','Sentence Role','Case Endings'].includes(activity)){
   await expect(control.getByRole('switch',{name:'Auto Next'})).toBeVisible()
   await expect(control).toHaveCSS('column-gap','24px');await expect(control).toHaveCSS('row-gap','16px')
   if(width>=390&&activity!=='Case Endings'){const level=(await page.locator('[data-practice-level]').boundingBox())!,toggle=(await control.getByRole('switch',{name:'Auto Next'}).boundingBox())!;expect(Math.abs(level.y+level.height/2-toggle.y-toggle.height/2)).toBeLessThan(3)}
  }
  await page.getByRole('switch',{name:'Auto Next'}).uncheck();await options.getByRole('button').first().click()
  const feedback=page.locator('[data-grammar-feedback]');await expect(feedback).toBeVisible();await expect(options).toBeHidden();await expect(feedback.getByRole('button',{name:'Next',exact:true})).toBeVisible()
  const result=(await area.boundingBox())!,visible=(await feedback.boundingBox())!
  expect(Math.abs(result.height-visible.height)).toBeLessThan(3)
  expect(await feedback.evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  if(activity==='Case Endings')await page.screenshot({path:`test-results/audit-grammar-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'Back to Grammar',exact:true}).click()
 }
})
test('My List reuses full Library artwork and always opens Book Detail',async({page,context})=>{
 await signIn(context);await page.setViewportSize({width:1440,height:1000});await page.goto('/books')
 const library=page.getByRole('link',{name:'Test Book cover Test Book',exact:true}),art=library.getByRole('img'),src=await art.getAttribute('src')
 await expect(art).toHaveCSS('object-fit','contain');const bounds=(await art.boundingBox())!;expect(bounds.width/bounds.height).toBeCloseTo(2/3,2)
 await page.goto('/');const list=page.getByRole('region',{name:'My List',exact:true}),book=list.getByRole('link',{name:'Test Book cover Test Book',exact:true})
 await book.scrollIntoViewIfNeeded();await expect(book).toHaveAttribute('href','/books/test-book');await expect(book.getByRole('img')).toHaveCSS('object-fit','contain');await expect(book.getByRole('img')).toHaveCSS('transform','none')
 const image=book.getByRole('img'),home=(await image.boundingBox())!;expect(home.width/home.height).toBeCloseTo(2/3,2)
 // Optimizer width may differ; the canonical source must be identical.
 const canonical=(value:string)=>new URL(value,'http://fixture').searchParams.get('url')??value
 expect(canonical((await image.getAttribute('src'))!)).toBe(canonical(src!))
 await page.screenshot({path:'test-results/audit-my-list.png',fullPage:true});await book.click();await expect(page).toHaveURL(/\/books\/test-book$/);await expect(page.locator('#reader-content:visible')).toHaveCount(0)
})
test('For You preserves audible intent after rejection and respects explicit mute on re-entry',async({page,context,request})=>{
 await signIn(context)
 await request.post(`${backend}/fixture/for-you-playback`);await installYouTubeFixture(page)
 await page.addInitScript(()=>{Object.assign(window,{__ytRejectAudible:true})});await page.setViewportSize({width:390,height:900});await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'Tap the video to play with sound.'})).toBeVisible()
 const state=()=>page.evaluate(()=>{const w=window as unknown as {__ytPlayers:{playing:boolean;muted:boolean;volume:number}[]};const p=w.__ytPlayers.at(-1)!;return {playing:p.playing,muted:p.muted,volume:p.volume,preference:localStorage.getItem('awm-explore-sound-enabled-v1')}})
 expect(await state()).toMatchObject({playing:false,muted:false,volume:100,preference:null})
 await page.evaluate(()=>Object.assign(window,{__ytRejectAudible:false}))
 // A normal toolbar interaction must also provide a valid recovery gesture.
 await page.getByRole('button',{name:'Playback speed',exact:true}).click();await expect.poll(state).toMatchObject({playing:true,muted:false,preference:null})
 await page.getByRole('button',{name:'Mute clip',exact:true}).click();await expect.poll(state).toMatchObject({muted:true,preference:'muted'})
 await page.getByRole('button',{name:'Explore feed',exact:true}).click();await page.getByRole('button',{name:'For You feed',exact:true}).click();await expect.poll(state).toMatchObject({muted:true,preference:'muted'})
})
