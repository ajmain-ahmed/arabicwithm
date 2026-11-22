import { test, expect, type BrowserContext, type Page, type Locator } from '@playwright/test'
import { installYouTubeFixture } from './helpers/youtube'
import { observeRuntime } from './helpers/runtimeDiagnostics'
const backend = `https://localhost:${process.env.AWM_TEST_BACKEND_PORT ?? '4368'}`
const ids = { free:'11111111-1111-4111-8111-111111111111', premium:'22222222-2222-4222-8222-222222222222', admin:'44444444-4444-4444-8444-444444444444' }
const note = '/grammar/notes/12345678-1234-4123-8123-123456789003'
const episode = '/cartoons/test-show/clip-0'
async function account(context: BrowserContext, kind: keyof typeof ids = 'free') {
  const id=ids[kind], expires=Math.floor(Date.now()/1000)+3600, encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
  const user={id,aud:'authenticated',role:'authenticated',email:`${kind}@fixture.example`,created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
  const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
  await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
async function healthy(page: Page) {
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toHaveCount(0)
}
async function hit(control: Locator) {
  await control.scrollIntoViewIfNeeded()
  await expect(control).toBeVisible()
  await expect.poll(()=>control.evaluate(el=>{const b=el.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return top===el||el.contains(top)}),{timeout:2000,message:'The control must receive pointer events after transitions settle'}).toBe(true)
  await control.click()
}
async function finishChapter(page: Page) {
  const pager=page.getByRole('navigation',{name:'Chapter pages'})
  await expect(pager).toBeVisible()
  const match=(await pager.innerText()).match(/Page (\d+) of (\d+)/)!
  expect(match).toBeTruthy()
  for(let current=Number(match[1]);current<Number(match[2]);current++){
    await pager.getByRole('button',{name:'Next Page',exact:true}).click()
    await expect(pager).toContainText(`Page ${current+1} of ${match[2]}`)
  }
  await expect(page.getByRole('link',{name:'All Chapters',exact:true})).toBeVisible()
}
test.beforeEach(async ({ page, request, browserName }) => {
  // v1.63 Firefox can retain a stale pending-document record after a committed
  // page. Disable only that coarse driver precheck; URL, response, visible DOM,
  // actionability and real pointer hit-tests below remain mandatory.
  if(browserName==='firefox')process.env.PLAYWRIGHT_SKIP_NAVIGATION_CHECK='1'
  await request.post(`${backend}/fixture/english-for-you`)
  await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true}})
  await installYouTubeFixture(page)
})

const publicRoutes=['/','/explore','/explore?view=foryou','/cartoons','/cartoons?view=shows','/cartoons/test-show',episode,'/books','/books?mode=listen','/books/test-book','/books/test-book/chapter-1','/listen/test-book','/learn','/grammar','/grammar/context',...['A1','A2','B1','B2','C1','C2'].map(level=>`/grammar/context/${level}`),note,'/memory','/profile','/search','/explore/search','/word-search','/feedback','/support','/privacy','/terms','/reset-password','/transcripts/abababab-abab-4bab-8bab-abababababab']
for (const width of [390,1440]) test(`every public route direct and refreshed, signed out at ${width}`,async({page})=>{
  test.setTimeout(240000)
  await page.setViewportSize({width,height:1000})
  const runtime=await observeRuntime(page,test.info().project.name),rows:unknown[]=[]
  for(const path of publicRoutes){
    const response=await page.goto(path,{waitUntil:'domcontentloaded'});expect(response!.status()).toBeLessThan(400);await healthy(page)
    await page.reload({waitUntil:'domcontentloaded'});await healthy(page)
    rows.push({path,direct:'PASS',refresh:'PASS',width})
  }
  await test.info().attach('route-health',{body:JSON.stringify({rows},null,2),contentType:'application/json'});await runtime.assert(test.info())
})

for(const width of [320,375,390,414,430,768,1024,1440]) test(`connected learner flows and hit testing at ${width}`,async({page,context})=>{
  test.setTimeout(150000)
  await account(context);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'})
  const runtime=await observeRuntime(page,test.info().project.name)
  await page.goto('/learn');await page.locator('main a[href="/grammar"]').first().click();await expect(page).toHaveURL('/grammar')
  await expect(page.getByRole('link',{name:'Grammar in Context',exact:true})).toHaveCount(0)
  for(const retired of ['/grammar/context', '/grammar/context/A1', note]) { await page.goto(retired);await expect(page).toHaveURL('/grammar');await healthy(page) }
  await page.goto('/grammar');await hit(page.getByRole('button',{name:'Revise Naḥw Rules',exact:true}));await expect(page).toHaveURL(/activity=rules/)
  await page.reload();await expect(page.getByRole('heading',{name:'A1',exact:true})).toBeVisible();await page.goBack();await expect(page).toHaveURL('/grammar');await expect(page.getByRole('button',{name:'Revise Naḥw Rules',exact:true})).toBeVisible()
  await page.goForward();await expect(page).toHaveURL(/activity=rules/);await page.getByRole('link',{name:'Back to Grammar',exact:true}).click()
  await hit(page.getByRole('button',{name:'Word Type',exact:true}));await expect(page.locator('[data-grammar-question]')).toBeVisible();await page.getByRole('link',{name:'Back to Grammar',exact:true}).click()
  await hit(page.getByRole('button',{name:'Revise the Ten Forms',exact:true}));await hit(page.getByRole('button',{name:'Start',exact:true}));await hit(page.getByRole('button',{name:'Reveal answer',exact:true}));await expect(page.getByRole('button',{name:'Next Form',exact:true})).toBeVisible()
  await page.goto('/cartoons?view=shows');await page.locator('main a[href="/cartoons/test-show"]').first().click();await expect(page).toHaveURL('/cartoons/test-show');await page.locator(`main a[href="${episode}"]`).first().click();await healthy(page)
  await expect(page.getByRole('tab',{name:'Grammar Notes',exact:true})).toHaveCount(0)
  await hit(page.getByRole(width<900?'tab':'button',{name:'Settings',exact:true}).filter({visible:true}));await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
  await hit(page.getByRole(width<900?'tab':'button',{name:'Memory',exact:true}).filter({visible:true}));await expect(page).toHaveURL(/\/memory\?episode=/);await healthy(page)
  await page.goBack();await expect(page).toHaveURL(episode);await healthy(page);await page.goBack();await expect(page).toHaveURL('/cartoons/test-show');await page.goForward();await expect(page).toHaveURL(episode)
  await page.goto('/books');await page.locator('main a[href="/books/test-book"]').filter({visible:true}).first().click();await page.locator('main a[href="/books/test-book/chapter-1"]').first().click();await expect(page.locator('#reader-content:visible')).toBeVisible()
  const pages=page.getByRole('navigation',{name:'Chapter pages'});await hit(pages.getByRole('button',{name:'Next Page',exact:true}));await hit(pages.getByRole('button',{name:'Previous Page',exact:true}))
  await hit(page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}));await page.getByRole('button',{name:'Close reading settings',exact:true}).click()
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(pages).toBeVisible()
  await finishChapter(page)
  await page.getByRole('link',{name:'Next Chapter',exact:true}).click();await expect(page).toHaveURL(/\/chapter-6/);await expect(page.getByRole('heading',{name:'Sixth Chapter',exact:true})).toBeVisible()
  await finishChapter(page)
  await page.getByRole('link',{name:'All Chapters',exact:true}).click();await expect(page).toHaveURL('/books/test-book')
  await page.locator('main a[href="/books/test-book/grammar-structured"]').first().click();await expect(page.locator('#reader-content:visible')).toHaveAttribute('data-reader-mode','structured')
  await page.goBack();await expect(page).toHaveURL('/books/test-book');await page.goForward();await expect(page).toHaveURL(/grammar-structured/);await page.reload();await healthy(page)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`${process.env.AWM_RELIABILITY_ARTIFACT_DIR ?? 'docs/validation/full-reliability'}/${test.info().project.name}-${width}.png`})
  await runtime.assert(test.info())
})

test('URL tabs, profile settings and membership are restored by Back and Forward for every role',async({page,context})=>{
  for(const kind of ['free','premium','admin'] as const){
   for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000})
    await context.clearCookies();await account(context,kind)
    const profile=`/profile/${ids[kind]}`
    await page.goto(profile,{waitUntil:'domcontentloaded'});await healthy(page)
    await page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).click();await expect(page).toHaveURL(`${profile}?tab=settings`)
    await page.getByRole('button',{name:'AWM+',exact:true}).filter({visible:true}).click();await expect(page).toHaveURL(`${profile}?tab=awm`)
    await page.goBack();await expect(page).toHaveURL(`${profile}?tab=settings`);await expect(page.locator('#profile-settings')).toBeVisible()
    await page.goForward();await expect(page).toHaveURL(`${profile}?tab=awm`);await page.reload({waitUntil:'domcontentloaded'});await healthy(page)
    const response=await page.goto('/books',{waitUntil:'domcontentloaded'});expect([200,304]).toContain(response!.status())
    const committed=await page.evaluate(()=>({url:location.pathname,ready:document.readyState,library:!!document.querySelector('[aria-label="Library mode"]')}))
    await test.info().attach(`library-commit-${kind}-${width}`,{body:JSON.stringify(committed),contentType:'application/json'})
    expect(committed.url).toBe('/books');expect(committed.ready).not.toBe('loading')
    await expect(page.getByRole('group',{name:'Library mode',exact:true})).toBeVisible();await hit(page.getByRole('button',{name:'Listen',exact:true}));await expect(page).toHaveURL('/books?mode=listen');await page.goBack();await expect(page).toHaveURL('/books');await page.goForward();await expect(page).toHaveURL('/books?mode=listen')
    await page.goto('/cartoons',{waitUntil:'domcontentloaded'});await healthy(page);await hit(page.getByRole('button',{name:'Show all shows',exact:true}));await expect(page).toHaveURL('/cartoons?view=shows');await page.goBack();await expect(page).toHaveURL('/cartoons');await page.goForward();await expect(page).toHaveURL('/cartoons?view=shows')
   }
  }
})

test('retired grammar context URLs redirect even when historical notes are unavailable',async({page,request})=>{
  await request.post(`${backend}/fixture/reliability`,{data:{reset:true,rules:[{path:'/rest/v1/grammar_notes',remaining:-1,status:503}]}})
  await page.goto('/grammar/context/A1');await expect(page).toHaveURL('/grammar');await healthy(page)
  await request.post(`${backend}/fixture/reliability`,{data:{reset:true}})
  await page.goto('/grammar/notes/00000000-0000-4000-8000-000000000000');await expect(page).toHaveURL('/grammar');await healthy(page)
})

test('all protected route entries preserve denial and Admin read access',async({page,context})=>{
  test.setTimeout(180000)
  const routes=['/admin','/admin/shows','/admin/episodes','/admin/episodes/dddddddd-dddd-4ddd-8ddd-ddddddddddd0','/admin/books','/admin/books/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','/admin/books/preview/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','/admin/featured','/admin/grammar-notes','/admin/hans-wehr','/admin/phrases','/admin/reviews','/admin/transcripts','/admin/users']
  for(const route of routes){await page.goto(route,{waitUntil:'domcontentloaded'});await expect(page).toHaveURL('/');await healthy(page)}
  await account(context,'admin')
  const rows=[]
  for(const route of [...routes,'/reviewer']){const response=await page.goto(route,{waitUntil:'domcontentloaded'});expect(response!.status()).toBeLessThan(400);const destination=route==='/admin'||route==='/admin/episodes'?'/admin/shows':route;await expect(page).toHaveURL(url=>url.pathname===destination);await expect(page.locator('[data-awm-page-error]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toHaveCount(0);rows.push({route,status:'PASS'})}
  await test.info().attach('protected-route-health',{body:JSON.stringify(rows),contentType:'application/json'})
})

for(const width of [390,1440])test(`Explore and For You playback, languages, filters, settings and history at ${width}`,async({page,context})=>{
  await account(context,'premium');await page.setViewportSize({width,height:1000})
  await page.goto('/explore');await expect(page.locator('[data-explore-player="active"]').filter({visible:true}).first()).toBeVisible()
  await hit(page.getByRole('button',{name:'For You feed',exact:true}).filter({visible:true}))
  await expect(page).toHaveURL('/explore?view=foryou');await expect(page.locator('[data-for-you-source]')).toBeVisible()
  const first=await page.locator('[data-for-you-source]').getAttribute('data-for-you-source')
  await hit(page.getByRole('button',{name:'Next video',exact:true}).filter({visible:true}));await expect(page.locator('[data-for-you-source]')).not.toHaveAttribute('data-for-you-source',first!)
  await hit(page.getByRole('button',{name:'Previous video',exact:true}).filter({visible:true}));await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source',first!)
  await hit(page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}));await expect(page.getByRole('switch').first()).toBeVisible();await page.keyboard.press('Escape')
  if(width<900)await hit(page.locator('[data-mobile-language-toggle]').filter({visible:true}))
  else await hit(page.getByRole('button',{name:'EN',exact:true}))
  await expect(page.locator('[data-for-you-source]')).toBeVisible();await expect(page.locator('[data-for-you-source] [lang="en"]').filter({visible:true}).first()).toBeVisible()
  await hit(page.getByRole('button',{name:'Filter content',exact:true}).filter({visible:true}));await expect(page.getByRole('checkbox',{name:'All groups',exact:true})).toBeVisible();await page.getByRole('button',{name:'Apply',exact:true}).click()
  await page.goBack();await expect(page).toHaveURL('/explore');await expect(page.locator('[data-explore-player="active"]').filter({visible:true}).first()).toBeVisible();await page.goForward();await expect(page).toHaveURL('/explore?view=foryou');await expect(page.locator('[data-for-you-source]')).toBeVisible();await page.reload();await healthy(page)
})
