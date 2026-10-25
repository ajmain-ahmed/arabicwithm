import {test,expect,type BrowserContext} from '@playwright/test'
async function signIn(context:BrowserContext){
 const id='11111111-1111-4111-8111-111111111111',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'free@fixture.example',created_at:'2026-01-01',app_metadata:{provider:'email'},user_metadata:{full_name:'Free learner'}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for(const width of [320,390,1440])test(`Word Type and case controls at ${width}`,async({page,context})=>{
 await signIn(context);await page.setViewportSize({width,height:1000});await page.goto('/grammar');await page.getByRole('button',{name:'Word Type',exact:true}).click()
 const answers=page.locator('[data-grammar-answers]');await expect(answers).toBeVisible()
 const dimensions=await answers.getByRole('button').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect(),s=getComputedStyle(node);return [b.width,b.height,s.textAlign,s.justifyContent]}))
 for(const dimensionsOfButton of dimensions)expect(dimensionsOfButton).toEqual(dimensions[0])
 expect(dimensions[0][2]).toBe('center');expect(dimensions[0][3]).toBe('center')
 const cog=page.getByRole('button',{name:'Settings',exact:true}),activity=page.locator('[data-grammar-question]')
 expect((await cog.boundingBox())!.y).toBeLessThan((await activity.boundingBox())!.y)
 const ar=page.locator('[data-grammar-arabic]').first(),en=page.locator('[data-grammar-english]').first()
 const arBefore=await ar.evaluate(el=>getComputedStyle(el).fontSize),enBefore=await en.evaluate(el=>getComputedStyle(el).fontSize)
 await cog.click();await page.getByRole('button',{name:'Increase Arabic text size',exact:true}).click();await page.getByRole('switch',{name:'Tashk\u012bl',exact:true}).uncheck();await page.getByRole('button',{name:'Done',exact:true}).click()
 expect(await ar.evaluate(el=>getComputedStyle(el).fontSize)).not.toBe(arBefore);expect(await en.evaluate(el=>getComputedStyle(el).fontSize)).toBe(enBefore);expect(await ar.textContent()).not.toMatch(/[\u064b-\u065f]/)
 await cog.click();await page.getByRole('button',{name:'Increase English text size',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();expect(await en.evaluate(el=>getComputedStyle(el).fontSize)).not.toBe(enBefore)
 await page.getByRole('button',{name:'Back to Grammar',exact:true}).click();await page.getByRole('button',{name:'Case Endings',exact:true}).click()
 for(const [english,arabic] of [['Nominative','\u0645\u0631\u0641\u0648\u0639'],['Accusative','\u0645\u0646\u0635\u0648\u0628'],['Genitive','\u0645\u062c\u0631\u0648\u0631']])await expect(answers.getByRole('button').filter({hasText:english})).toContainText(arabic)
 await expect(answers).not.toContainText('Dative');await page.screenshot({path:`test-results/case-controls-${width}.png`,fullPage:true})
 await page.getByRole('button',{name:'Back to Grammar',exact:true}).click();await page.getByRole('button',{name:'Revise Na\u1e25w Rules',exact:true}).click()
 for(const level of ['A1','A2','B1','B2','C1','C2'])await expect(page.getByRole('heading',{name:level,exact:true})).toBeVisible()
 const grid=page.getByRole('region',{name:'A1 rules'}).locator('> div').last();expect(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width<600?2:4)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/nahw-compact-${width}.png`,fullPage:true})
})
for(const width of [320,390,1440])test(`Read library at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/books')
 const sections=page.locator('[data-mobile-read-sections]')
 if(width<600){
  await expect(sections).toBeVisible()
  for(const category of ['Mystery','History','Short Reads'])await expect(sections.getByRole('region',{name:category,exact:true})).toBeVisible()
  const grid=sections.getByRole('region',{name:'Mystery',exact:true}).locator('[data-mobile-book-grid]')
  expect(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3)
  const cards=grid.getByRole('link'),bounds=await cards.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().y));expect(new Set(bounds).size).toBe(1)
  expect(await cards.first().locator('p').evaluate(el=>getComputedStyle(el).textAlign)).toBe('center')
  await expect(sections).not.toContainText('Popular');await expect(sections).not.toContainText('New Releases')
 }else{await expect(sections).toBeHidden();await expect(page.getByRole('region',{name:'Book library',exact:true})).toBeVisible()}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/read-library-${width}.png`,fullPage:true})
})
