import {test,expect,type Page} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
import fixture from './english-subtitle-data.json'
const backend='https://localhost:4347'

async function language(page:Page,width:number,target:'ar'|'en'){
 if(width<900){
  const button=page.locator('[data-mobile-language-toggle]:visible')
  if((await button.innerText()).trim()!==target.toUpperCase())await button.click()
 }else await page.getByRole('group',{name:'Source video language'}).filter({visible:true}).getByRole('button',{name:target.toUpperCase(),exact:true}).click()
}

for(const width of [320,390,430,768,1024,1440])test(`English Arabic-first subtitles, wrapping, native seeks and AR restoration ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/english-for-you`,{data:{subtitleLayout:true,seek:true}})
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore?view=foryou')
 const area=page.locator(width<900?'[data-mobile-clip-transcript]':'[data-desktop-clip-transcript]')
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(area.locator('[data-english-for-you]')).toHaveCount(0)
 if(width<900){await expect(area.locator('[data-mobile-token] [lang=ar]').first()).toContainText('كتاب');await expect(area.locator('[data-mobile-token] [lang=en]').first()).toHaveText('book')}
 await language(page,width,'en')
 const source=page.locator('[data-for-you-source]'),active=area.locator('[data-active-segment=true]')
 await expect(source.locator('iframe')).toBeVisible()
 async function assertSegment(position:number){
  const row=fixture.segments[position],pairs=active.locator('[data-english-token]')
  await expect(active.locator('[data-sentence-translation]')).toHaveText(row.english_text)
  const words=row.tokens.filter(t=>!/^[\p{P}\p{S}\s]+$/u.test(t.arabic))
  await expect(pairs.locator('[lang=ar]')).toHaveText(words.map((t,i)=>t.arabic+(position===0&&i===3?'؟':'')))
  await expect(pairs.locator('[lang=en]')).toHaveText(words.map(t=>t.english))
  await expect(active.locator('[data-sentence-translation]')).toHaveAttribute('lang','en')
 }
 await assertSegment(0)
 await expect(active.locator('[data-english-source]')).toHaveAttribute('dir','rtl')
 const pairs=active.locator('[data-english-token]')
 for(let i=0;i<4;i++){
  const geometry=await pairs.nth(i).evaluate(el=>{const ar=el.querySelector('[lang=ar]')!,en=el.querySelector('[lang=en]')!;return {ar:ar.getBoundingClientRect().toJSON(),en:en.getBoundingClientRect().toJSON(),arSize:parseFloat(getComputedStyle(ar).fontSize),enSize:parseFloat(getComputedStyle(en).fontSize),children:[...el.children].map(c=>c.getAttribute('lang'))}})
  expect(geometry.children).toEqual(['ar','en']);expect(geometry.en.y).toBeGreaterThanOrEqual(geometry.ar.bottom-.1);expect(Math.abs(geometry.ar.x+geometry.ar.width/2-geometry.en.x-geometry.en.width/2)).toBeLessThan(1);expect(geometry.arSize).toBeGreaterThan(geometry.enSize)
 }
 const sentenceBounds=(await active.locator('[data-sentence-translation]').boundingBox())!,rowBounds=(await active.locator('[data-english-source]').boundingBox())!
 expect(sentenceBounds.y).toBeGreaterThanOrEqual(rowBounds.y+rowBounds.height-.1)
 await active.screenshot({path:`test-results/${test.info().project.name}-english-subtitle-${width}.png`})
 const native=source.locator('iframe').contentFrame(),timeline=native.getByRole('slider',{name:'Native timeline fixture'}),play=native.getByRole('button',{name:'Native play/pause fixture'})
 await timeline.fill('20');await assertSegment(1)
 await play.click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)).toBe(false)
 await timeline.fill('36');await assertSegment(2);await timeline.fill('1');await assertSegment(0)
 await timeline.fill('55');await assertSegment(3)
 await timeline.fill('1');await timeline.fill('36');await timeline.fill('20');await assertSegment(1)
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)).toBe(false)
 await play.click();await timeline.fill('36');await assertSegment(2)
 await language(page,width,'ar');await expect(source.locator('iframe')).toBeVisible();await expect(area.locator('[data-english-for-you]')).toHaveCount(0)
 await language(page,width,'en');await assertSegment(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const log=await(await request.get(`${backend}/fixture/request-log`)).json()
 expect(log.tables.filter((name:string)=>name==='transcript_segments')).toHaveLength(1)
})
