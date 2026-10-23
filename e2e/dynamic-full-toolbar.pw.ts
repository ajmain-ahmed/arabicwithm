import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,360,390,430,900,1440])test(`dynamic Full transcript and shared controls at ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await request.post(`${backend}/fixture/dynamic-for-you`)
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 const source=page.locator('[data-for-you-source]'),panel=page.locator(width<900?'[data-mobile-clip-transcript]':'[data-desktop-clip-transcript]')
 await expect(source.locator('iframe')).toBeVisible();const id=await source.getAttribute('data-for-you-source')
 const mode=page.getByRole('group',{name:'Viewing mode',exact:true}).filter({visible:true})
 const geometry=()=>mode.getByRole('button').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el);return [Math.round(b.width*100)/100,Math.round(b.height*100)/100,s.padding,s.borderRadius,s.fontSize]}))
 const before=await geometry();expect(before[0]).toEqual(before[1])
 if(width<900){
  const toolbar=page.locator('[data-mobile-for-you-toolbar]')
  await expect(toolbar.getByRole('button',{name:'More playback controls'})).toHaveCount(0)
  for(const name of ['Previous video','Next video','Mute clip','Playback speed','Filter content','Settings','Explore feed','For You feed','Short','Full'])await expect(toolbar.getByRole('button',{name,exact:true})).toBeVisible()
  const dimensions=await toolbar.locator('.MuiIconButton-root').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return [b.width,b.height]}));for(const d of dimensions)expect(d).toEqual(dimensions[0])
  const y=await toolbar.getByRole('button').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return b.y+b.height/2}));expect(Math.max(...y)-Math.min(...y)).toBeLessThan(2)
  if(width>=360)expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
 }
 if(width>=900){
  const toolbar=page.locator('[data-desktop-for-you-toolbar]');await expect(toolbar).toBeVisible()
  for(const name of ['Explore feed','For You feed','Mute clip','Playback speed','Filter content','Settings'])await expect(toolbar.getByRole('button',{name,exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'More playback controls'})).toBeHidden()
  const y=await toolbar.getByRole('button').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return b.y+b.height/2}));expect(Math.max(...y)-Math.min(...y)).toBeLessThan(2)
 }
 await page.evaluate(()=>{(window as unknown as {__ytTime:(t:number)=>void}).__ytTime(501)})
 await mode.getByRole('button',{name:'Full',exact:true}).click()
 expect(await geometry()).toEqual(before);await expect(source).toHaveAttribute('data-for-you-source',id!)
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)).toBeGreaterThan(1)
 await page.waitForTimeout(250)
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{time:number}[]}).__ytPlayers.at(-1)!.time)).toBe(501)
 async function seek(seconds:number){await page.evaluate(t=>{(window as unknown as {__ytTime:(t:number)=>void}).__ytTime(t)},seconds)}
 for(const seconds of [181,481,901,181]){
  await seek(seconds);await expect(panel.locator('[data-clip-line]')).toHaveCount(1);await expect(panel).toContainText(`Minute ${Math.floor(seconds/60)}`)
  await expect(panel.locator('[data-active-token=true]')).toHaveCount(1)
 }
 await seek(187);await expect(panel.locator('[data-active-token=true]')).toContainText('new')
 await page.evaluate(()=>{(window as unknown as {__ytPlayers:{time:number}[]}).__ytPlayers.at(-1)!.time=191});await expect(panel.locator('[data-clip-line]')).toHaveCount(0)
 await seek(481);await expect(panel).toContainText('Minute 8')
 const arabic=panel.locator('[lang=ar]').first(),english=panel.locator('[lang=en]').first();const ar=await arabic.evaluate(el=>getComputedStyle(el).fontSize),en=await english.evaluate(el=>getComputedStyle(el).fontSize)
 await page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).click();await page.getByRole('button',{name:'Increase Arabic text size',exact:true}).click();await page.getByRole('switch',{name:'Tashk\u012bl',exact:true}).uncheck();await page.getByRole('button',{name:'Done',exact:true}).click()
 expect(await arabic.evaluate(el=>getComputedStyle(el).fontSize)).not.toBe(ar);expect(await english.evaluate(el=>getComputedStyle(el).fontSize)).toBe(en);expect(await arabic.textContent()).not.toMatch(/[\u064b-\u065f]/)
 await page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).click();await page.getByRole('button',{name:'Increase English text size',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();expect(await english.evaluate(el=>getComputedStyle(el).fontSize)).not.toBe(en)
 await expect(page.getByRole('button',{name:'Done',exact:true})).toBeHidden()
 await page.waitForTimeout(250)
 await page.screenshot({path:`test-results/dynamic-full-${width}.png`,fullPage:true})
 await mode.getByRole('button',{name:'Short',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{time:number}[]}).__ytPlayers.at(-1)!.time)).toBe(495)
 if(width<900){
  const toolbar=page.locator('[data-mobile-for-you-toolbar]'),feed=page.locator('[data-mobile-clip-feed]')
  await toolbar.getByRole('button',{name:'Next video',exact:true}).click();await expect(source).not.toHaveAttribute('data-for-you-source',id!)
  await page.waitForTimeout(800);await feed.dispatchEvent('wheel',{deltaY:-120});await expect(source).toHaveAttribute('data-for-you-source',id!)
  await page.waitForTimeout(800);await feed.dispatchEvent('wheel',{deltaY:120});await expect(source).not.toHaveAttribute('data-for-you-source',id!)
  await toolbar.getByRole('button',{name:'Previous video',exact:true}).click();await expect(source).toHaveAttribute('data-for-you-source',id!)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
