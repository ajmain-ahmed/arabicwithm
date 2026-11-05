import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
import {signInFixture} from './helpers/account'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
test('trusted transcript gestures recover muted autoplay and preserve explicit mute',async({page,context,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await signInFixture(context);await installYouTubeFixture(page)
 await page.addInitScript('window.__ytRejectAudible=true');await page.setViewportSize({width:390,height:650});await page.goto('/explore')
 await page.getByRole('button',{name:'For You feed',exact:true}).click()
 const clip=page.locator('[data-for-you-source]'),pane=page.locator('[data-mobile-clip-transcript]')
 await expect(clip.locator('iframe')).toBeVisible()
 const state=()=>page.evaluate(()=>{const p=(window as unknown as {__ytPlayers:{muted:boolean;playing:boolean}[]}).__ytPlayers.at(-1)!;return {muted:p.muted,playing:p.playing}})
 await expect.poll(state).toEqual({muted:true,playing:true})
 const source=await clip.getAttribute('data-for-you-source')
 await pane.evaluate(el=>el.scrollTo({top:50,behavior:'instant'}));await expect.poll(state).toEqual({muted:true,playing:true})
 await page.evaluate(()=>{(window as unknown as {__ytRejectAudible:boolean}).__ytRejectAudible=false})
 const box=(await pane.boundingBox())!,cdp=await context.newCDPSession(page)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+Math.min(90,box.height/2)}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2,y:box.y+25}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await expect.poll(state).toEqual({muted:false,playing:true});await expect(clip).toHaveAttribute('data-for-you-source',source!)
 await page.getByRole('button',{name:'Mute clip',exact:true}).filter({visible:true}).click()
 await expect.poll(state).toEqual({muted:true,playing:true})
 await page.mouse.move(box.x+box.width/2,box.y+30);await page.mouse.wheel(0,150)
 await pane.evaluate(el=>el.scrollTo({top:0,behavior:'instant'}))
 await page.evaluate(()=>(window as unknown as {__ytTime:(time:number,state:number)=>void}).__ytTime(501,1))
 await expect.poll(state).toEqual({muted:true,playing:true});await expect(clip).toHaveAttribute('data-for-you-source',source!)
})
