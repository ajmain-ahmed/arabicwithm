import {test, expect, type Page} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend = `https://localhost:${process.env.AWM_TEST_BACKEND_PORT ?? 4310}`
const sizeKey = 'awm-spotlight-player-size-v1'
const sectionOf = (page: Page) => page.locator('[data-home-spotlight]')
async function ratio(page: Page) {
 const section = sectionOf(page)
 const video = (await section.locator('[data-spotlight-video]').boundingBox())!
 const layout = (await section.locator('[data-spotlight-player-layout]').boundingBox())!
 expect(video.width / video.height).toBeCloseTo(16 / 9, 1)
 expect(video.x + video.width / 2).toBeCloseTo(layout.x + layout.width / 2, 0)
 return video.width / layout.width
}
test.beforeEach(async({page,request}) => {
 await request.post(`${backend}/fixture/spotlight`)
 await installYouTubeFixture(page)
})
for (const width of [320,390,430,768,1024,1440]) test(`Spotlight responsive header, player and stacked subtitles at ${width}`, async({page}) => {
 await page.setViewportSize({width,height:1000}); await page.goto('/')
 const section = sectionOf(page), video = section.locator('[data-spotlight-video]')
 await expect(video.locator('iframe')).toBeVisible()
 const duration=await page.evaluate(()=>{const player=(window as unknown as {__ytPlayers:{options:{playerVars:{start:number;end:number}}}[]}).__ytPlayers.at(-1)!;return player.options.playerVars.end-(player.options.playerVars.start??0)});expect(duration).toBe(45)
 await page.evaluate(()=>document.fonts.ready)
 const heading = section.getByRole('heading',{name:'For You Spotlight',exact:true})
 await expect(heading).toBeVisible()
 const {header,title,button}=await section.locator('[data-spotlight-header]').evaluate(el=>({header:el.getBoundingClientRect().toJSON(),title:el.querySelector('h2')!.getBoundingClientRect().toJSON(),button:el.querySelector('button')!.getBoundingClientRect().toJSON()}))
 if(width<900)expect(title.x).toBeCloseTo(header.x,0)
 else expect(title.x + title.width / 2).toBeCloseTo(header.x + header.width / 2, 0)
 const link = section.getByRole('button',{name:'Watch More',exact:true})
 await expect(link).toHaveAttribute('type','button');await expect(link).toHaveJSProperty('tagName','BUTTON');await expect(link).toHaveCSS('background-color','rgb(4, 97, 84)')
 if(width<900){expect(button.x).toBeGreaterThan(title.x+title.width);expect(Math.abs(button.y+button.height/2-title.y-title.height/2)).toBeLessThan(2);await expect(link).toContainText('\u2192')}
 const measured = await ratio(page)
 expect(measured).toBeCloseTo(width>=900?.5:width>=600?(65+12/37*20)/100:1,2)
 const handle = section.getByRole('slider',{name:'Resize For You player'})
 if(width<600) await expect(handle).not.toBeVisible()
 else {
  await expect(handle).toBeVisible()
  const grip=(await handle.boundingBox())!, player=(await video.boundingBox())!
  expect(grip.x).toBeGreaterThanOrEqual(player.x+player.width)
  expect(grip.x+grip.width).toBeLessThanOrEqual(header.x+header.width+1)
 }
 const ar=section.locator('[data-spotlight-subtitle] [lang=ar]'), en=section.locator('[data-spotlight-subtitle] [lang=en]')
 await expect(ar).toHaveCSS('text-align','center'); await expect(en).toHaveCSS('text-align','center')
 // Read both rectangles in one layout snapshot: content above can settle
 // between independent browser round trips.
 const {arabic,english}=await section.locator('[data-spotlight-subtitle]').evaluate(el=>{
  const rect=(selector:string)=>{const {x,y,width,height}=el.querySelector<HTMLElement>(selector)!.getBoundingClientRect();return {x,y,width,height}}
  return {arabic:rect('[lang=ar]'),english:rect('[lang=en]')}
 })
 expect(english.y).toBeGreaterThanOrEqual(arabic.y+arabic.height)
 expect(arabic.x+arabic.width/2).toBeCloseTo(english.x+english.width/2,0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await section.screenshot({path:`test-results/spotlight-refinement-${width}.png`})
 if(width===390){await link.click();await expect(page).toHaveURL(/\/explore\?view=foryou$/)}
})
test('drag and keyboard resize preserve the live player, position, subtitles and saved preference',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/')
 const section=sectionOf(page),video=section.locator('[data-spotlight-video]'),frame=video.locator('iframe'),grip=section.getByRole('slider',{name:'Resize For You player'})
 await expect(frame).toBeVisible();await frame.evaluate(el=>el.setAttribute('data-live-instance','original'))
 const source=await video.getAttribute('data-spotlight-video')
 await frame.contentFrame().getByRole('slider',{name:'Native timeline fixture'}).fill('16')
 await expect(section.locator('[data-spotlight-subtitle]')).toContainText('Second Arabic subtitle')
 const state=()=>page.evaluate(()=>{const ps=(window as unknown as {__ytPlayers:{time:number;playing:boolean;destroyed?:boolean}[]}).__ytPlayers;const p=ps.at(-1)!;return {count:ps.length,time:p.time,playing:p.playing,destroyed:!!p.destroyed}})
 const before=await state();expect(before.playing).toBe(true)
 await grip.scrollIntoViewIfNeeded();let box=(await grip.boundingBox())!
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down()
 await expect(grip).toHaveAttribute('data-dragging','true')
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2-90,{steps:12});await page.mouse.up()
 expect(await ratio(page)).toBeGreaterThan(.5)
 box=(await grip.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,950,{steps:12});await page.mouse.up()
 expect(await ratio(page)).toBeCloseTo(.38,2)
 box=(await grip.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,0,{steps:12});await page.mouse.up()
 expect(await ratio(page)).toBeCloseTo(.75,2)
 await expect(grip).toHaveAttribute('data-dragging','false')
 await expect(frame).toHaveAttribute('data-live-instance','original');await expect(video).toHaveAttribute('data-spotlight-video',source!)
 expect(await state()).toEqual(before);await expect(section.locator('[data-spotlight-subtitle]')).toContainText('Second Arabic subtitle')
 await grip.press('Home');expect(await ratio(page)).toBeCloseTo(.38,2)
 await grip.press('ArrowUp');expect(await ratio(page)).toBeCloseTo(.39,2)
 await grip.press('End');await grip.press('ArrowDown');expect(await ratio(page)).toBeCloseTo(.74,2)
 await frame.contentFrame().getByRole('button',{name:'Native play/pause fixture'}).click()
 // Re-enter the parent document with a real click after using iframe controls.
 await grip.click();await expect(grip).toBeFocused();await grip.press('ArrowDown')
 await expect(grip).toHaveAttribute('aria-valuenow','73');expect((await state()).playing).toBe(false)
 await expect.poll(()=>page.evaluate(key=>Number(localStorage.getItem(key)),sizeKey)).toBe(73)
 await page.reload();await expect(video.locator('iframe')).toBeVisible();expect(await ratio(page)).toBeCloseTo(.73,2)
 await expect(section.getByRole('button',{name:/^(Play|Pause|Mute|Unmute)$/})).toHaveCount(0)
})
test('tablet touch drag is bounded and does not recreate the player',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','CDP dispatches actual touch input in Chromium; mouse/keyboard covered in both browsers.')
 await page.setViewportSize({width:768,height:1000});await page.goto('/')
 const section=sectionOf(page),video=section.locator('[data-spotlight-video]'),grip=section.getByRole('slider',{name:'Resize For You player'})
 await expect(video.locator('iframe')).toBeVisible();await grip.scrollIntoViewIfNeeded()
 const source=await video.getAttribute('data-spotlight-video'),box=(await grip.boundingBox())!, x=box.x+box.width/2,y=box.y+box.height/2
 const cdp=await context.newCDPSession(page)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-150}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 expect(await ratio(page)).toBeCloseTo(.85,2)
 await expect(video).toHaveAttribute('data-spotlight-video',source!)
 expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)).toBe(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
test('invalid stored size uses the default and out-of-range size is bounded',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.addInitScript(key=>localStorage.setItem(key,'invalid'),sizeKey);await page.goto('/')
 await expect(sectionOf(page).locator('iframe')).toBeVisible();expect(await ratio(page)).toBeCloseTo(.5,2)
 await page.evaluate(key=>localStorage.setItem(key,'999'),sizeKey)
 // Remove init script by opening a clean page in the same context.
 const next=await page.context().newPage();await next.setViewportSize({width:1440,height:1000});await installYouTubeFixture(next);await next.goto('/')
 await expect(sectionOf(next).locator('iframe')).toBeVisible();expect(await ratio(next)).toBeCloseTo(.75,2)
 await next.close()
})
