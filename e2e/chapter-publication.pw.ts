import {test,expect,type BrowserContext} from '@playwright/test'
import {existsSync,readFileSync} from 'node:fs'
import type {Locator} from '@playwright/test'
import {ids,records,masteryIds,learningStages,stageActivities} from '../app/lib/structuredLearning'
import {record,text,type StructuredChapter,type StructuredRecord} from '../app/lib/structuredChapter'
const backend='https://localhost:4358'
const actual:StructuredChapter|null=existsSync('test-fixtures/ag-ch-002.json')?JSON.parse(readFileSync('test-fixtures/ag-ch-002.json','utf8')):null
async function answerActivity(fieldset:Locator,activity:StructuredRecord,answer:StructuredRecord){
 const kind=text(record(activity.interaction)?.kind)
 if(kind==='single-choice'||kind==='multiple-select')for(const id of ids(answer.correct_choice_ids))await fieldset.locator(`input[value="${id}"]`).check()
 if(['matching','classification','fill-blank'].includes(kind)){
  const expected=record(answer[kind==='matching'?'correct_pairs':kind==='classification'?'correct_categories':'correct_fields'])??{}
  for(const [id,value]of Object.entries(expected)){
   const control=fieldset.locator(`[data-field-id="${id}"]`)
   if(kind==='fill-blank')await control.fill(Array.isArray(value)?String(value[0]):String(value));else await control.selectOption(String(value))
  }
 }
 if(kind==='ordering'){
  for(const [index,id]of ids(answer.correct_order).entries()){
   let current=await fieldset.locator('li').evaluateAll((list,target)=>list.findIndex(li=>li.getAttribute('data-tile-id')===target),id)
   while(current>index){await fieldset.locator(`[data-tile-id="${id}"]`).getByRole('button',{name:/up/}).click();current--}
  }
 }
 if(kind==='short-text')await fieldset.locator('textarea').fill('My explanation for comparison with the authored model.')
 await fieldset.getByRole('button',{name:record(activity.interaction)?.grading==='self-check'?'Show model answer':'Check answer',exact:true}).click()
 if(record(activity.interaction)?.grading==='automatic')await expect(fieldset.getByRole('status')).toContainText('Correct.')
 else await expect(fieldset.getByRole('status')).toContainText('not automatically scored')
}
async function signIn(context:BrowserContext,role='admin'){
 const id=role==='admin'?'44444444-4444-4444-8444-444444444444':role==='editor'?'33333333-3333-4333-8333-333333333333':'11111111-1111-4111-8111-111111111111'
 const expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),user={id,aud:'authenticated',role:'authenticated',email:`${role}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [320,390,430,768,1024,1440])test(`Admin previews token, partial and structured drafts at ${width}px`,async({page,context})=>{
 await signIn(context);await page.setViewportSize({width,height:1000})
 for(const [id,title] of [['10','A book. Paragraph 1.'],['11','missing the sections list'],['12','The Government of the Adjective']]){
  await page.goto(`/admin/books/preview/abababab-abab-4bab-8bab-0000000000${id}`)
  await expect(page.getByRole('alert').first()).toContainText('This chapter is not currently public')
  await expect(page.locator('#reader-content:visible')).toContainText(title)
  await expect(page.getByRole('link',{name:'Back to Admin Books'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await expect(page.getByRole('link',{name:'Previous chapter'})).toHaveAttribute('href','/admin/books/preview/abababab-abab-4bab-8bab-000000000011')
 await page.screenshot({path:`test-results/admin-structured-preview-${width}.png`,fullPage:true})
})
for(const role of ['guest','user','editor'])test(`${role} cannot enter the protected draft preview`,async({page,context})=>{
 if(role!=='guest')await signIn(context,role)
 await page.goto('/admin/books/preview/abababab-abab-4bab-8bab-000000000010')
 await expect(page).not.toHaveURL(/\/admin\/books\/preview/)
 await expect(page.locator('#reader-content')).toHaveCount(0)
})
test('ordinary public navigation, counts, direct chapter reads and hidden parent stay gated',async({page,context})=>{
 await signIn(context,'user');await page.goto('/books/test-book')
 await expect(page.getByRole('link',{name:/Unpublished|Incomplete chapter|Actual ag-ch-002/})).toHaveCount(0)
 for(const slug of ['draft-token','draft-incomplete','draft-structured']){
  await page.goto(`/books/test-book/${slug}`);await expect(page.locator('#reader-content')).toHaveCount(0)
 }
 await page.goto('/books/unreleased-book/hidden-parent');await expect(page.locator('#reader-content')).toHaveCount(0)
})
test('Admin list includes existing drafts and publication can be deliberately changed without modifying content',async({page,context,request})=>{
 await signIn(context);const before=await (await request.post(`${backend}/fixture/publication`,{data:{}})).json()
 await page.goto('/admin/books');await page.getByRole('button',{name:'Expand chapters for Test Book',exact:true}).click()
 await expect(page.getByRole('link',{name:'Unpublished token chapter',exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Incomplete chapter',exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Unpublished structured chapter',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Edit chapter Unpublished token chapter',exact:true}).click()
 const dialog=page.getByRole('dialog');await dialog.getByRole('switch',{name:'Publish chapter (Book must also be released)'}).check();await dialog.getByRole('button',{name:/Save/}).last().click();await expect(dialog).not.toBeVisible()
 const after=await (await request.post(`${backend}/fixture/publication`,{data:{}})).json()
 expect(after.chapters.find((c:{slug:string})=>c.slug==='draft-token').is_published).toBe(true);expect(after.contentDigest).toBe(before.contentDigest)
 await request.post(`${backend}/fixture/publication`,{data:{slug:'draft-token',published:false}})
})

for(const width of [320,390,430,768,1024,1440])test(`exact ag-ch-002 interactions, stages and layout at ${width}px`,async({page,context})=>{
 test.skip(!actual,'The exact ag-ch-002 attachment is absent. No alternate chapter is used.')
 test.setTimeout(360000)
 const chapter=actual!
 expect(chapter.id).toBe('ag-ch-002');expect(chapter.schema_version).toBe('1.1.0');expect(chapter.sections).toHaveLength(10);expect(records(chapter.activities)).toHaveLength(94);expect(records(chapter.answers)).toHaveLength(94);expect(records(chapter.references)).toHaveLength(3)
 const before=JSON.stringify(chapter),stages=learningStages(chapter),answers=new Map(records(chapter.answers).map(a=>[text(a.question_id),a]))
 await signIn(context);await page.setViewportSize({width,height:1000});await page.goto('/admin/books/preview/abababab-abab-4bab-8bab-000000000013')
 const pane=page.locator('#reader-content:visible'),pagination=page.getByRole('navigation',{name:'Chapter pages',exact:true}),next=pagination.getByRole('button',{name:'Next Page',exact:true})
 await expect(pane).toContainText(text(chapter.title_en));await expect(pane).toContainText(text(chapter.title_ar));await next.click()
 const seenKinds=new Set<string>()
 for(const stage of stages){
  await expect(pane.getByRole('heading',{name:text(stage.title_en),exact:true})).toBeVisible()
  for(const id of ids(stage.section_ids)){
   const section=records(chapter.sections).find(s=>s.id===id)
   if(text(section?.title_en))await expect(pane).toContainText(text(section?.title_en))
  }
  const activities=stageActivities(chapter,stage)
  for(const activity of activities){
   const id=text(activity.id),fieldset=pane.locator(`[id="question-${id}"]`),answer=answers.get(id)
   expect(answer).toBeDefined();seenKinds.add(text(record(activity.interaction)?.kind))
   if(text(activity.hint_en))await expect(fieldset.locator('details')).not.toHaveAttribute('open','')
   await answerActivity(fieldset,activity,answer!)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
  if(masteryIds(chapter,stage).length){await pane.getByRole('button',{name:'Submit mastery check',exact:true}).click();await expect(pane.getByRole('status').last()).toContainText('Stage complete')}
  const review=pane.locator('details').filter({has:page.locator('summary').getByText('Review the lesson',{exact:true})})
  if(await review.count()){await review.locator('summary').first().click();await expect(review).toHaveAttribute('open','')}
  await pane.screenshot({path:`test-results/ag-ch-002-${width}-${text(stage.id)}.png`});await next.click()
 }
 await expect(pane.getByRole('heading',{name:'References',exact:true})).toBeVisible()
 expect([...seenKinds].sort()).toEqual(['classification','fill-blank','matching','multiple-select','ordering','short-text','single-choice'])
 expect(JSON.stringify(chapter)).toBe(before)
 await page.reload();await expect(pane.getByRole('heading',{name:'References',exact:true})).toBeVisible()
})
