# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-reliability.pw.ts >> URL tabs, profile settings and membership are restored by Back and Forward for every role
- Location: e2e\full-reliability.pw.ts:100:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('group', { name: 'Library mode', exact: true })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('group', { name: 'Library mode', exact: true }) with timeout 15000ms
  - waiting for getByRole('group', { name: 'Library mode', exact: true })
    - waiting for "http://127.0.0.1:3068/books" navigation to finish...
    - navigated to "http://127.0.0.1:3068/books"
    - waiting for "http://127.0.0.1:3068/books" navigation to finish...

```

```yaml
- banner:
  - navigation "Primary navigation":
    - link "Home":
      - /url: /
      - paragraph: Home
    - link "Explore":
      - /url: /explore
      - paragraph: Explore
    - link "Watch":
      - /url: /cartoons
      - paragraph: Watch
    - link "Read":
      - /url: /books
      - paragraph: Read
    - link "Learn":
      - /url: /learn
      - paragraph: Learn
  - button "ArabicWithM home": ArabicWithM
  - button "Switch to light mode"
  - button "Sign In"
- main
```

# Test source

```ts
  11  |   await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
  12  | }
  13  | async function healthy(page: Page) {
  14  |   await expect(page.locator('main')).toBeVisible()
  15  |   await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
  16  |   await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toHaveCount(0)
  17  | }
  18  | async function hit(control: Locator) {
  19  |   await control.scrollIntoViewIfNeeded()
  20  |   await expect(control).toBeVisible()
  21  |   await expect.poll(()=>control.evaluate(el=>{const b=el.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return top===el||el.contains(top)}),{timeout:2000,message:'The control must receive pointer events after transitions settle'}).toBe(true)
  22  |   await control.click()
  23  | }
  24  | async function history(page: Page, first: string, second: string, third: string) {
  25  |   await page.goto(first); await healthy(page)
  26  |   await page.locator(`a[href="${second}"]`).first().click(); await expect(page).toHaveURL(second); await healthy(page)
  27  |   await page.locator(`a[href="${third}"]`).first().click(); await expect(page).toHaveURL(third); await healthy(page)
  28  |   await page.goBack(); await expect(page).toHaveURL(second); await healthy(page)
  29  |   await page.goBack(); await expect(page).toHaveURL(first); await healthy(page)
  30  |   await page.goForward(); await expect(page).toHaveURL(second); await healthy(page)
  31  |   await page.reload(); await healthy(page)
  32  | }
  33  | async function finishChapter(page: Page) {
  34  |   const pager=page.getByRole('navigation',{name:'Chapter pages'})
  35  |   await expect(pager).toBeVisible()
  36  |   const match=(await pager.innerText()).match(/Page (\d+) of (\d+)/)!
  37  |   expect(match).toBeTruthy()
  38  |   for(let current=Number(match[1]);current<Number(match[2]);current++){
  39  |     await pager.getByRole('button',{name:'Next Page',exact:true}).click()
  40  |     await expect(pager).toContainText(`Page ${current+1} of ${match[2]}`)
  41  |   }
  42  |   await expect(page.getByRole('link',{name:'All Chapters',exact:true})).toBeVisible()
  43  | }
  44  | test.beforeEach(async ({ page, request }) => {
  45  |   await request.post(`${backend}/fixture/english-for-you`)
  46  |   await request.post(`${backend}/fixture/reliability`,{data:{reset:true,publicTranscript:true}})
  47  |   await installYouTubeFixture(page)
  48  | })
  49  | 
  50  | const publicRoutes=['/','/explore','/explore?view=foryou','/cartoons','/cartoons?view=shows','/cartoons/test-show',episode,'/books','/books?mode=listen','/books/test-book','/books/test-book/chapter-1','/listen/test-book','/learn','/grammar','/grammar/context',...['A1','A2','B1','B2','C1','C2'].map(level=>`/grammar/context/${level}`),note,'/memory','/profile','/search','/explore/search','/word-search','/practice','/practice/session','/feedback','/support','/privacy','/terms','/reset-password','/transcripts/abababab-abab-4bab-8bab-abababababab']
  51  | for (const width of [390,1440]) test(`every public route direct and refreshed, signed out at ${width}`,async({page})=>{
  52  |   test.setTimeout(240000)
  53  |   await page.setViewportSize({width,height:1000})
  54  |   const errors:string[]=[], rows:unknown[]=[]; page.on('pageerror',error=>errors.push(error.message))
  55  |   for(const path of publicRoutes){
  56  |     const response=await page.goto(path,{waitUntil:'domcontentloaded'});expect(response!.status()).toBeLessThan(400);await healthy(page)
  57  |     await page.reload({waitUntil:'domcontentloaded'});await healthy(page)
  58  |     rows.push({path,direct:'PASS',refresh:'PASS',width})
  59  |   }
  60  |   await test.info().attach('route-health',{body:JSON.stringify({rows,errors},null,2),contentType:'application/json'});expect(errors).toEqual([])
  61  | })
  62  | 
  63  | for(const width of [320,375,390,414,430,768,1024,1440]) test(`connected learner flows and hit testing at ${width}`,async({page,context})=>{
  64  |   test.setTimeout(150000)
  65  |   await account(context);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'})
  66  |   const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  67  |   await history(page,'/learn','/grammar','/grammar/context')
  68  |   await page.getByRole('link',{name:'Grammar in Context',exact:true}).click()
  69  |   await page.getByRole('link',{name:'A1',exact:true}).click();await healthy(page)
  70  |   await page.locator(`a[href="${note}"]`).click();await expect(page.getByRole('article')).toContainText('Real examples')
  71  |   await page.reload();await expect(page.getByRole('article')).toContainText('First Chapter')
  72  |   await page.getByRole('link',{name:'Back to Grammar Notes',exact:true}).click();await expect(page).toHaveURL('/grammar/context/A1')
  73  |   for(const level of ['A2','B1','B2','C1','C2']){await page.goto(`/grammar/context/${level}`);await expect(page.getByRole('status')).toContainText('No approved Grammar Notes')}
  74  |   await page.goto('/grammar');await hit(page.getByRole('button',{name:'Revise Naḥw Rules',exact:true}));await expect(page).toHaveURL(/activity=rules/)
  75  |   await page.reload();await expect(page.getByRole('heading',{name:'A1',exact:true})).toBeVisible();await page.goBack();await expect(page).toHaveURL('/grammar');await expect(page.getByRole('button',{name:'Revise Naḥw Rules',exact:true})).toBeVisible()
  76  |   await page.goForward();await expect(page).toHaveURL(/activity=rules/);await page.getByRole('link',{name:'Back to Grammar',exact:true}).click()
  77  |   await hit(page.getByRole('button',{name:'Word Type',exact:true}));await expect(page.locator('[data-grammar-question]')).toBeVisible();await page.getByRole('link',{name:'Back to Grammar',exact:true}).click()
  78  |   await hit(page.getByRole('button',{name:'Revise the Ten Forms',exact:true}));await hit(page.getByRole('button',{name:'Start',exact:true}));await hit(page.getByRole('button',{name:'Reveal answer',exact:true}));await expect(page.getByRole('button',{name:'Next Form',exact:true})).toBeVisible()
  79  |   await page.goto('/cartoons?view=shows');await page.locator('main a[href="/cartoons/test-show"]').first().click();await expect(page).toHaveURL('/cartoons/test-show');await page.locator(`main a[href="${episode}"]`).first().click();await healthy(page)
  80  |   await hit(page.getByRole(width<900?'tab':'button',{name:'Grammar Notes',exact:true}).filter({visible:true}));await expect(page.getByRole('dialog')).toContainText('Adjective')
  81  |   await page.getByRole('dialog').getByRole('button',{name:/Adjective/}).click();await expect(page.getByRole('dialog')).toContainText('Test Show');await page.getByRole('button',{name:'Back to Grammar Notes',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
  82  |   await hit(page.getByRole(width<900?'tab':'button',{name:'Settings',exact:true}).filter({visible:true}));await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
  83  |   await hit(page.getByRole(width<900?'tab':'button',{name:'Memory',exact:true}).filter({visible:true}));await expect(page).toHaveURL(/\/memory\?episode=/);await healthy(page)
  84  |   await page.goBack();await expect(page).toHaveURL(episode);await healthy(page);await page.goBack();await expect(page).toHaveURL('/cartoons/test-show');await page.goForward();await expect(page).toHaveURL(episode)
  85  |   await page.goto('/books');await page.locator('main a[href="/books/test-book"]').filter({visible:true}).first().click();await page.locator('main a[href="/books/test-book/chapter-1"]').first().click();await expect(page.locator('#reader-content:visible')).toBeVisible()
  86  |   const pages=page.getByRole('navigation',{name:'Chapter pages'});await hit(pages.getByRole('button',{name:'Next Page',exact:true}));await hit(pages.getByRole('button',{name:'Previous Page',exact:true}))
  87  |   await hit(page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}));await page.getByRole('button',{name:'Close reading settings',exact:true}).click()
  88  |   await expect(page.getByRole('dialog')).toHaveCount(0);await expect(pages).toBeVisible()
  89  |   await finishChapter(page)
  90  |   await page.getByRole('link',{name:'Next Chapter',exact:true}).click();await expect(page).toHaveURL(/\/chapter-6/);await expect(page.getByRole('heading',{name:'Sixth Chapter',exact:true})).toBeVisible()
  91  |   await finishChapter(page)
  92  |   await page.getByRole('link',{name:'All Chapters',exact:true}).click();await expect(page).toHaveURL('/books/test-book')
  93  |   await page.locator('main a[href="/books/test-book/grammar-structured"]').first().click();await expect(page.locator('#reader-content:visible')).toHaveAttribute('data-reader-mode','structured')
  94  |   await page.goBack();await expect(page).toHaveURL('/books/test-book');await page.goForward();await expect(page).toHaveURL(/grammar-structured/);await page.reload();await healthy(page)
  95  |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  96  |   await page.screenshot({path:`docs/validation/full-reliability/${test.info().project.name}-${width}.png`})
  97  |   expect(errors).toEqual([])
  98  | })
  99  | 
  100 | test('URL tabs, profile settings and membership are restored by Back and Forward for every role',async({page,context})=>{
  101 |   for(const kind of ['free','premium','admin'] as const){
  102 |    for(const width of [390,1440]){
  103 |     await page.setViewportSize({width,height:1000})
  104 |     await context.clearCookies();await account(context,kind)
  105 |     const profile=`/profile/${ids[kind]}`
  106 |     await page.goto(profile,{waitUntil:'domcontentloaded'});await healthy(page)
  107 |     await page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).click();await expect(page).toHaveURL(`${profile}?tab=settings`)
  108 |     await page.getByRole('button',{name:'AWM+',exact:true}).filter({visible:true}).click();await expect(page).toHaveURL(`${profile}?tab=awm`)
  109 |     await page.goBack();await expect(page).toHaveURL(`${profile}?tab=settings`);await expect(page.locator('#profile-settings')).toBeVisible()
  110 |     await page.goForward();await expect(page).toHaveURL(`${profile}?tab=awm`);await page.reload({waitUntil:'domcontentloaded'});await healthy(page)
> 111 |     await page.goto('/books',{waitUntil:'domcontentloaded'});await expect(page.getByRole('group',{name:'Library mode',exact:true})).toBeVisible();await hit(page.getByRole('button',{name:'Listen',exact:true}));await expect(page).toHaveURL('/books?mode=listen');await page.goBack();await expect(page).toHaveURL('/books');await page.goForward();await expect(page).toHaveURL('/books?mode=listen')
      |                                                                                                                                     ^ Error: expect(locator).toBeVisible() failed
  112 |     await page.goto('/cartoons',{waitUntil:'domcontentloaded'});await healthy(page);await hit(page.getByRole('button',{name:'Show all shows',exact:true}));await expect(page).toHaveURL('/cartoons?view=shows');await page.goBack();await expect(page).toHaveURL('/cartoons');await page.goForward();await expect(page).toHaveURL('/cartoons?view=shows')
  113 |    }
  114 |   }
  115 | })
  116 | 
  117 | test('failed grammar reads show recovery; real empty levels and missing notes remain distinct',async({page,request})=>{
  118 |   await request.post(`${backend}/fixture/reliability`,{data:{reset:true,rules:[{path:'/rest/v1/grammar_notes',remaining:-1,status:503}]}})
  119 |   await page.goto('/grammar/context/A1');await expect(page.locator('[data-awm-page-error]')).toBeVisible();await expect(page.locator('body')).not.toContainText('No approved Grammar Notes')
  120 |   await request.post(`${backend}/fixture/reliability`,{data:{reset:true}});await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(page.locator(`a[href="${note}"]`)).toBeVisible()
  121 |   await page.goto('/grammar/notes/00000000-0000-4000-8000-000000000000');await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toBeVisible()
  122 | })
  123 | 
  124 | test('all protected route entries preserve denial and Admin read access',async({page,context})=>{
  125 |   test.setTimeout(180000)
  126 |   const routes=['/admin','/admin/shows','/admin/episodes','/admin/episodes/dddddddd-dddd-4ddd-8ddd-ddddddddddd0','/admin/books','/admin/books/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','/admin/books/preview/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','/admin/featured','/admin/grammar-notes','/admin/hans-wehr','/admin/phrases','/admin/reviews','/admin/transcripts','/admin/users']
  127 |   for(const route of routes){await page.goto(route,{waitUntil:'domcontentloaded'});await expect(page).toHaveURL('/');await healthy(page)}
  128 |   await account(context,'admin')
  129 |   const rows=[]
  130 |   for(const route of [...routes,'/reviewer']){const response=await page.goto(route,{waitUntil:'domcontentloaded'});expect(response!.status()).toBeLessThan(400);const destination=route==='/admin'||route==='/admin/episodes'?'/admin/shows':route;await expect(page).toHaveURL(url=>url.pathname===destination);await expect(page.locator('[data-awm-page-error]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toHaveCount(0);rows.push({route,status:'PASS'})}
  131 |   await test.info().attach('protected-route-health',{body:JSON.stringify(rows),contentType:'application/json'})
  132 | })
  133 | 
  134 | for(const width of [390,1440])test(`Explore and For You playback, languages, filters, settings and history at ${width}`,async({page,context})=>{
  135 |   await account(context,'premium');await page.setViewportSize({width,height:1000})
  136 |   await page.goto('/explore');await expect(page.locator('[data-explore-player="active"]').filter({visible:true}).first()).toBeVisible()
  137 |   await hit(page.getByRole('button',{name:'For You feed',exact:true}).filter({visible:true}))
  138 |   await expect(page).toHaveURL('/explore?view=foryou');await expect(page.locator('[data-for-you-source]')).toBeVisible()
  139 |   const first=await page.locator('[data-for-you-source]').getAttribute('data-for-you-source')
  140 |   await hit(page.getByRole('button',{name:'Next video',exact:true}).filter({visible:true}));await expect(page.locator('[data-for-you-source]')).not.toHaveAttribute('data-for-you-source',first!)
  141 |   await hit(page.getByRole('button',{name:'Previous video',exact:true}).filter({visible:true}));await expect(page.locator('[data-for-you-source]')).toHaveAttribute('data-for-you-source',first!)
  142 |   await hit(page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}));await expect(page.getByRole('switch').first()).toBeVisible();await page.keyboard.press('Escape')
  143 |   if(width<900)await hit(page.locator('[data-mobile-language-toggle]').filter({visible:true}))
  144 |   else await hit(page.getByRole('button',{name:'EN',exact:true}))
  145 |   await expect(page.locator('[data-for-you-source]')).toBeVisible();await expect(page.locator('[data-for-you-source] [lang="en"]').filter({visible:true}).first()).toBeVisible()
  146 |   await hit(page.getByRole('button',{name:'Filter content',exact:true}).filter({visible:true}));await expect(page.getByRole('checkbox',{name:'All groups',exact:true})).toBeVisible();await page.getByRole('button',{name:'Apply',exact:true}).click()
  147 |   await page.goBack();await expect(page).toHaveURL('/explore');await expect(page.locator('[data-explore-player="active"]').filter({visible:true}).first()).toBeVisible();await page.goForward();await expect(page).toHaveURL('/explore?view=foryou');await expect(page.locator('[data-for-you-source]')).toBeVisible();await page.reload();await healthy(page)
  148 | })
  149 | 
```