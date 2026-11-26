import {test,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {installYouTubeFixture} from './helpers/youtube'

test('audit Arabic learner routes for remaining English controls',async({page,context},info)=>{
 test.skip(info.project.name!=='chrome','The layout matrix covers every browser; this collects source strings once.')
 test.setTimeout(300000)
 await context.addCookies([{name:'awm-website-locale',value:'ar',domain:'127.0.0.1',path:'/'}])
 await installYouTubeFixture(page)
 await mkdir('artifacts/localisation',{recursive:true})
 const report:Record<string,unknown>[]=[]
 const routes=['/','/cartoons','/cartoons?view=shows','/cartoons/test-show','/cartoons/test-show/clip-0','/books','/books?mode=listen','/books/level/a1','/books/test-book','/books/test-book/chapter-1','/listen/test-book','/explore','/explore?view=foryou','/learn','/grammar','/grammar?branch=sarf','/memory','/word-search','/profile','/support','/feedback','/privacy','/terms','/reset-password','/transcripts/66666666-6666-4666-8666-666666666661','/missing-localisation-route']
 for(const role of ['guest','free','admin']){
  if(role!=='guest'){
   const id=role==='admin'?'44444444-4444-4444-8444-444444444444':'11111111-1111-4111-8111-111111111111',exp=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
   const user={id,aud:'authenticated',role:'authenticated',email:`${role}@fixture.example`,user_metadata:{},app_metadata:{provider:'email'}}
   const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp,role:'authenticated'})}.fixture-signature`
   await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({user,access_token,refresh_token:'fixture-refresh',expires_at:exp,expires_in:3600,token_type:'bearer'})}`,domain:'127.0.0.1',path:'/'}])
  }
  for(const route of routes){
   await page.goto(route)
   await expect(page.locator('html')).toHaveAttribute('lang','ar')
   if(route==='/books/level/a1'){
    await expect(page.getByRole('heading',{level:1})).toHaveText('كتب عربية للمستوى A1')
    await expect(page.getByText('ابدأ أولى خطواتك في قراءة العربية بقصص متدرّجة ميسّرة وترجمات واضحة ودعم للمفردات.',{exact:true})).toBeVisible()
   }
   if(route.startsWith('/transcripts/'))await expect(page.getByRole('heading',{level:1})).toHaveText('نص محفوظ')
   let strings:unknown=[]
   await expect.poll(async()=>{try{
    strings=await page.locator('main button,main a,main input,main select,main [role="combobox"],main h1,main h2,main [role="alert"]').evaluateAll(elements=>elements.filter(el=>el.getClientRects().length).map(el=>({text:(el.textContent??'').trim(),label:el.getAttribute('aria-label'),placeholder:el.getAttribute('placeholder')})).filter(row=>/[A-Za-z]{3}/.test([row.text,row.label,row.placeholder].join(' '))))
    return true
   }catch{return false}}).toBe(true)
   report.push({role,route,url:page.url(),strings})
   await writeFile('artifacts/localisation/runtime-english-controls.json',JSON.stringify(report,null,2))
  }
 }
 await mkdir('artifacts/localisation',{recursive:true})
 await writeFile('artifacts/localisation/runtime-english-controls.json',JSON.stringify(report,null,2))
 const defects=report.flatMap(row=>(row.strings as {text:string;label:string|null;placeholder:string|null}[]).filter(item=>[item.text,item.label,item.placeholder].some(value=>value&&/^(?:Search episodes$|Previous clip$|Next clip$|Explore feed$|For You feed$|Grammar$|Memory$|Word Type$|Sentence Role$|Case Endings$|Revise Naḥw Rules$|Context Ṣarf$|Weak Verbs$|Word Patterns$|Revise the Ten Forms$|Support Arabic with M|This password reset link is invalid|See all:|View Test Show|Select [\u0621-\u064a])/.test(value))).map(item=>({role:row.role,route:row.route,...item})))
 expect(defects).toEqual([])
})
