import {test,expect} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
test.beforeEach(async({page,request})=>{await request.post(`${backend}/fixture/spotlight`);await installYouTubeFixture(page)})
const log=async(request:import('@playwright/test').APIRequestContext)=>(await(await request.get(`${backend}/fixture/request-log`)).json()) as {rpc:string[];spotlight:{p_seed:string;p_allow_source_tokens:boolean}[]}
test('server HTML contains the selected clip; mounting and rerenders do not rediscover it',async({page,request})=>{
 const html=await(await request.get('/')).text();expect(html).toContain('clip_start_ms');expect(html).toContain('45000');expect(html).not.toContain('No eligible Arabic preview is available right now.')
 await request.post(`${backend}/fixture/spotlight`)
 const actionResponses:string[]=[];page.on('response',async response=>{if(response.request().headers()['next-action'])actionResponses.push(await response.text())})
 await page.goto('/');await page.waitForLoadState('networkidle');await page.locator('[data-home-spotlight]').evaluate(element=>element.scrollIntoView({block:'center'}));const video=page.locator('[data-spotlight-video]');await expect(video.locator('iframe')).toBeVisible();const id=await video.getAttribute('data-spotlight-video')
 let result=await log(request);expect(result.spotlight).toHaveLength(1);expect(result.spotlight[0].p_allow_source_tokens).toBe(false);expect(result.rpc).not.toContain('transcript_for_you_groups')
 await page.getByRole('button',{name:/Switch to .* mode/}).first().click();await page.setViewportSize({width:390,height:1000});await page.evaluate(()=>(window as unknown as {__ytTime:(t:number,s:number)=>void}).__ytTime(16,1));await expect(page.locator('[data-spotlight-subtitle]')).toContainText('Second Arabic subtitle')
 await expect(video).toHaveAttribute('data-spotlight-video',id!);result=await log(request);expect(result.spotlight).toHaveLength(1);expect(actionResponses.some(text=>text.includes('clip_start_ms'))).toBe(false)
 const ids=new Set([id]);for(let i=0;i<6&&ids.size<2;i++){await page.reload();await page.waitForLoadState('networkidle');await page.locator('[data-home-spotlight]').evaluate(element=>element.scrollIntoView({block:'center'}));await expect(video.locator('iframe')).toBeVisible();ids.add(await video.getAttribute('data-spotlight-video'))}expect(ids.size).toBeGreaterThan(1)
})
test('empty and raw-only pools use exactly one bounded fallback',async({page,request})=>{
 await request.post(`${backend}/fixture/spotlight`,{data:{selection:'empty'}});await page.goto('/');await page.waitForLoadState('networkidle');await page.locator('[data-home-spotlight]').evaluate(element=>element.scrollIntoView({block:'center'}));await expect(page.getByText('No eligible Arabic preview is available right now. Explore more in For You.')).toBeVisible();await expect(page.locator('[data-spotlight-video]')).toHaveCount(0)
 let result=await log(request);expect(result.spotlight.map(q=>q.p_allow_source_tokens)).toEqual([false,true]);expect(result.rpc).not.toContain('transcript_for_you_groups')
 await request.post(`${backend}/fixture/spotlight`,{data:{selection:'raw-only'}});await page.reload();await page.waitForLoadState('networkidle');await page.locator('[data-home-spotlight]').evaluate(element=>element.scrollIntoView({block:'center'}));await expect(page.locator('[data-spotlight-video] iframe')).toBeVisible();result=await log(request);expect(result.spotlight.map(q=>q.p_allow_source_tokens)).toEqual([false,true]);expect(result.spotlight[0].p_seed).toBe(result.spotlight[1].p_seed)
})
test('real selection failures are visible and only explicit Retry makes another selection request',async({page,request})=>{
 await request.post(`${backend}/fixture/spotlight`,{data:{selection:'error'}});await page.goto('/');await page.waitForLoadState('networkidle');await page.locator('[data-home-spotlight]').evaluate(element=>element.scrollIntoView({block:'center'}));await expect(page.locator('[data-home-spotlight]').getByRole('alert')).toContainText('The preview could not load.')
 expect((await log(request)).spotlight).toHaveLength(1)
 await request.post(`${backend}/fixture/spotlight`);await page.getByRole('button',{name:'Retry preview',exact:true}).click();await expect(page.locator('[data-spotlight-video] iframe')).toBeVisible();expect((await log(request)).spotlight).toHaveLength(1)
})
