import {test,expect} from '@playwright/test'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {installYouTubeFixture} from './helpers/youtube'

const phase=process.env.AWM_SIZING_PHASE??'after'
const widths=process.env.AWM_SIZING_WIDTHS?.split(',').map(Number)??[320,375,390,414,430,1440]
const routes=[['home','/'],['explore','/explore'],['foryou','/explore?view=foryou'],['watch','/cartoons'],['shows','/cartoons?view=shows'],['show','/cartoons/test-show'],['episode','/cartoons/test-show/clip-0'],['read','/books'],['book','/books/test-book'],['learn','/learn'],['memory','/memory'],['profile','/profile'],['library','/books?mode=listen']] as const
for(const width of widths)test(`compact mobile presentation at ${width}`,async({page,context,request},info)=>{
 const directory=`artifacts/mobile-compact/${phase}/${info.project.name}/${width}`
 await mkdir(directory,{recursive:true})
 await request.post('https://localhost:4365/fixture/localisation')
 await request.post('https://localhost:4365/fixture/english-for-you',{data:{subtitleLayout:true,seek:true}})
 const id='22222222-2222-4222-8222-222222222222',exp=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp,role:'authenticated'})}.fixture-signature`,refresh_token:'fixture-refresh',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id,aud:'authenticated',role:'authenticated',email:'premium@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
 if(phase==='after'){await context.addCookies([{name:'awm-website-locale',value:'ar',domain:'127.0.0.1',path:'/'}]);await page.addInitScript(()=>localStorage.setItem('awm-website-locale','ar'))}
 await installYouTubeFixture(page)
 await page.setViewportSize({width,height:844})
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 const report:Record<string,unknown>[]=[]
 for(const [name,url] of routes){
  await page.goto(url)
  await expect(page.locator('main')).toBeVisible()
  if(name==='home'){await expect(page.locator('[data-featured-hero]').first()).toBeVisible();await expect(page.getByRole('heading',{name:'Latest Episodes',exact:true})).toBeVisible()}
  if(name==='learn')await expect(page.getByRole('grid').first()).toBeVisible()
  if(name==='foryou')await expect(page.locator('[data-for-you-source] iframe').first()).toBeVisible()
  if(name==='profile')await expect(page.locator('[data-profile-header]').filter({visible:true})).toBeVisible()
  if(name==='memory')await expect(page.getByRole('button',{name:'Start',exact:true})).toBeVisible()
  if(name==='read'||name==='library')await expect(page.locator(`main a[href="/${name==='library'?'listen':'books'}/test-book"]`).first()).toBeVisible()
  if(name==='watch'||name==='show')await expect(page.locator('main a[href="/cartoons/test-show/clip-0"]').first()).toBeVisible()
  if(name==='shows')await expect(page.locator('main a[href="/cartoons/test-show"]').first()).toBeVisible()
  if(name==='book')await expect(page.getByText('A clear book description.',{exact:true})).toBeVisible()
  if(name==='episode')await expect(page.getByRole(width<900?'tab':'button',{name:'Settings',exact:true}).filter({visible:true}).first()).toBeVisible()
  await page.evaluate(()=>document.fonts.ready)
  await page.screenshot({path:`${directory}/${name}.png`,animations:'disabled'})
  const metrics=await page.evaluate(()=>{
   const measure=(selector:string)=>{const el=Array.from(document.querySelectorAll<HTMLElement>(selector)).find(node=>node.getClientRects().length&&node.getBoundingClientRect().width>0);if(!el)return null;const rect=el.getBoundingClientRect(),style=getComputedStyle(el);return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,font:style.fontSize,padding:style.padding}}
   return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,rootFont:getComputedStyle(document.documentElement).fontSize,navbar:measure('header'),featured:measure('[data-featured-hero] > div'),heading:measure('main h1'),firstCard:measure('main a.MuiPaper-root'),container:measure('main .MuiContainer-root'),visibleText:document.querySelector('main')?.innerText.slice(0,600)}
  })
  report.push({name,url:page.url(),...metrics})
  if(phase==='after'){
   expect(metrics.scrollWidth,`${name}: horizontal overflow`).toBeLessThanOrEqual(width)
   await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('html')).toHaveAttribute('dir','ltr')
   await expect(page.getByRole('button',{name:/Website language|لغة الموقع|switch For You to English|switch For You to Arabic/})).toHaveCount(0)
  }
 }
 await writeFile(`${directory}/metrics.json`,JSON.stringify(report,null,2))
 if(phase==='after'&&info.project.name==='chrome'){
  const baseline=JSON.parse(await readFile(`artifacts/mobile-compact/before/chrome/${width}/metrics.json`,'utf8')) as typeof report
  const current=report[0] as {featured:{height:number};navbar:{height:number}},previous=baseline[0] as typeof current
  if(width<600){expect(current.featured.height/previous.featured.height).toBeLessThanOrEqual(.9);expect(current.navbar.height).toBeLessThan(previous.navbar.height)}
  else {
   expect(current.featured).toEqual(previous.featured)
   expect(current.navbar.height).toEqual(previous.navbar.height)
   for(let i=0;i<report.length;i++)if(!['explore','foryou'].includes(String(report[i].name))) {
    const stable=(value:unknown)=>value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='height')):value
    expect(stable(report[i].container),`${report[i].name}: desktop container position, width, font and padding`).toEqual(stable(baseline[i].container))
   }
  }
 }
 expect(errors.filter(e=>/hydration|server rendered|client.*match/i.test(e))).toEqual([])
})

test('desktop Episode keyboard hints fit beside controls',async({page})=>{
 await installYouTubeFixture(page)
 for(const width of [1280,1366,1440]){
  await page.setViewportSize({width,height:844})
  await page.goto('/cartoons/test-show/clip-0')
  const settings=page.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).first()
  await expect(settings).toBeVisible();await page.evaluate(()=>document.fonts.ready)
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offscreen:Array.from(document.querySelectorAll('main *')).flatMap(el=>{const rect=el.getBoundingClientRect();return rect.width&&rect.right>innerWidth+.5?[{tag:el.tagName,text:el.textContent?.slice(0,80),right:rect.right}]:[]}).slice(-8)}))
  console.log('Episode desktop fit',JSON.stringify({toolbar:await settings.locator('..').boundingBox(),...overflow}))
  expect(overflow.scroll).toBeLessThanOrEqual(width)
 }
})
