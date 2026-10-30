import {test,expect,type BrowserContext} from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
async function signIn(context:BrowserContext,premium=false){
 const id=premium?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:premium?'premium@fixture.example':'free@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [390,1440])test(`discovery auto-advances 20 varied sources and refreshes on reload at ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/for-you-discovery`);await signIn(context,true);await installYouTubeFixture(page)
 await page.setViewportSize({width,height:950});await page.goto('/explore');await page.getByRole('button',{name:'For You feed',exact:true}).click()
 const clip=page.locator('[data-for-you-source]')
 await expect(clip.locator('iframe')).toBeVisible()
 const history:string[]=[]
 for(let i=0;i<20;i++){
  const source=(await clip.getAttribute('data-for-you-source'))!
  await expect.poll(()=>page.evaluate(id=>{const p=(window as unknown as {__ytPlayers:{id:string;playing:boolean;destroyed:boolean}[]}).__ytPlayers.at(-1);return p?.id===id&&p.playing&&!p.destroyed},source)).toBe(true)
  expect(history).not.toContain(source);history.push(source)
  await expect(clip).toContainText(`Discovery sentence ${Number(source.slice(-2))}`)
  if(i===19)break
  await page.evaluate(()=>{const w=window as unknown as {__ytTime:(t:number,s:number)=>void};w.__ytTime(12,1);w.__ytTime(12.1,1)})
  await expect(clip).not.toHaveAttribute('data-for-you-source',source)
  await expect(clip.locator('iframe')).toHaveCount(1)
 }
 expect(new Set(history).size).toBe(20)
 const previous=page.getByRole('button',{name:'Previous video',exact:true})
 await previous.click();await expect(clip).toHaveAttribute('data-for-you-source',history[18])
 const full=width<900?page.locator('[data-mobile-mode]'):page.getByRole('button',{name:'Full',exact:true})
 await full.click();await page.evaluate(()=>(window as unknown as {__ytTime:(t:number,s:number)=>void}).__ytTime(13,1))
 await expect(clip).toHaveAttribute('data-for-you-source',history[18])
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__ytPlayers:{playing:boolean;destroyed:boolean}[]}).__ytPlayers.filter(p=>p.playing&&!p.destroyed).length)).toBe(1)
 await page.reload();await page.getByRole('button',{name:'For You feed',exact:true}).click();await expect(clip.locator('iframe')).toBeVisible()
 const fresh:string[]=[]
 for(let i=0;i<5;i++){
  const current=(await clip.getAttribute('data-for-you-source'))!;fresh.push(current)
  await expect.poll(()=>page.evaluate(id=>{const p=(window as unknown as {__ytPlayers:{id:string;playing:boolean;destroyed:boolean}[]}).__ytPlayers.at(-1);return p?.id===id&&p.playing&&!p.destroyed},current)).toBe(true)
  if(i<4){await page.evaluate(()=>(window as unknown as {__ytTime:(t:number,s:number)=>void}).__ytTime(12,1));await expect(clip).not.toHaveAttribute('data-for-you-source',current)}
 }
 expect(fresh).not.toEqual(history.slice(0,5))
})
