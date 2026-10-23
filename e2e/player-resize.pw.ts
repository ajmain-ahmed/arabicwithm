import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [900,1440])test(`desktop toolbar resizing preserves playback at ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await request.post(`${backend}/fixture/dynamic-for-you`)
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 const player=page.locator('[data-for-you-player]'),toolbar=page.locator('[data-desktop-for-you-toolbar]'),handle=toolbar.getByRole('button',{name:'Resize video player',exact:true})
 await expect(player.locator('iframe')).toBeVisible();await expect(handle).toBeVisible();await expect(handle).toHaveCSS('cursor','ns-resize')
 await handle.hover();await expect(page.getByRole('tooltip',{name:'Resize player',exact:true})).toBeVisible()
 await page.evaluate(()=>{const w=window as unknown as {__ytPlayers:{time:number;playing:boolean}[];__resizePlayer:unknown};w.__resizePlayer=w.__ytPlayers.at(-1);setInterval(()=>{const p=w.__ytPlayers.at(-1);if(p?.playing)p.time+=.1},100)})
 const initial=(await player.boundingBox())!
 const bounds=(await handle.boundingBox())!;await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2-100,{steps:10})
 expect((await player.boundingBox())!.height).toBeLessThan(initial.height-80);await page.mouse.up()
 const small=(await player.boundingBox())!,next=(await handle.boundingBox())!;await page.mouse.move(next.x+22,next.y+22);await page.mouse.down();await page.mouse.move(next.x+22,next.y+82,{steps:10});expect((await player.boundingBox())!.height).toBeGreaterThan(small.height+40);await page.mouse.up()
 await handle.focus();const h=(await player.boundingBox())!.height;await page.keyboard.press('ArrowUp');expect((await player.boundingBox())!.height).toBeCloseTo(h-24,0);await page.keyboard.press('ArrowDown')
 for(let i=0;i<30;i++)await page.keyboard.press('ArrowUp');expect((await player.boundingBox())!.height).toBeCloseTo(270,0)
 for(let i=0;i<50;i++)await page.keyboard.press('ArrowDown');const largest=(await player.boundingBox())!;expect(largest.height).toBeLessThanOrEqual(700);expect(largest.width/largest.height).toBeCloseTo(16/9,2);expect(Math.abs(largest.x+largest.width/2-width/2)).toBeLessThan(2)
 expect(await page.evaluate(()=>{const w=window as unknown as {__resizePlayer:unknown;__ytPlayers:{playing:boolean;destroyed?:boolean}[]};return w.__resizePlayer===w.__ytPlayers.at(-1)&&w.__ytPlayers.at(-1)!.playing&&!w.__ytPlayers.at(-1)!.destroyed})).toBe(true)
 for(const name of ['Explore feed','For You feed','Playback speed','Filter content','Settings','Short','Full'])await expect(toolbar.getByRole('button',{name,exact:true})).toBeVisible()
 await toolbar.getByRole('button',{name:'Full',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)).toBe(2)
 await page.waitForTimeout(250);await page.evaluate(()=>{const w=window as unknown as {__resizePlayer:unknown;__ytPlayers:{time:number}[];__ytTime:(t:number,s:number)=>void};w.__resizePlayer=w.__ytPlayers.at(-1);w.__ytTime(481,1)})
 const transcript=page.locator('[data-desktop-clip-transcript]');await expect(transcript).toContainText('Minute 8');await handle.focus();await page.keyboard.press('ArrowUp');await expect(transcript).toContainText('Minute 8')
 expect(await page.evaluate(()=>{const w=window as unknown as {__resizePlayer:unknown;__ytPlayers:{time:number;playing:boolean}[]};return w.__resizePlayer===w.__ytPlayers.at(-1)&&w.__ytPlayers.at(-1)!.playing&&w.__ytPlayers.at(-1)!.time>=481})).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/resize-player-${width}.png`})
})
test('mobile has no resize control',async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await installYouTubeFixture(page);await page.setViewportSize({width:390,height:844});await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click();await expect(page.locator('[data-for-you-source] iframe')).toBeVisible();await expect(page.getByRole('button',{name:'Resize video player'})).toHaveCount(0)
})
