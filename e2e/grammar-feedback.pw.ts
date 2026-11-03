import {test,expect,type BrowserContext} from '@playwright/test'
import curriculum from '../app/grammar/mobile-curriculum.json'
import {wordPatternInventory} from '../app/grammar/preparedQuestions'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext){
 const id='11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'learner@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [390,1440]){
 test(`Word Search wrong selection stays visual and vocabulary wraps centrally at ${width}`,async({page,request})=>{
  await request.post(`${backend}/fixture/word-search`);await page.setViewportSize({width,height:1000});await page.goto('/word-search')
  await page.getByRole('button',{name:/Easy difficulty/}).click();await page.getByRole('button',{name:'Start Easy',exact:true}).click()
  const grid=page.getByRole('grid');await expect(grid).toBeVisible()
  const before=await grid.boundingBox(),first=grid.locator('[data-row="0"][data-col="0"]'),second=grid.locator('[data-row="0"][data-col="1"]')
  const a=(await first.boundingBox())!,b=(await second.boundingBox())!
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:3});await page.mouse.up()
  await expect(first).toHaveAttribute('data-selection-state','incorrect',{timeout:200})
  await expect(page.locator('main').last().getByRole('alert')).toHaveCount(0)
  const after=await grid.boundingBox();expect(after!.y).toBeCloseTo(before!.y,1);expect(after!.height).toBeCloseTo(before!.height,1)
  await page.waitForTimeout(300);await expect(first).toHaveAttribute('data-selection-state','idle')
  await expect(page.getByText(/That line is not|Drag across a complete word/)).toHaveCount(0)
  const chips=page.locator('[data-word-search-vocabulary] > div').first()
  await expect(chips).toHaveCSS('justify-content','center');await expect(chips).toHaveCSS('flex-wrap','wrap');await expect(chips).toHaveAttribute('dir','rtl')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`test-results/feedback-word-search-${width}.png`,fullPage:true})
 })
 test(`Grammar feedback, timing, manual corrections and shared preferences at ${width}`,async({page,context})=>{
  await signIn(context);await page.setViewportSize({width,height:1000});await page.goto('/grammar');await page.getByRole('button',{name:'Sentence Role',exact:true}).click()
  const question=page.locator('[data-grammar-question]'),options=page.locator('[data-grammar-options]'),feedback=page.locator('[data-grammar-feedback]')
  const firstId=await question.getAttribute('data-grammar-question')
  const correct=options.getByRole('button',{name:'Doer / subject of the verb',exact:true});await correct.focus();await page.keyboard.press('Enter')
  await expect(feedback).toHaveAttribute('data-grammar-feedback','correct');await expect(feedback).toBeFocused();await expect(options).toBeHidden()
  expect((await options.boundingBox())).toBeNull();expect((await question.boundingBox())!.height).toBeGreaterThan(0)
  const icon=feedback.locator('svg'),heading=feedback.getByRole('heading',{name:'Correct',exact:true});expect((await icon.boundingBox())!.width).toBeGreaterThan(48)
  expect((await icon.boundingBox())!.y).toBeLessThan((await heading.boundingBox())!.y)
  await expect(question).not.toHaveAttribute('data-grammar-question',firstId!,{timeout:4500})
  const wrongId=await question.getAttribute('data-grammar-question')
  await options.getByRole('button').filter({hasNotText:'Direct object'}).first().click();await expect(feedback).toHaveAttribute('data-grammar-feedback','incorrect')
  await page.waitForTimeout(4200);await expect(question).toHaveAttribute('data-grammar-question',wrongId!)
  await feedback.getByRole('button',{name:'Next',exact:true}).click()
  await page.getByRole('switch',{name:'Auto Next',exact:true}).uncheck()
  await page.getByRole('button',{name:'Back to Grammar',exact:true}).click();await page.getByRole('button',{name:'Case Endings',exact:true}).click()
  await expect(page.getByRole('switch',{name:'Auto Next',exact:true})).not.toBeChecked()
  const caseId=await question.getAttribute('data-grammar-question'),arabic=question.locator('[data-grammar-arabic]').first(),vocalised=await arabic.textContent()
  expect(vocalised).toMatch(/[\u064b-\u065f]/)
  await page.getByRole('switch',{name:'Show Tashkīl',exact:true}).uncheck();expect(await arabic.textContent()).not.toMatch(/[\u064b-\u065f\u0670]/)
  await expect(question).toHaveAttribute('data-grammar-question',caseId!)
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('switch',{name:'Tashkīl',exact:true})).not.toBeChecked();await page.getByRole('switch',{name:'Tashkīl',exact:true}).check();await page.getByRole('button',{name:'Done',exact:true}).click()
  await expect(arabic).toHaveText(vocalised!);await expect(page.getByRole('switch',{name:'Show Tashkīl',exact:true})).toBeChecked()
  await options.getByRole('button').filter({hasText:'Nominative'}).click();await expect(feedback).toHaveAttribute('data-grammar-feedback','correct')
  await page.waitForTimeout(4200);await expect(question).toHaveAttribute('data-grammar-question',caseId!)
  await page.screenshot({path:`test-results/feedback-case-correct-${width}.png`,fullPage:true})
  await feedback.getByRole('button',{name:'Next',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Word Type',exact:true}).click();await expect(page.getByRole('switch',{name:'Auto Next',exact:true})).not.toBeChecked()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 })
 test(`Patterns cover the complete reviewed inventory and explain answers at ${width}`,async({page,context})=>{
  await signIn(context);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});await page.goto('/grammar');await page.getByRole('button',{name:'Word Patterns',exact:true}).click()
  await page.getByRole('switch',{name:'Auto Next',exact:true}).uncheck();const workspace=page.locator('[data-prepared-question]'),feedback=page.locator('[data-grammar-feedback]'),seen:string[]=[]
  await expect(page.getByRole('button',{name:'Information',exact:true})).toHaveCount(0)
  for(let i=0;i<24;i++){
   if(i===12)await page.getByRole('button',{name:'More practice',exact:true}).click()
   await expect(workspace).toBeVisible();const id=(await workspace.getAttribute('data-prepared-question'))!
   const pattern=wordPatternInventory.find(p=>id===`reviewed-pattern-${p.id}`||id.endsWith(`:${p.id}`))!
   expect(pattern).toBeTruthy();expect(seen.slice(-3)).not.toContain(pattern.id);seen.push(pattern.id)
   await workspace.locator('[data-grammar-options]').getByRole('button',{name:pattern.pattern,exact:true}).click()
   await expect(feedback).toHaveAttribute('data-grammar-feedback','correct');await expect(feedback).toContainText(pattern.pattern);await expect(feedback).toContainText(pattern.note)
   if(i===0)await page.screenshot({path:`test-results/feedback-patterns-${width}.png`,fullPage:true})
   await feedback.getByRole('button',{name:'Next',exact:true}).click()
  }
  expect(new Set(seen.slice(0,12)).size).toBe(wordPatternInventory.length);expect(new Set(seen.slice(12)).size).toBe(wordPatternInventory.length)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 })
 test(`Context and weak identification use explanations while flashcards stay lightweight at ${width}`,async({page,context})=>{
  await signIn(context);await page.setViewportSize({width,height:1000});await page.goto('/grammar');await page.getByRole('button',{name:'Context Ṣarf',exact:true}).click();await page.getByRole('switch',{name:'Auto Next',exact:true}).uncheck()
  const options=page.locator('[data-grammar-options]'),feedback=page.locator('[data-grammar-feedback]')
  const formId=(await page.locator('[data-prepared-question]').getAttribute('data-prepared-question'))!.split(':').at(-1)!
  const formLabel=/^\d+$/.test(formId)?`Form ${['I','II','III','IV','V','VI','VII','VIII','IX','X'][Number(formId)-1]}`:(curriculum.quadriliteral as Record<string,{label:string}>)[formId].label
  await options.getByRole('button',{name:formLabel,exact:true}).click();await expect(feedback).toHaveAttribute('data-grammar-feedback','correct');await expect(feedback).toContainText(`The stem matches ${formLabel} (`);await expect(feedback).toContainText('Here:')
  await page.screenshot({path:`test-results/feedback-context-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'Back to Grammar',exact:true}).click();await page.getByRole('button',{name:'Weak Verbs',exact:true}).click();const root=await page.locator('[data-grammar-arabic]').nth(1).textContent(),card=curriculum.weakCards.find(c=>c.root===root)!;expect(card).toBeTruthy();await options.getByRole('button',{name:`${card.typeLabel} \u00b7 ${card.typeArabic}`,exact:true}).click();await expect(feedback).toHaveAttribute('data-grammar-feedback','correct');await expect(feedback).toContainText(card.description.split(/(?<=[.!?])\s+/)[0])
  expect((await feedback.textContent())!.length).toBeGreaterThan(40)
  await page.getByRole('button',{name:'Back to Grammar',exact:true}).click();await page.getByRole('button',{name:'Revise the Ten Forms',exact:true}).click();await page.getByRole('button',{name:'Shuffle',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click()
  await expect(page.getByText('Recall the pattern, characteristic features and an example.')).toHaveCount(0)
  await expect(page.getByRole('switch',{name:'Auto Next',exact:true})).toHaveCount(0)
  await page.getByRole('button',{name:'Reveal answer',exact:true}).click();await expect(page.getByRole('button',{name:'Next Form',exact:true})).toBeVisible();await expect(feedback).toHaveCount(0)
 })
}
