import {test,expect,type BrowserContext} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const baseline=JSON.parse(readFileSync('test-fixtures/legacy-reader-baseline.json','utf8')).sha256 as Record<string,string>
const fixture=JSON.parse(readFileSync('test-fixtures/structured-chapter.json','utf8'))
async function signIn(context:BrowserContext){
 const id='22222222-2222-4222-8222-222222222222',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'premium@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

for(const width of [390,1440])test(`legacy reader markup remains identical at ${width}px`,async({page,context},info)=>{
 await signIn(context);await page.setViewportSize({width,height:1000})
 for(const view of ['lines','book'])for(const language of ['ar','en']){
  await page.goto(`/books/test-book/chapter-1?lang=${language}`)
  await page.evaluate(view=>{localStorage.setItem('awm-book-reader-view',view);window.dispatchEvent(new Event('awm-book-reader-view-change'))},view)
  const pane=page.locator('#reader-content:visible');await expect(pane).toHaveAttribute('data-reader-mode',view)
  await expect(pane.locator('[data-reader-block]').first()).toBeVisible()
  if(language==='en'||view==='lines')await expect(pane).toContainText('A book. Paragraph 1.');else await expect(pane).toContainText(/\p{Script=Arabic}/u)
  const markup=await pane.innerHTML(),key=`${width}-${view}-${language}`
  if(info.project.name==='chrome')expect(createHash('sha256').update(markup).digest('hex')).toBe(baseline[key])
 }
})

for(const width of [320,390,430,768,1024,1440])test(`structured lesson works end to end at ${width}px`,async({page,context})=>{
 await signIn(context);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto('/books/test-book/grammar-structured')
 const pane=page.locator('#reader-content:visible'),pages=page.getByRole('navigation',{name:'Chapter pages'})
 await expect(pane).toHaveAttribute('data-reader-mode','structured')
 await expect(pane).toContainText(fixture.title_ar);await expect(pane).toContainText(fixture.title_en)
 await expect(pages).toContainText('Page 1 of 10')
 const noOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await noOverflow()
 // Current reader settings remain shared; language changes do not discard the bilingual lesson.
 await page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'English',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Classic',exact:true}).click()
 const size=page.getByRole('slider',{name:'Book text size',exact:true});await size.focus();await size.press('ArrowRight')
 await page.getByRole('button',{name:'Close reading settings',exact:true}).click()
 await expect(pane).toContainText(fixture.title_ar)
 expect(await pane.evaluate(el=>el.style.getPropertyValue('--structured-arabic-font'))).toContain('var(--font-book-amiri)')
 expect(Number(await pane.evaluate(el=>el.style.getPropertyValue('--structured-scale')))).toBeGreaterThan(1)
 const next=pages.getByRole('button',{name:'Next Page',exact:true})
 await next.click();await expect(pane.locator('table')).toBeVisible();await expect(pane.locator('th')).toHaveText(['Word','Irab','Why'])
 await expect(pane.getByLabel('Arabic sentence analysis').locator('[lang="ar"]').first()).toContainText(fixture.sections[1].blocks[0].segments[0].text_ar)
 if(width<768){const table=pane.getByRole('region',{name:'Word / Irab / Why',exact:true});expect(await table.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);await table.focus();await table.press('ArrowRight');await expect(pages).toContainText('Page 2 of 10')}
 await noOverflow();await pane.screenshot({path:`test-results/${test.info().project.name}-structured-rule-${width}.png`})
 await next.click();await expect(pane.getByLabel('Grammatical analysis')).toBeVisible();await expect(pane).toContainText(fixture.sections[2].blocks[0].arabic);await noOverflow()
 await next.click();await expect(pane.getByRole('figure')).toBeVisible();await expect(pane.getByLabel('Directional relationships').locator('li')).toHaveCount(3);await noOverflow()
 await pane.screenshot({path:`test-results/${test.info().project.name}-structured-diagram-${width}.png`})
 await next.click();await next.click()
 const details=pane.locator('details').first();await expect(details).not.toHaveAttribute('open','')
 await details.locator('summary').first().click();await expect(details).toHaveAttribute('open','');await expect(pane).toContainText('Nested common mistake explanation.');await noOverflow()
 await next.click();await expect(pane).toContainText('not supported yet');await expect(pane).toContainText('remains readable')
 await next.click();await expect(pane.locator('fieldset')).toHaveCount(8);await pane.getByRole('radio').first().check();await expect(pane.getByRole('radio').first()).toBeChecked()
 await pane.getByRole('textbox').first().fill('Self-study notes');await noOverflow()
 await next.click();
 await expect(pane.locator('[data-answer-for]').first()).not.toBeVisible()
 await pane.getByText('Show answers',{exact:true}).click();await expect(pane.locator('[data-answer-for="qa-q02"]')).toContainText('Question 2');await expect(pane).toContainText('QA answer 2.');await noOverflow()
 await next.click();await expect(pane.getByRole('link')).toHaveCount(3);await expect(pane.getByRole('link').first()).toHaveAttribute('rel','noopener noreferrer');await noOverflow()
 await expect(page.getByRole('navigation',{name:'Chapter navigation',exact:true})).toBeVisible()
 await page.reload();await expect(pages).toContainText('Page 10 of 10')
 await pages.getByRole('button',{name:'Previous Page',exact:true}).click();await expect(pages).toContainText('Page 9 of 10')
 await page.getByRole('link',{name:'Test Book',exact:true}).first().click();await expect(page).toHaveURL('/books/test-book')
})
for(const slug of ['grammar-future','grammar-broken'])test(`structured diagnostic stays inside reader shell for ${slug}`,async({page,context})=>{
 await signIn(context);await page.goto(`/books/test-book/${slug}`)
 await expect(page.locator('#reader-content:visible')).toContainText('This chapter needs a content update')
 await expect(page.getByRole('link',{name:'All Chapters',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true})).toBeVisible()
})
test('structured chapter retains the existing audiobook player and language controls',async({page,context})=>{
 await signIn(context);await page.goto('/books/test-book/grammar-structured')
 await page.getByRole('button',{name:'Audio',exact:true}).filter({visible:true}).click()
 await expect(page.getByRole('group',{name:'Audio language'}).filter({visible:true})).toBeVisible()
 await page.getByRole('button',{name:'Play audio',exact:true}).filter({visible:true}).click()
 await expect.poll(async()=>page.locator('audio').first().evaluate(el=>!(el as HTMLAudioElement).paused)).toBe(true)
 await page.getByRole('button',{name:'English audio',exact:true}).filter({visible:true}).click()
 await expect(page.getByRole('button',{name:'English audio',exact:true}).filter({visible:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.locator('#reader-content:visible')).toHaveAttribute('data-reader-mode','structured')
})
