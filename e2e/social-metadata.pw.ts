import {test,expect} from '@playwright/test'
import {createHash} from 'node:crypto'
const image='https://whbxgwucsoguqzpnpzjd.supabase.co/storage/v1/object/public/covers/social/arabicwithm-cinematic-collage-0e25039c3908.jpg'
const title='ArabicWithM — Learn Arabic with Cartoons'
const description='Master Arabic through immersive cartoons with interactive subtitles.'
const routes=['/','/cartoons','/cartoons?view=shows','/explore','/books','/books?mode=listen','/books/test-book','/cartoons/test-show','/cartoons/test-show/clip-0','/learn','/memory','/grammar','/word-search','/privacy','/terms']
for(const bot of ['WhatsApp/2.24.6.77 A','facebookexternalhit/1.1','Twitterbot/1.0'])test(`server-rendered social tags inherit without duplicates for ${bot}`,async({page,request})=>{
 for(const path of routes){
  const response=await request.get(path,{headers:{'user-agent':bot}})
  expect(response.ok(),path).toBe(true)
  const tags=await page.evaluate(html=>{
   const doc=new DOMParser().parseFromString(html,'text/html')
   return [...doc.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')].map(el=>({name:el.getAttribute('property')??el.getAttribute('name'),value:el.getAttribute('content'),head:!!el.closest('head')}))
  },await response.text())
  const expected:Record<string,string>={'og:title':title,'og:description':description,'og:image':image,'og:image:width':'1200','og:image:height':'630','og:image:alt':'ArabicWithM — Watch, Read, Learn: cinematic character collage surrounding the ArabicWithM logo.','og:type':'website','twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image}
  if(path==='/')expected['og:url']='https://arabicwithm.vercel.app'
  for(const [name,value] of Object.entries(expected))expect(tags.filter(t=>t.name===name),`${path} ${name}`).toEqual([{name,value,head:true}])
 }
})
test('public social JPEG needs no authentication and meets the WhatsApp size budget',async({request})=>{
 const response=await request.get(image)
 expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/jpeg')
 const body=await response.body()
 expect(body.length).toBeLessThan(600000)
 expect(createHash('sha256').update(body).digest('hex')).toBe('0e25039c390817d7ab16a4c1dfd73053143a7f3baf00888bf620cdadcffe9432')
})
test('nested page titles remain specific and metadata works without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,userAgent:'facebookexternalhit/1.1'})
 const page=await context.newPage()
 const base=`http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT??3000}`
 for(const [path,expectedTitle] of [['/','ArabicWithM — Learn Arabic with Cartoons'],['/books/test-book','Test Book | Arabic Books'],['/cartoons/test-show','Test Show | Arabic Cartoons']] as const){
  await page.goto(base+path)
  await expect(page).toHaveTitle(expectedTitle)
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute('content',image)
  await expect(page.locator('head meta[name="twitter:image"]')).toHaveAttribute('content',image)
  expect(await page.locator(`img[src="${image}"]`).count()).toBe(0)
 }
 await context.close()
})
