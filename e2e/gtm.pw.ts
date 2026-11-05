import {test,expect,type Page} from '@playwright/test'
const container='GTM-WLD4QMF2'
async function ready(page:Page){
 await expect(page.locator(`head script[src="https://www.googletagmanager.com/gtm.js?id=${container}"]`)).toHaveCount(1)
 await expect.poll(()=>page.evaluate(id=>!!(window as unknown as {google_tag_manager?:Record<string,unknown>}).google_tag_manager?.[id],container)).toBe(true)
 expect(await page.evaluate(()=>{
  const data=(window as unknown as {dataLayer:({event?:string;[key:number]:unknown})[]}).dataLayer
  return {js:data.filter(item=>item[0]==='js').length,start:data.filter(item=>item.event==='gtm.js').length}
 })).toEqual({js:1,start:1})
}
for(const width of [390,1440])test(`one global GTM container survives client navigation at ${width}`,async({page})=>{
 let requests=0
 page.on('request',request=>{if(request.url()===`https://www.googletagmanager.com/gtm.js?id=${container}`)requests++})
 await page.setViewportSize({width,height:950});await page.goto('/');await ready(page)
 await page.evaluate(()=>{(window as unknown as {gtmDocumentMarker:string}).gtmDocumentMarker='same-document'})
 for(const [label,path] of [['Read','/books'],['Explore','/explore'],['Learn','/learn'],['Home','/']] as const){
  if(width<900){await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('dialog',{name:'Site navigation',exact:true}).getByRole('button',{name:label,exact:true}).click()}
  else await page.getByRole('navigation',{name:'Primary navigation',exact:true}).getByRole('link',{name:label,exact:true}).click()
  await expect(page).toHaveURL(path);await ready(page)
  expect(await page.evaluate(()=>(window as unknown as {gtmDocumentMarker:string}).gtmDocumentMarker)).toBe('same-document')
 }
 expect(requests).toBe(1)
})
for(const path of ['/books/test-book/chapter-1','/profile','/reset-password'])test(`direct route includes the global GTM container: ${path}`,async({page,request})=>{
 const response=await request.get(path)
 const csp=response.headers()['content-security-policy']
 expect(csp).toContain('https://www.googletagmanager.com');expect(csp).not.toContain("'unsafe-eval'")
 await page.goto(path);await ready(page)
})
