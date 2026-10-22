import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,390,844,1440])test(`sound state and one-row toolbar at ${width}`,async({page,request})=>{
 await request.post(`${backend}/fixture/for-you-playback`);await installYouTubeFixture(page)
 await page.setViewportSize({width,height:width===844?390:844});await page.goto('/explore')
 if(width<900)await expect(page.locator('#explore-feed')).not.toContainText('Book Extract')
 await page.getByRole('button',{name:'For You feed',exact:true}).click()
 await expect(page.locator('[data-for-you-source] iframe')).toBeVisible()
 if(width>=900){await expect(page.getByRole('button',{name:'Next clip'})).toBeVisible();await expect(page.locator('[data-mobile-for-you-toolbar]')).toBeHidden();return}
 const toolbar=page.locator('[data-mobile-for-you-toolbar]')
 const buttons=toolbar.getByRole('button')
 const boxes=await buttons.evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {y:b.y+b.height/2,left:b.left,right:b.right}}))
 expect(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))).toBeLessThan(3)
 expect(Math.min(...boxes.map(b=>b.left))).toBeGreaterThanOrEqual(0)
 expect(Math.max(...boxes.map(b=>b.right))).toBeLessThanOrEqual(width)
 const state=()=>page.evaluate(()=>{const p=(window as unknown as {__ytPlayers:{muted:boolean;volume:number;playing:boolean;destroyed?:boolean}[]}).__ytPlayers.at(-1)!;return {muted:p.muted,volume:p.volume,playing:p.playing}})
 await expect.poll(state).toMatchObject({muted:false,volume:100,playing:true})
 await toolbar.getByRole('button',{name:'Mute clip',exact:true}).click()
 await expect.poll(state).toMatchObject({muted:true})
 await toolbar.getByRole('button',{name:'Unmute clip',exact:true}).click()
 await expect.poll(state).toMatchObject({muted:false,volume:100,playing:true})
 const source=page.locator('[data-for-you-source]')
 for(let i=0;i<6;i++){
  const previous=await source.getAttribute('data-for-you-source');await page.waitForTimeout(750)
  await page.locator('[data-feed-gesture-edge]').first().dispatchEvent('wheel',{deltaY:100})
  await expect(source).not.toHaveAttribute('data-for-you-source',previous!)
  await expect(source.locator('iframe')).toBeVisible()
  await expect.poll(state).toMatchObject({muted:false,volume:100,playing:true})
 }
 await page.waitForTimeout(750);await page.locator('[data-feed-gesture-edge]').first().dispatchEvent('wheel',{deltaY:-100})
 await expect(source).toHaveAttribute('data-for-you-source','abcdefghij5')
 await expect.poll(state).toMatchObject({muted:false,volume:100,playing:true})
 expect(await page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean;destroyed?:boolean}[]}).__ytPlayers.filter(p=>p.playing&&!p.destroyed).length)).toBe(1)
 await page.screenshot({path:`test-results/sound-toolbar-${width}.png`})
})
