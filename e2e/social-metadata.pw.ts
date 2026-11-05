import {test,expect} from '@playwright/test'
import {createHash} from 'node:crypto'
const image='https://whbxgwucsoguqzpnpzjd.supabase.co/storage/v1/object/public/covers/social/arabicwithm-cinematic-collage-e1491ee6591b.png'
const title='ArabicWithM — Learn Arabic with Cartoons'
const description='Master Arabic through immersive cartoons with interactive subtitles.'
const routes=['/','/cartoons','/cartoons?view=shows','/explore','/books','/books?mode=listen','/books/test-book','/cartoons/test-show','/cartoons/test-show/clip-0','/learn','/memory','/grammar','/word-search','/privacy','/terms']
for(const bot of ['facebookexternalhit/1.1','Twitterbot/1.0'])test(`server-rendered social tags inherit without duplicates for ${bot}`,async({page,request})=>{
 for(const path of routes){
  const response=await request.get(path,{headers:{'user-agent':bot}})
  expect(response.ok(),path).toBe(true)
  const tags=await page.evaluate(html=>{
   const doc=new DOMParser().parseFromString(html,'text/html')
   return [...doc.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')].map(el=>({name:el.getAttribute('property')??el.getAttribute('name'),value:el.getAttribute('content'),head:!!el.closest('head')}))
  },await response.text())
  const expected:Record<string,string>={'og:title':title,'og:description':description,'og:image':image,'og:image:width':'1731','og:image:height':'909','og:image:alt':'ArabicWithM — Watch, Read, Learn: cinematic character collage surrounding the ArabicWithM logo.','og:type':'website','twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image}
  for(const [name,value] of Object.entries(expected))expect(tags.filter(t=>t.name===name),`${path} ${name}`).toEqual([{name,value,head:true}])
 }
})
test('public social PNG needs no authentication and matches the supplied image',async({request})=>{
 const response=await request.get(image)
 expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/png')
 const body=await response.body()
 expect(body.readUInt32BE(16)).toBe(1731);expect(body.readUInt32BE(20)).toBe(909)
 expect(createHash('sha256').update(body).digest('hex')).toBe('e1491ee6591b01f698ccea9351dd4a1b044e32f6640656b1f9628c13d136811a')
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
