import {test,expect,type BrowserContext} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext){
 const id='22222222-2222-4222-8222-222222222222',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'premium@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [390,1440])test(`both reader modes paginate losslessly at ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/reader-pagination`,{data:{blocks:120}});await signIn(context)
 await context.addInitScript(()=>localStorage.setItem('awm-book-reader-view','book'))
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/books/test-book');await page.goto('/books/test-book/chapter-1?lang=ar')
 // Next's development streaming buffer can retain an inert server snapshot.
 const pane=page.locator('#reader-content:visible'),nav=page.getByRole('navigation',{name:'Chapter pages'})
 await expect(pane).toHaveAttribute('data-reader-mode','book');await expect(nav).toContainText(width<900?'Page 1 of 10':'Page 1 of 9')
 await expect(nav.getByRole('button',{name:'Previous Page',exact:true})).toBeDisabled()
 const size=width<900?12:14
 await expect(pane.locator('[data-reader-block]')).toHaveCount(size)
 expect(await pane.locator('*').count()).toBeLessThan(250)
 const rpcCount=async()=>((await(await request.get(`${backend}/fixture/request-log`)).json()).tables as string[]).filter(name=>name==='chapters').length
 const reads=await rpcCount(),history=await page.evaluate(()=>window.history.length)
 const ids:number[]=[]
 while(true){ids.push(...await pane.locator('[data-reader-block]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-reader-block')))))
  const next=nav.getByRole('button',{name:'Next Page',exact:true});if(!await next.count())break;await next.click()
 }
 expect(ids).toEqual(Array.from({length:120},(_,i)=>i));expect(await rpcCount()).toBe(reads);expect(await page.evaluate(()=>window.history.length)).toBe(history)
 await expect(page.getByRole('navigation',{name:'Chapter navigation',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Next Chapter',exact:true})).toBeVisible()
 await nav.getByRole('button',{name:'Previous Page',exact:true}).click();await expect(page.getByRole('navigation',{name:'Chapter navigation',exact:true})).toHaveCount(0)
 const anchor=await pane.locator('[data-reader-block]').first().getAttribute('data-reader-block')
 await page.getByRole('button',{name:'Line by line',exact:true}).click();await expect(pane).toHaveAttribute('data-reader-mode','lines');await expect(pane.locator('[data-reader-block]').first()).toHaveAttribute('data-reader-block',anchor!)
 await page.getByRole('button',{name:'Book view',exact:true}).click();await page.getByRole('group',{name:'Book view language'}).getByRole('button',{name:'English',exact:true}).click();await expect(pane.locator('[data-reader-block]').first()).toHaveAttribute('data-reader-block',anchor!);await expect(pane).toContainText('Reader block')
 await page.reload();await expect(pane).toHaveAttribute('data-reader-mode','book');await expect(pane.locator(`[data-reader-block="${anchor}"]`)).toHaveCount(1)
 await page.setViewportSize({width:width<900?1440:390,height:900});await expect(pane.locator(`[data-reader-block="${anchor}"]`)).toHaveCount(1)
 await page.goBack();await expect(page).toHaveURL('/books/test-book')
})

test('line pairs stay together through every mobile page and scroll to the new content',async({page,context,request})=>{
 await request.post(`${backend}/fixture/reader-pagination`,{data:{blocks:120}});await signIn(context)
 await page.setViewportSize({width:390,height:900});await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/books/test-book/chapter-1?lang=ar')
 const pane=page.locator('#reader-content:visible'),nav=page.getByRole('navigation',{name:'Chapter pages'})
 await expect(pane).toHaveAttribute('data-reader-mode','lines')
 const ids:number[]=[]
 while(true){
  ids.push(...await pane.locator('[data-reader-block]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-reader-block')))))
  await expect(pane.locator('[data-reader-block]').first()).toContainText('Reader block')
  const next=nav.getByRole('button',{name:'Next Page',exact:true});if(!await next.count())break
  await next.click()
  await expect.poll(()=>pane.evaluate(el=>Math.round(el.getBoundingClientRect().top))).toBeLessThan(120)
 }
 expect(ids).toEqual(Array.from({length:120},(_,i)=>i))
 const last=nav.getByRole('button',{name:'Previous Page',exact:true})
 await last.scrollIntoViewIfNeeded()
 const bounds=await last.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.y+bounds!.height).toBeLessThan(900-60)
})
test('page turns retain one active audiobook instance',async({page,context,request})=>{
 await request.post(`${backend}/fixture/reader-pagination`,{data:{blocks:60}});await signIn(context);await page.setViewportSize({width:390,height:900});await page.goto('/books/test-book/chapter-1?lang=ar')
 await page.locator('[data-reader-audio-trigger]').click();const audio=page.locator('audio');await expect(audio).toHaveCount(1)
 await expect.poll(()=>audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(false)
 await audio.evaluate(el=>{(window as unknown as {originalAudio:Element}).originalAudio=el;(el as HTMLAudioElement).currentTime=7})
 await page.getByRole('button',{name:'Next Page',exact:true}).click();await page.getByRole('button',{name:'Book view',exact:true}).click()
 expect(await audio.evaluate(el=>el===(window as unknown as {originalAudio:Element}).originalAudio)).toBe(true);expect(await audio.evaluate(el=>(el as HTMLAudioElement).currentTime)).toBeGreaterThanOrEqual(7)
 expect(await audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(false)
})

