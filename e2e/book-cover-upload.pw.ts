import {test,expect,type BrowserContext,type Page} from '@playwright/test'
import sharp from 'sharp'
const backend='https://localhost:4357'
async function signIn(context:BrowserContext){
 const id='44444444-4444-4444-8444-444444444444',expires=Math.floor(Date.now()/1000)+3600,encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:'premium@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}


async function openBook(page:Page){await page.goto('/admin/books');await page.getByRole('cell',{name:'Test Book',exact:true}).click();return page.getByRole('dialog')}
async function portrait(colour:string,format:'png'|'jpeg'|'webp'='png',width=800,height=1000){return sharp({create:{width,height,channels:3,background:colour}})[format]().toBuffer()}

async function state(request:import('@playwright/test').APIRequestContext,data:Record<string,unknown>={}){return (await request.post(`${backend}/fixture/book-cover-state`,{data})).json()}
async function cropDone(page:Page){await page.getByRole('button',{name:'Confirm crop',exact:true}).click()}
async function fields(dialog:import('@playwright/test').Locator,slug:string,title:string){await dialog.getByLabel('Slug',{exact:false}).fill(slug);await dialog.getByLabel(/^Title\s*\*?$/).fill(title);await dialog.getByLabel('Description',{exact:false}).fill('A meaningful cover upload test book description.');await dialog.getByLabel('Level',{exact:false}).fill('B1')}
async function loaded(image:import('@playwright/test').Locator){await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true)}
for(const width of [390,1440])for(const format of ['jpeg','png','webp'] as const)test(`create with ${format} cover before entering slug, persist and display at ${width}px`,async({page,context,request},info)=>{
 await state(request,{failure:'none',failSave:false});await signIn(context);await page.setViewportSize({width,height:1000});await page.goto('/admin/books')
 await page.getByRole('button',{name:'New book',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'New Book',exact:true}),slug=`cover-${info.project.name}-${format}-${width}`,title=`Cover ${info.project.name} ${format} ${width}`
 const beforeAssets=await state(request)
 await dialog.locator('input[type=file]').setInputFiles({name:`same ${String.fromCharCode(0x643,0x62a,0x627,0x628)}'s portrait.${format.toUpperCase()}`,mimeType:`image/${format}`,buffer:await portrait(width===390?'#28614e':'#514891',format,width===1440?3200:800,width===1440?4000:1000)})
 await cropDone(page);await expect(dialog).toContainText('Cover uploaded. Save this book to keep the change.')
 const preview=dialog.locator('img[alt="Cover image"]');await loaded(preview)
 const afterAssets=await state(request);for(const old of beforeAssets.objects)expect(afterAssets.objects.find((item:{name:string})=>item.name===old.name)?.hash).toBe(old.hash)
 const uploaded=await preview.getAttribute('src');expect(uploaded).toMatch(/\/books\/[a-f0-9-]+--[a-f0-9-]+\.webp$/)
 await expect(preview).toHaveCSS('object-fit','contain')
 await fields(dialog,slug,title);await dialog.getByRole('checkbox',{name:'Completed',exact:true}).check();await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.reload();await page.getByRole('cell',{name:title,exact:true}).click()
 const reopened=page.getByRole('dialog',{name:'Edit Book',exact:true});await loaded(reopened.locator('img[alt="Cover image"]'));await expect(reopened.locator('img[alt="Cover image"]')).toHaveAttribute('src',uploaded!)
 const records=await state(request);expect(records.books.find((b:{slug:string})=>b.slug===slug).cover).toBe(uploaded)
 await reopened.getByRole('button',{name:'Cancel',exact:true}).click();await context.clearCookies()
 await page.goto(`/books/${slug}`);const detail=page.locator(`img[alt="${title} cover"]`).filter({visible:true}).first();await loaded(detail);await expect(detail).toHaveAttribute('src',new RegExp(uploaded!.split('?')[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
 await page.goto('/books');await page.getByRole('textbox',{name:'Search books',exact:true}).fill(title);const catalogue=page.locator(`img[alt="${title} cover"]`).filter({visible:true}).first();await catalogue.scrollIntoViewIfNeeded();await loaded(catalogue)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect((await request.get(uploaded!)).status()).toBe(200)
})
test('replacement remains isolated until Save, failed uploads/saves retain the old cover, and retry persists',async({page,context,request})=>{
 await state(request,{failure:'none',failSave:false});await signIn(context);const dialog=await openBook(page)
 const original=await state(request),book=original.books.find((b:{slug:string})=>b.slug==='test-book'),old=book.cover||`${backend}/storage/v1/object/public/covers/books/test-book.webp`,oldBytes=await(await request.get(old)).body()
 await state(request,{failure:'variant'})
 const file={name:'same portrait.PNG',mimeType:'image/png',buffer:await portrait('#76341c')}
 await dialog.locator('input[type=file]').setInputFiles(file)
 await expect(dialog.getByRole('alert')).toContainText("We couldn't upload this cover. Please try again.")
 await expect(dialog.getByRole('button',{name:'Save',exact:true})).toBeEnabled()
 expect((await state(request)).books.find((b:{slug:string})=>b.slug==='test-book').cover).toBe(book.cover)
 expect((await(await request.get(old)).body()).equals(oldBytes)).toBe(true)
 await state(request,{failure:'none'});await dialog.locator('input[type=file]').setInputFiles(file);await cropDone(page);const replacement=await dialog.locator('img[alt="Cover image"]').getAttribute('src');expect(replacement).not.toBe(old)
 expect((await(await request.get(old)).body()).equals(oldBytes)).toBe(true)
 await state(request,{failSave:true});await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toContainText('Unable to save the book. Please try again.')
 expect((await state(request)).books.find((b:{slug:string})=>b.slug==='test-book').cover).toBe(book.cover)
 await state(request,{failSave:false});await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.reload();await page.getByRole('cell',{name:'Test Book',exact:true}).click();const reopened=page.getByRole('dialog');await expect(reopened.locator('img[alt="Cover image"]')).toHaveAttribute('src',replacement!);await loaded(reopened.locator('img[alt="Cover image"]'))
 const final=await state(request);expect(final.contentDigest).toBe(original.contentDigest);expect(final.books.find((b:{slug:string})=>b.slug==='test-book').is_completed).toBe(book.is_completed)
 expect((await(await request.get(old)).body()).equals(oldBytes)).toBe(true)
 const proxy=await request.get(`/api/covers/books/${book.id}?w=640`),variant=replacement!.replace('/covers/books/','/covers/variants/books/').replace('.webp','-640.webp')
 expect(proxy.status()).toBe(200);expect(proxy.headers()['cache-control']).toBe('public, no-cache, must-revalidate');expect((await proxy.body()).equals(await(await request.get(variant)).body())).toBe(true)
 await page.goto('/books/test-book');await loaded(page.locator('img[alt="Test Book cover"]').filter({visible:true}).first())
 await page.goto('/books');const cover=page.locator('img[alt="Test Book cover"]').filter({visible:true}).first();await cover.scrollIntoViewIfNeeded();await loaded(cover)
})
test('invalid files explain the reason without writes; a stalled upload times out and can be retried',async({page,context,request})=>{
 await state(request,{failure:'none',failSave:false});await signIn(context);await page.setViewportSize({width:320,height:1000});const dialog=await openBook(page),initial=await state(request)
 const input=dialog.locator('input[type=file]')
 await input.setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('PDF')});await expect(dialog.getByRole('alert')).toContainText('Please choose a JPG, PNG or WebP image.')
 await input.setInputFiles({name:'corrupt.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not an image')});await expect(dialog.getByRole('alert')).toContainText("couldn't be read")
 await input.setInputFiles({name:'large.JPG',mimeType:'image/jpeg',buffer:Buffer.alloc(20*1024*1024+1)});await expect(dialog.getByRole('alert')).toContainText('20 MB')
 expect((await state(request)).writes.length).toBe(initial.writes.length)
 await state(request,{failure:'hang'});await page.clock.install();await input.setInputFiles({name:'portrait.webp',mimeType:'image/webp',buffer:await portrait('#394e72','webp')})
 await expect(dialog.getByRole('button',{name:/Uploading cover/})).toBeVisible();await expect(dialog.getByRole('button',{name:'Save',exact:true})).toBeDisabled();await expect.poll(async()=>(await state(request)).attempts.length).toBeGreaterThan(initial.attempts.length);await page.clock.fastForward(45000)
 await expect(dialog.getByRole('alert')).toContainText('Cover upload timed out. Please try again.');await expect(dialog.getByRole('button',{name:'Save',exact:true})).toBeEnabled();await page.clock.resume()
 await state(request,{failure:'none'});await input.setInputFiles({name:'portrait.webp',mimeType:'image/webp',buffer:await portrait('#394e72','webp')});await cropDone(page);await loaded(dialog.locator('img[alt="Cover image"]'))
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await dialog.screenshot({path:`test-results/${test.info().project.name}-book-cover-mobile-320.png`})
})
test('public readers can read the asset, while non-service clients cannot upload or replace it',async({request})=>{
 const before=await state(request)
 for(const token of [null,'fixture-free-token','fixture-editor-token']){
  const response=await request.post(`${backend}/storage/v1/object/covers/books/unauthorized.webp`,{headers:token?{Authorization:`Bearer ${token}`}:{},data:await portrait('#123456','webp')});expect(response.status()).toBe(403)
 }
 expect((await state(request)).writes.length).toBe(before.writes.length)
})

test('a failed book-detail image displays an accessible fallback without changing layout',async({page})=>{
 await page.route('**/storage/v1/object/public/covers/**',route=>route.fulfill({status:404,body:'Missing image'}))
 await page.goto('/books/test-book');await expect(page.getByRole('img',{name:'Test Book cover unavailable',exact:true}).filter({visible:true})).toBeVisible()
 await expect(page.locator('img[alt="Test Book cover"]:visible')).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
