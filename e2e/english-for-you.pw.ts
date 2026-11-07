import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
import example from './english-for-you-data.json'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,390,768,1024,1440])test(`English source hierarchy, full transcript and AR regression ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/english-for-you`);await installYouTubeFixture(page)
 await page.setViewportSize({width,height:1000});await page.goto('/explore?view=foryou')
 const language=page.getByRole('group',{name:'Source video language'}).filter({visible:true})
 // AR is still the default, using its existing token-first presentation.
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(page.locator('[data-english-for-you]:visible')).toHaveCount(0)
 await language.getByRole('button',{name:'EN',exact:true}).click()
 const area=page.locator(width<900?'[data-mobile-clip-transcript]':'[data-desktop-clip-transcript]')
 await expect(area.locator('[data-english-for-you]').first()).toBeVisible();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 const line=area.locator('[data-english-for-you]').first(),pairs=line.locator('[data-english-token]')
 await expect(pairs.locator('[lang=en]')).toHaveText(['Give','my','creature','life']);await expect(pairs.locator('[lang=ar]')).toHaveText(example.tokens.map(t=>t.arabic))
 await expect(line.locator('[data-sentence-translation]')).toHaveText(example.translation);await expect(line.locator('[data-sentence-translation]')).toHaveAttribute('dir','rtl')
 for(let i=0;i<4;i++){
  const geometry=await pairs.nth(i).evaluate(el=>{const en=el.querySelector('[lang=en]')!.getBoundingClientRect(),ar=el.querySelector('[lang=ar]')!.getBoundingClientRect();return {en:en.toJSON(),ar:ar.toJSON(),children:[...el.children].map(c=>c.getAttribute('lang'))}})
  expect(geometry.children).toEqual(['en','ar']);expect(geometry.ar.y).toBeGreaterThanOrEqual(geometry.en.bottom-.01);expect(geometry.ar.x+geometry.ar.width/2).toBeCloseTo(geometry.en.x+geometry.en.width/2,0)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`test-results/english-for-you-${width}.png`,fullPage:true})
 const full=page.getByRole('button',{name:width<900?'Short':'Full',exact:true}).filter({visible:true});await full.click()
 await expect(area.locator('[data-english-for-you]')).toHaveCount(1)
 await page.locator('[data-for-you-source] iframe').contentFrame().getByRole('slider',{name:'Native timeline fixture'}).fill('55')
 await expect(area.locator('[data-english-token] [lang=en]')).toHaveText(['Give','my','creature','life']);await expect(area.locator('[data-sentence-translation]')).toHaveText(example.translation)
 await language.getByRole('button',{name:'AR',exact:true}).click();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(area.locator('[data-english-for-you]')).toHaveCount(0)
 const ar=area.locator(width<900?'[data-mobile-token]':'[data-active-token],span.MuiBox-root').filter({has:page.locator('[lang=ar]')}).first()
 if(width<900){await expect(ar.locator('[lang=ar]')).toContainText('\u0643\u062a\u0627\u0628');await expect(ar.locator('[lang=en]')).toHaveText('book')}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('EN short mode resolves the stored raw translation once when the RPC omits it',async({page,request})=>{
 await request.post(`${backend}/fixture/english-for-you`,{data:{rawTranslationOnly:true}});await installYouTubeFixture(page);await page.setViewportSize({width:390,height:1000});await page.goto('/explore?view=foryou')
 await page.getByRole('group',{name:'Source video language'}).filter({visible:true}).getByRole('button',{name:'EN',exact:true}).click()
 const area=page.locator('[data-mobile-clip-transcript]');await expect(area.locator('[data-sentence-translation]').first()).toHaveText(example.translation)
 await page.locator('[data-for-you-source] iframe').contentFrame().getByRole('slider',{name:'Native timeline fixture'}).fill('16')
 await expect(area.locator('[data-active-segment=true] [data-english-token] [lang=en]')).toHaveText(['Give','my','creature','life'])
 const log=await(await request.get(`${backend}/fixture/request-log`)).json();expect(log.tables.filter((table:string)=>table==='transcript_segments')).toHaveLength(1)
})
