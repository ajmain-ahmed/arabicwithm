import {test,expect,type Page} from '@playwright/test'
test.skip(true,'Public English-source For You is temporarily paused; renderer coverage remains in unit tests and Transcript Library.')
import {installYouTubeFixture} from './helpers/youtube'
import {readFileSync} from 'node:fs'
const fixture:typeof import('./english-upload-subtitle-data.json')=JSON.parse(readFileSync(new URL('./english-upload-subtitle-data.json',import.meta.url),'utf8'))
const backend='https://localhost:4347'
async function language(page:Page,width:number,target:'ar'|'en'){
 if(width<900){const button=page.locator('[data-mobile-language-toggle]:visible');if((await button.innerText()).trim()!==target.toUpperCase())await button.click()}
 else await page.getByRole('group',{name:'Source video language'}).filter({visible:true}).getByRole('button',{name:target.toUpperCase(),exact:true}).click()
}
for(const width of [390,1440])test(`English-first real upload, wrapping, native seeks and Arabic restoration ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/english-for-you`,{data:{subtitleLayout:true,seek:true}})
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore?view=foryou')
 const area=page.locator(width<900?'[data-mobile-clip-transcript]':'[data-desktop-clip-transcript]')
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(area.locator('[data-english-for-you]')).toHaveCount(0)
 if(width<900){await expect(area.locator('[data-mobile-token] [lang=en]').first()).toHaveText('book')}
 await language(page,width,'en')
 const source=page.locator('[data-for-you-source]'),active=area.locator('[data-active-segment=true]')
 await expect(source.locator('iframe')).toBeVisible()
 async function assertSegment(position:number){
  const row=fixture.segments[position],pairs=active.locator('[data-english-token]')
  await expect(pairs.locator('[lang=en]')).toHaveText(row.tokens.map(t=>t.english))
  await expect(pairs.locator('[lang=ar]')).toHaveText(row.tokens.map(t=>t.arabic))
  await expect(active.locator('[data-sentence-translation]')).toHaveText(row.translation)
  await expect(active.locator('[data-sentence-translation]')).toHaveAttribute('lang','ar')
  await expect(active.locator('[data-sentence-translation]')).toHaveAttribute('dir','rtl')
 }
 await assertSegment(0);await expect(active.locator('[data-english-source]')).toHaveAttribute('dir','ltr')
 const pairs=active.locator('[data-english-token]'),bounds:{x:number;y:number}[]=[]
 for(let i=0;i<fixture.segments[0].tokens.length;i++){
  const geometry=await pairs.nth(i).evaluate(el=>{const ar=el.querySelector('[lang=ar]')!,en=el.querySelector('[lang=en]')!;return {pair:el.getBoundingClientRect().toJSON(),ar:ar.getBoundingClientRect().toJSON(),en:en.getBoundingClientRect().toJSON(),arSize:parseFloat(getComputedStyle(ar).fontSize),lineHeight:parseFloat(getComputedStyle(ar).lineHeight),children:[...el.children].map(c=>c.getAttribute('lang'))}})
  expect(geometry.children).toEqual(['en','ar']);expect(geometry.ar.y).toBeGreaterThanOrEqual(geometry.en.bottom-.1);expect(Math.abs(geometry.ar.x+geometry.ar.width/2-geometry.en.x-geometry.en.width/2)).toBeLessThan(1);expect(geometry.arSize).toBeGreaterThanOrEqual(20);expect(geometry.lineHeight).toBeGreaterThan(geometry.arSize*1.6)
  const previous=bounds.at(-1);if(previous&&Math.abs(previous.y-geometry.pair.y)<1)expect(geometry.pair.x).toBeGreaterThan(previous.x)
  bounds.push(geometry.pair)
 }
 if(width<900)expect(new Set(bounds.map(b=>Math.round(b.y))).size).toBeGreaterThan(1)
 const sentenceBounds=(await active.locator('[data-sentence-translation]').boundingBox())!,rowBounds=(await active.locator('[data-english-source]').boundingBox())!
 expect(sentenceBounds.y).toBeGreaterThanOrEqual(rowBounds.y+rowBounds.height-.1)
 await active.screenshot({path:`test-results/${test.info().project.name}-english-subtitle-${width}.png`})
 await pairs.first().click()
 const definition=page.getByRole('dialog',{name:'Word definition'})
 await expect(definition).toContainText(fixture.segments[0].tokens[0].english)
 await expect(definition).toContainText(fixture.segments[0].tokens[0].arabic)
 await page.keyboard.press('Escape');await expect(definition).not.toBeVisible()
 // Use the real saved 18:28, 18:38 and 18:40 timings, including the existing overlapping segments.
 const native=source.locator('iframe').contentFrame(),timeline=native.getByRole('slider',{name:'Native timeline fixture'}),play=native.getByRole('button',{name:'Native play/pause fixture'})
 const players=await page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)
 await timeline.fill('1119');await assertSegment(1)
 await play.click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)).toBe(false)
 await timeline.fill('1121');await assertSegment(3);await timeline.fill('1109');await assertSegment(0)
 await timeline.fill('1119');await assertSegment(1)
 expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)).toBe(players)
 await language(page,width,'ar');await expect(source.locator('iframe')).toBeVisible();await expect(area.locator('[data-english-for-you]')).toHaveCount(0)
 await language(page,width,'en');await assertSegment(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const log=await(await request.get(`${backend}/fixture/request-log`)).json();expect(log.tables.filter((name:string)=>name==='transcript_segments')).toHaveLength(1)
 await page.getByRole('button',{name:'Next video',exact:true}).filter({visible:true}).click()
 await assertSegment(0)
})
