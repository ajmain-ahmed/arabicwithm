const backendUrl = `https://localhost:${process.env.AWM_TEST_BACKEND_PORT ?? 4310}`
const webUrl = `http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT ?? 3000}`
import {test,expect,type Page,type BrowserContext} from '@playwright/test'
const ids={free:'11111111-1111-4111-8111-111111111111',premium:'22222222-2222-4222-8222-222222222222',admin:'44444444-4444-4444-8444-444444444444'}
async function signIn(context:BrowserContext,kind:keyof typeof ids){
 const id=ids[kind],expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 const user={id,aud:'authenticated',role:'authenticated',email:kind+'@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{full_name:kind+' learner'}}
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
async function playAudio(page:Page){
 await page.getByRole('button',{name:'Play Audio',exact:true}).click()
 try { await expect.poll(()=>page.locator('audio').evaluate((el:HTMLAudioElement)=>el.readyState)).toBeGreaterThan(0) } catch (error) { console.info('Media diagnostic',await page.locator('audio').evaluate((el:HTMLAudioElement)=>({src:el.src,currentSrc:el.currentSrc,error:el.error?.code,networkState:el.networkState,readyState:el.readyState})));throw error }
 if(await page.locator('audio').evaluate((el:HTMLAudioElement)=>el.paused))await page.getByRole('button',{name:'Play Audio',exact:true}).click()
 await expect.poll(()=>page.locator('audio').evaluate((el:HTMLAudioElement)=>el.paused)).toBe(false)
}
test.beforeEach(async({request})=>{await request.post(`${backendUrl}/fixture/reset-overhaul`)})
test('Support has two deliberate lines, a shared hero and no mobile clipping',async({page})=>{
 for(const width of [320,375,1280]){
  await page.setViewportSize({width,height:900});await page.goto('/support')
  const title=page.getByRole('heading',{name:'Support Arabic with M'})
  await expect(title).toBeVisible()
  const layout=await title.evaluate(el=>{const spans=[...el.children] as HTMLElement[];return {count:spans.length,same:spans[1].textContent,first:spans[0].getBoundingClientRect().top,second:spans[1].getBoundingClientRect().top,overflow:spans[1].scrollWidth>spans[1].clientWidth,hero:getComputedStyle(el.parentElement!).backgroundImage}})
  expect(layout.count).toBe(2);expect(layout.same).toBe('Arabic with M');expect(layout.second).toBeGreaterThan(layout.first);expect(layout.overflow).toBe(false);expect(layout.hero).toContain('hero.avif')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await expect(page.getByRole('button',{name:/Support Arabic with M/})).toHaveCSS('color','rgb(255, 255, 255)')
  if(width===375)await page.screenshot({path:'docs/validation/website/support-mobile.png',fullPage:true})
 }
})
test('guests sign in for books, free readers read and get an audio upgrade',async({page,context})=>{
 await page.goto('/books/test-book/chapter-1');await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Play Audio',exact:true})).toHaveCount(0)
 await signIn(context,'free');await page.reload();await expect(page.getByRole('heading',{name:'First Chapter',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Play Audio',exact:true}).click();await expect(page.getByRole('dialog').getByText('Upgrade to AWM+', {exact:true})).toBeVisible();await expect(page.locator('audio')).toHaveCount(0)
})
test('actual audio stops both ways and never starts the other language automatically',async({page,context})=>{
 await signIn(context,'premium');await page.setViewportSize({width:375,height:812});await page.goto('/books/test-book/chapter-1?lang=en')
 await page.getByRole('button',{name:'Book view',exact:true}).click();await page.getByRole('button',{name:'English',exact:true}).click()
 for(const language of ['Arabic','English']){
  await page.getByRole('button',{name:'Play Audio',exact:true}).click()
  await expect.poll(()=>page.locator('audio').evaluate((el:HTMLAudioElement)=>el.paused)).toBe(false)
  await page.evaluate(()=>Object.assign(window,{__previousAudio:document.querySelector('audio')}))
  await page.getByRole('button',{name:language,exact:true}).click()
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {__previousAudio:HTMLAudioElement}).__previousAudio.paused)).toBe(true)
  await expect(page.locator('audio')).toHaveCount(0);await expect(page.getByRole('button',{name:'Play Audio',exact:true})).toBeVisible()
 }
 await expect(page.getByRole('group',{name:'Reading view',exact:true})).toHaveCSS('background-color','rgba(0, 0, 0, 0)')
 await page.getByRole('navigation',{name:'Chapter navigation'}).scrollIntoViewIfNeeded()
 const controls=page.getByRole('navigation',{name:'Chapter navigation'})
 const bottom=await controls.evaluate(el=>el.getBoundingClientRect().bottom)
 expect(bottom).toBeLessThan(812-72)
})
test('free Memory completes, recap survives reload and second start explains the limit',async({page,context})=>{
 await signIn(context,'free');await page.goto('/memory');await page.getByRole('button',{name:'Start',exact:true}).click()
 for(let i=0;i<4;i++){await page.getByRole('button',{name:'Reveal',exact:true}).click();await page.getByRole('button',{name:'Knew it',exact:true}).click()}
 await expect(page.getByText('Deck complete',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Practise again',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible()
 await page.reload();await page.getByRole('button',{name:/View saved recap/}).click();await expect(page.getByText('Deck complete',{exact:true})).toBeVisible()
})
test('Premium starts several Memory sessions without a daily limit',async({page,context})=>{
 await signIn(context,'premium');await page.goto('/memory');await page.getByRole('button',{name:'Start',exact:true}).click()
 for(let i=0;i<4;i++){await page.getByRole('button',{name:'Reveal',exact:true}).click();await page.getByRole('button',{name:'Knew it',exact:true}).click()}
 await page.getByRole('button',{name:'Practise again',exact:true}).click();await expect(page.getByText('Card 1 of 4',{exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('manual Premium persists and grants actual audio; revocation restores free access',async({page,context,browser})=>{
 await signIn(context,'admin');await page.goto('/admin/users');await page.getByLabel('Search by name or email').fill('free@')
 await page.getByRole('button',{name:'View User'}).click();await page.getByLabel('Reason for Premium change').fill('Browser integration test')
 await page.getByRole('button',{name:'Grant Premium',exact:true}).click();await expect(page.getByText('Premium access saved. Paid subscription access is unchanged.')).toBeVisible()
 const learner=await browser.newContext({ignoreHTTPSErrors:true});await signIn(learner,'free');const read=await learner.newPage();await read.goto(`${webUrl}/books/test-book/chapter-1`);await read.bringToFront();await playAudio(read)
 await read.goto(`${webUrl}/profile`);await read.getByText('AWM+ active',{exact:true}).scrollIntoViewIfNeeded();await read.getByRole('button',{name:'AWM+ active',exact:true}).click();await expect(read.getByRole('dialog').getByRole('button',{name:'Continue learning',exact:true})).toBeVisible();await read.getByRole('dialog').getByRole('button',{name:'Continue learning',exact:true}).click();await expect(read.getByRole('dialog')).toHaveCount(0);await read.goto(`${webUrl}/books/test-book/chapter-1`)
 await page.getByLabel('Reason for Premium change').fill('Revoke test grant');await page.getByRole('button',{name:'Revoke manual Premium',exact:true}).click();await expect(page.getByText('Premium access saved. Paid subscription access is unchanged.')).toBeVisible()
 await read.reload();await read.getByRole('button',{name:'Play Audio',exact:true}).click();await expect(read.getByRole('dialog')).toBeVisible();await expect(read.locator('audio')).toHaveCount(0);await learner.close()
})
test('book review writes the existing personal record and restores after refresh',async({page,context})=>{
 await signIn(context,'free');await page.goto('/books/test-book');await page.getByRole('button',{name:'Leave a Review',exact:true}).click();await page.getByLabel('Your review',{exact:true}).fill('A helpful story.');await page.getByRole('button',{name:'Save review',exact:true}).click();await expect(page.getByText('Review saved.')).toBeVisible()
 await page.reload();await page.getByRole('button',{name:'Leave a Review',exact:true}).click();await expect(page.getByLabel('Your review',{exact:true})).toHaveValue('A helpful story.');await expect(page.getByRole('heading',{name:/average|reviews/i})).toHaveCount(0)
})
test('earned trophy additions and an empty cabinet survive refresh',async({page,context,request})=>{
 await signIn(context,'free');await request.post(`${backendUrl}/fixture/earned`,{data:{userId:ids.free}})
 await page.goto('/profile');await page.getByRole('button',{name:'Open Trophy Cabinet'}).click()
 const dialog=page.getByRole('dialog');await expect(dialog.locator('[aria-label^="Level 10."]').locator('..').getByRole('button',{name:'Add to cabinet'})).toHaveCount(0);const trophy=dialog.locator('[aria-label^="Word Explorer 1."]').locator('..')
 while(await dialog.getByRole('button',{name:'Remove from cabinet'}).count())await dialog.getByRole('button',{name:'Remove from cabinet'}).first().click()
 await trophy.getByRole('button',{name:'Add to cabinet'}).click();await dialog.getByRole('button',{name:'Save trophy highlights'}).click();await expect(dialog.getByText('Trophy highlights saved.')).toBeVisible();await page.reload()
 await expect(page.getByRole('button',{name:'Open Trophy Cabinet'})).toContainText('Word Explorer 1')
 await page.getByRole('button',{name:'Open Trophy Cabinet'}).click();await page.getByRole('dialog').getByRole('button',{name:'Remove from cabinet'}).click();await page.getByRole('button',{name:'Save trophy highlights'}).click();await expect(page.getByText('Trophy highlights saved.')).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Open Trophy Cabinet'})).not.toContainText('Word Explorer 1')
})

test('free readers can open later chapters and Explore omits transcript search',async({page,context})=>{
 await page.goto('/explore');await expect(page.getByRole('link',{name:/Search transcripts/i})).toHaveCount(0)
 await signIn(context,'free');await page.goto('/books/test-book/chapter-6');await expect(page.getByRole('heading',{name:'Sixth Chapter',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('mobile PDF and review controls match and clear the fixed navigation',async({page,context})=>{
 await signIn(context,'free');await page.setViewportSize({width:375,height:812});await page.goto('/books/test-book')
 const pdf=page.getByRole('button',{name:/Download PDF/i}),review=page.getByRole('button',{name:'Leave a Review',exact:true})
 await page.getByText('Download PDF',{exact:true}).scrollIntoViewIfNeeded();await expect(pdf).toBeVisible();await expect(review).toBeVisible()
 const a=await pdf.boundingBox(),b=await review.boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();expect(Math.abs(a!.height-b!.height)).toBeLessThan(2)
 await review.scrollIntoViewIfNeeded();await expect(review).toBeVisible();await page.screenshot({path:'docs/validation/website/book-actions-mobile.png'});await review.click();await expect(page.getByRole('region',{name:'Your book review'})).toBeVisible()
})

test('learning activity removes its level tile while the profile keeps its level',async({page,context})=>{
 await signIn(context,'free');await page.goto('/');await expect(page.getByRole('heading',{name:'Your learning activity',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/^Current level:/})).toHaveCount(0)
 await page.goto('/profile');await expect(page.getByText(/^Level 1 .*toward Level 2$/)).toBeVisible()
})
