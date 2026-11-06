import {test,expect} from '@playwright/test'
import {createHash} from 'node:crypto'
const hashes:Record<string,string>={"favicon.ico": "c65cc54d23f6f92c6ae9ef237e776ce7bb5c87848c5cb23b57124e3dd14e98eb", "favicon.svg": "1b21208469ea98d6c399bbaa4e60c074a4e667badf2a8d736ce9e0bfca2ea4e9", "favicon-16x16.png": "dbf2c2a8ac567ece9d16d94bbdbeef94747a79728f93fadbead98cea93663968", "favicon-32x32.png": "480e7faf1e638b3d18aacde553af720c94db76961f61939a8d9bbb09d8c4733b", "favicon-48x48.png": "85f915772eb73375fc5dfb839b1212c11101cf2b2857ed4ed69676dfb82f474b", "apple-touch-icon.png": "7394738a578675ef97c729208c52a4b240ecc48e00520f523bbc8dbd69414f3e", "android-chrome-192x192.png": "40f9ddf6a48296a9f5584ffd3fce23e4d3d41d994f84fbfc17c6701d679eab59", "android-chrome-512x512.png": "c04f5b095cb678396bbe2786170e5566044ce0c2aaa4d8cf6ee533c9b934375c", "android-chrome-maskable-512x512.png": "d0108c67cbcb628f7590620181ddb35c2f26a01ca393b065542af75f9d95ad37", "safari-pinned-tab.svg": "59e466f734de203ba99d1e19c112d20b0aba2d005296a9e40d886248aed4e578", "site.webmanifest": "7d22a27f3796410a61116973c042de528ee0c74a6fde7303659146d7d9b61a1a"}
const icons=[
 {rel:'icon',href:'/favicon.ico',type:'image/x-icon',sizes:'16x16 32x32 48x48',color:null},
 {rel:'icon',href:'/favicon-16x16.png',type:'image/png',sizes:'16x16',color:null},
 {rel:'icon',href:'/favicon-32x32.png',type:'image/png',sizes:'32x32',color:null},
 {rel:'icon',href:'/favicon-48x48.png',type:'image/png',sizes:'48x48',color:null},
 {rel:'icon',href:'/favicon.svg',type:'image/svg+xml',sizes:'any',color:null},
 {rel:'apple-touch-icon',href:'/apple-touch-icon.png',type:'image/png',sizes:'180x180',color:null},
 {rel:'mask-icon',href:'/safari-pinned-tab.svg',type:null,sizes:null,color:'#046154'},
 {rel:'manifest',href:'/site.webmanifest',type:null,sizes:null,color:null},
]
test('all supplied assets return 200 with original bytes and correct formats',async({request,page})=>{
 for(const [name,hash]of Object.entries(hashes)){
  const response=await request.get('/'+name);expect(response.status(),name).toBe(200)
  const bytes=await response.body();expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(hash)
  const mime=response.headers()['content-type']
  if(name.endsWith('.png')){
   expect(mime).toContain('image/png')
   const size=name==='apple-touch-icon.png'?180:Number(name.match(/(\d+)x\d+/)![1])
   expect(bytes.readUInt32BE(16)).toBe(size);expect(bytes.readUInt32BE(20)).toBe(size)
  }else if(name.endsWith('.svg')){
   expect(mime).toContain('image/svg+xml')
   const parsed=await page.evaluate(text=>{const doc=new DOMParser().parseFromString(text,'image/svg+xml');return {error:!!doc.querySelector('parsererror'),raster:!!doc.querySelector('image'),paths:doc.querySelectorAll('path').length}},bytes.toString())
   expect(parsed.error).toBe(false);expect(parsed.raster).toBe(false);expect(parsed.paths).toBe(2)
  }else if(name.endsWith('.ico')){
   expect(mime).toMatch(/image\/(x-icon|vnd.microsoft.icon)/)
   expect(bytes.readUInt16LE(4)).toBe(3)
   expect([0,1,2].map(i=>bytes[6+16*i])).toEqual([16,32,48])
  }else expect(mime).toContain('application/manifest+json')
 }
})
test('manifest retains the supplied PWA identity and icon purposes',async({request})=>{
 const manifest=await(await request.get('/site.webmanifest')).json()
 expect(manifest).toMatchObject({id:'/',name:'ArabicWithM',short_name:'ArabicWithM',start_url:'/',scope:'/',display:'standalone',background_color:'#f7f7f4',theme_color:'#046154'})
 expect(manifest.icons).toEqual([
  {src:'/android-chrome-192x192.png',sizes:'192x192',type:'image/png',purpose:'any'},
  {src:'/android-chrome-512x512.png',sizes:'512x512',type:'image/png',purpose:'any'},
  {src:'/android-chrome-maskable-512x512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
 ])
})
for(const width of [390,1440])test(`global browser icon links on direct routes at ${width}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900}})
 const page=await context.newPage(),base=`http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT??3000}`
 for(const path of ['/','/cartoons','/cartoons/test-show','/cartoons/test-show/clip-0','/books','/books/test-book','/explore','/learn','/privacy']){
  const response=await page.goto(base+path);expect(response?.status(),path).toBe(200)
  await expect(page.locator('head link[rel="icon"],head link[rel="apple-touch-icon"],head link[rel="mask-icon"],head link[rel="manifest"]')).toHaveCount(icons.length)
  const actual=await page.locator('head link[rel="icon"],head link[rel="apple-touch-icon"],head link[rel="mask-icon"],head link[rel="manifest"]').evaluateAll(links=>links.map(el=>({rel:el.getAttribute('rel'),href:el.getAttribute('href'),type:el.getAttribute('type'),sizes:el.getAttribute('sizes'),color:el.getAttribute('color')})))
  expect(actual,path).toHaveLength(icons.length)
  expect(actual,path).toEqual(expect.arrayContaining(icons))
 }
 await context.close()
})

test('crawler responses include global icons without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,userAgent:'facebookexternalhit/1.1'})
 const page=await context.newPage(),base=`http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT??3000}`
 for(const path of ['/','/books/test-book','/cartoons/test-show']){
  await page.goto(base+path)
  await expect(page.locator('head link[rel="icon"]')).toHaveCount(5)
  await expect(page.locator('head link[rel="apple-touch-icon"]')).toHaveAttribute('href','/apple-touch-icon.png')
  await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute('href','/site.webmanifest')
 }
 await context.close()
})
