import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,360,390,430])test(`mobile native timeline ownership at ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await request.post(`${backend}/fixture/dynamic-for-you`)
 await installYouTubeFixture(page);await page.setViewportSize({width,height:900});await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 const source=page.locator('[data-for-you-source]'),toolbar=page.locator('[data-mobile-for-you-toolbar]'),zone=page.locator('[data-feed-gesture-zone]'),panel=page.locator('[data-mobile-clip-transcript]')
 await expect(source.locator('iframe')).toBeVisible()
 await toolbar.getByRole('button',{name:'Short',exact:true}).click();await expect(toolbar.getByRole('button',{name:'Full',exact:true})).toBeVisible()
 const timeline=page.frameLocator('iframe[title="YouTube video player"]').getByRole('slider',{name:'Native timeline fixture'})
 await expect(timeline).toBeVisible();await page.waitForTimeout(300)
 const id=await source.getAttribute('data-for-you-source'),count=await page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)
 const frame=source.locator('iframe');await frame.evaluate(el=>el.setAttribute('data-same-instance','true'))
 const bounds=await timeline.boundingBox();expect(bounds).not.toBeNull();const b=bounds!
 // These are genuine browser pointer/touch inputs to an iframe range control,
 // rather than direct calls to the application's seek callback.
 const point=(seconds:number)=>({x:b.x+8+(b.width-16)*seconds/1200,y:b.y+b.height/2})
 const cdp=await page.context().newCDPSession(page)
 for(const touch of [false,true]){
  // At 320px a one-minute drag is below Chromium's touch slop. Start the
  // touch sequence farther away so the first input is an intentional drag.
  if(touch){const p=point(485);await page.mouse.click(p.x,p.y)}
  for(const [seconds,label] of [[35,'Minute 0.5'],[185,'Minute 3'],[485,'Minute 8'],[95,'Minute 1.5']] as const){
   const from=point(Number(await timeline.inputValue())),to=point(seconds)
   if(touch){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]})
    await page.waitForTimeout(60)
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/6,y:to.y}]});await page.waitForTimeout(20)}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
   }else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up()}
   await expect.poll(async()=>Math.abs(Number(await timeline.inputValue())-seconds),{message:`${touch?'Touch':'Pointer'} seek to ${seconds}`}).toBeLessThan(3)
   await expect(panel).toContainText(label);await expect(panel.locator('[data-clip-line]')).toHaveCount(1)
   await expect(source).toHaveAttribute('data-for-you-source',id!);await expect(frame).toHaveAttribute('data-same-instance','true')
  }
 }
 expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:unknown[]}).__ytPlayers.length)).toBe(count)
 const playing=()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean}[]}).__ytPlayers.at(-1)!.playing)
 const before=await playing();await zone.click();await expect.poll(playing).toBe(!before);await zone.click();await expect.poll(playing).toBe(before)
 await page.frameLocator('iframe[title="YouTube video player"]').getByRole('button',{name:'Native play/pause fixture'}).click();await expect.poll(playing).toBe(!before)
 const geometry=await page.locator('[data-for-you-player]').boundingBox(),overlay=await zone.boundingBox();expect(geometry!.height-overlay!.height).toBeGreaterThanOrEqual(Math.max(79,geometry!.height*.4-1))
 await toolbar.dispatchEvent('wheel',{deltaY:140});await panel.dispatchEvent('wheel',{deltaY:140});await expect(source).toHaveAttribute('data-for-you-source',id!)
 await toolbar.getByRole('button',{name:'Full',exact:true}).click();await page.waitForTimeout(800)
 const z=(await zone.boundingBox())!,x=z.x+z.width/2,y=z.y+z.height-5
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(60)
 for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*15}]});await page.waitForTimeout(20)}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await expect(source).not.toHaveAttribute('data-for-you-source',id!)
 await toolbar.getByRole('button',{name:'Previous video',exact:true}).click();await expect(source).toHaveAttribute('data-for-you-source',id!)
})
