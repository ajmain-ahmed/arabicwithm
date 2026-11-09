import {test,expect,type BrowserContext,type Page} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend='https://localhost:4347'
async function account(context:BrowserContext,id='44444444-4444-4444-8444-444444444444'){
 const expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),user={id,aud:'authenticated',role:'authenticated',email:'reliability@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
const failure=(page:Page)=>page.locator('[data-awm-page-error]')
test('repeated real application navigation, reload, new tab and history for public and Admin routes',async({page,context,request})=>{
 await page.setViewportSize({width:1440,height:1000});await request.post(`${backend}/fixture/english-for-you`);await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true}});await installYouTubeFixture(page)
 const records:{path:string;ms:number;status:number}[]=[],errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 async function check(path:string){
  const start=Date.now(),response=await page.goto(path,{waitUntil:'domcontentloaded'})
  // Firefox may keep its protocol navigation waiter pending on cached 304s.
  // Inspect the actual loaded document instead of relying on that waiter.
  await page.waitForFunction(()=>document.readyState!=='loading'&&Boolean(document.querySelector('main')))
  const state=await page.evaluate(()=>({failure:Boolean(document.querySelector('[data-awm-page-error]')),missing:[...document.querySelectorAll('h1')].some(el=>el.textContent==='Page not found'),transcript:[...document.querySelectorAll('h4')].some(el=>el.textContent==='Reliability transcript'&&el.getClientRects().length>0)}))
  expect(state.failure).toBe(false);expect(state.missing).toBe(false);if(path.startsWith('/transcripts/'))expect(state.transcript).toBe(true)
  records.push({path,ms:Date.now()-start,status:response!.status()});expect(response!.status()).toBeLessThan(400)
 }

 const transcript='/transcripts/abababab-abab-4bab-8bab-abababababab'
 for(let cycle=0;cycle<3;cycle++)for(const path of ['/', '/explore','/cartoons/test-show/clip-0','/books','/search',transcript])await check(path)
 await page.reload();await expect(failure(page)).toHaveCount(0)
 await page.goto('/learn');await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Watch',exact:true}).click();await expect(page).toHaveURL(/\/cartoons$/);await page.goBack();await expect(page).toHaveURL(/\/learn$/);await page.goForward();await expect(page).toHaveURL(/\/cartoons$/)
 await account(context)
 for(let cycle=0;cycle<3;cycle++)for(const path of ['/admin','/admin/transcripts','/admin/books',transcript+'?from=admin'])await check(path)
 await account(context);await page.reload();await expect(page).toHaveURL(/from=admin/);await expect(failure(page)).toHaveCount(0)
 const fresh=await context.newPage();await fresh.goto('/admin/transcripts');await expect(failure(fresh)).toHaveCount(0);await fresh.close()
 await test.info().attach('navigation-summary',{body:JSON.stringify({loads:records.length,records,errors},null,2),contentType:'application/json'});expect(errors).toEqual([])
})
test('one transient Admin read recovers; persistent failure has a working Reload',async({page,context,request})=>{
 await account(context);await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true,rules:[{path:'/rest/v1/rpc/admin_list_manual_drafts',remaining:1,status:503}]}})
 await page.goto('/admin/transcripts');await expect(page.getByRole('status',{name:'Loading transcripts...'})).toHaveCount(0);await expect(failure(page)).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Add Transcript',exact:true}).first()).toBeVisible()
 await expect.poll(async()=>{const log=await(await request.post(`${backend}/fixture/reliability`,{data:{}})).json();return log.hits.filter((h:{path:string})=>h.path.endsWith('admin_list_manual_drafts')).length}).toBe(2);await expect(page.getByText('Loading transcripts...', {exact:true})).toBeHidden()
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true,rules:[{path:'/rest/v1/rpc/admin_list_manual_transcripts',remaining:-1,status:503}]}})
 await page.reload();await expect(failure(page)).toBeVisible();await expect(page).toHaveURL(/\/admin\/transcripts$/);await expect(failure(page)).not.toContainText('PGRST')
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true}})
 let documents=0;page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())documents++})
 await failure(page).getByRole('button',{name:'Reload',exact:true}).click();await expect(failure(page)).toHaveCount(0);expect(documents).toBeGreaterThan(0)
})
test('Auth outages do not impersonate a signed-out Admin; recovery and real denial remain distinct',async({page,context,request})=>{
 await account(context);await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true,rules:[{path:'/auth/v1/user',remaining:-1,status:503}]}})
 await page.goto('/admin/transcripts');await expect(failure(page)).toBeVisible();await expect(page).toHaveURL(/\/admin\//)
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true}});await failure(page).getByRole('button',{name:'Reload',exact:true}).click();await expect(failure(page)).toHaveCount(0)
 await context.clearCookies();await page.goto('/admin/transcripts');await expect(page).toHaveURL(/\/$/)
})
test('public transcript failures stay errors, genuine missing transcripts stay 404s, empty search stays empty',async({page,request})=>{
 await installYouTubeFixture(page);await request.post(`${backend}/fixture/english-for-you`);await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true,rules:[{path:'/rest/v1/youtube_transcripts',remaining:-1,status:503}]}})
 await page.goto('/transcripts/abababab-abab-4bab-8bab-abababababab');await expect(failure(page)).toBeVisible();await expect(failure(page)).not.toContainText('PGRST')
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true}});await failure(page).getByRole('button',{name:'Reload',exact:true}).click();await expect(page.locator('iframe')).toBeVisible();await expect(failure(page)).toHaveCount(0)
 const missing=await page.goto('/transcripts/00000000-0000-4000-8000-000000000000');expect([200,404]).toContain(missing!.status());await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toBeVisible();await expect(failure(page)).toHaveCount(0)
 await request.post(`${backend}/fixture/reliability`,{data:{emptySearch:true}});await page.goto('/search');await page.getByLabel('Search learning content').fill('zznomatch');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByText('No matching content. Try another word or phrase.')).toBeVisible();await expect(failure(page)).toHaveCount(0)
})
test('supplied error illustration, both themes, responsive sizes and Go Home',async({page,request})=>{
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true,rules:[{path:'/rest/v1/youtube_transcripts',remaining:-1,status:503}]}})
 await page.goto('/transcripts/abababab-abab-4bab-8bab-abababababab');await expect(failure(page)).toBeVisible()
 for(const theme of ['dark','light'])for(const width of [320,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.evaluate(value=>{document.documentElement.dataset.theme=value},theme)
  const image=failure(page).locator('img');await expect(image).toHaveAttribute('src','/images/awm-error-goku.png');await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await failure(page).screenshot({path:`test-results/${test.info().project.name}-awm-error-${theme}-${width}.png`})
 }
 await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true}});await failure(page).getByRole('link',{name:'Go Home',exact:true}).click();await expect(page).toHaveURL(/\/$/)
})
