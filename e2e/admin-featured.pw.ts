import {test,expect,type BrowserContext} from '@playwright/test'
const ids={user:'11111111-1111-4111-8111-111111111111',premium:'22222222-2222-4222-8222-222222222222',editor:'33333333-3333-4333-8333-333333333333',admin:'44444444-4444-4444-8444-444444444444'}
async function signIn(context:BrowserContext,role:keyof typeof ids){
 const id=ids[role],expires=Math.floor(Date.now()/1000)+3600,encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const user={id,aud:'authenticated',role:'authenticated',email:`${role}@fixture.example`,app_metadata:{provider:'email'},user_metadata:{}}
 const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}

const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const role of ['user','premium','editor'] as const)test(`Featured route denies ${role}`,async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await signIn(context,role);await page.goto('/admin/featured');await expect(page).toHaveURL('/')
 await page.setViewportSize({width:390,height:900});await page.getByRole('button',{name:'Open menu',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Site navigation'}).getByRole('button',{name:'Featured',exact:true})).toHaveCount(0)
 expect(errors).toEqual([])
})
test('Admin manages existing artwork, uploads, previews, saves, cancels, replaces and deletes',async({page,context,request})=>{
 await request.post(`${backend}/fixture/featured`);await signIn(context,'admin');await page.setViewportSize({width:1440,height:1000});await page.goto('/admin/featured')
 await expect(page.getByRole('heading',{name:'Featured',exact:true})).toBeVisible()
 const section=page.getByRole('region',{name:'test-show.webp',exact:true}),orphan=page.getByRole('region',{name:'ORPHAN.webp',exact:true})
 await expect(section).toContainText('Test Show');await expect(orphan).toContainText('No matching show')
 await section.getByRole('button',{name:'Edit / Position'}).click()
 const dialog=page.getByRole('dialog',{name:'Edit / Position',exact:true})
 await expect(dialog.getByRole('img',{name:'Featured artwork preview'})).toHaveCSS('object-position','50% 50%')
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 await section.getByRole('button',{name:'Replace',exact:true}).click()
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#086c59';ctx.fillRect(0,0,1200,800);ctx.fillStyle='#e5ad30';ctx.fillRect(400,200,400,400);return canvas.toDataURL('image/png').split(',')[1]})
 await dialog.locator('input[type=file]').setInputFiles({name:'landscape.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')})
 const image=dialog.getByRole('img',{name:'Featured artwork preview'})
 await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBe(1200)
 const preview=dialog.getByRole('group',{name:'Desktop positioning preview'}),bounds=(await preview.boundingBox())!
 expect(bounds.width/bounds.height).toBeCloseTo(2560/1080,1)
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2+40,{steps:5});await page.mouse.up()
 await expect(image).not.toHaveCSS('object-position','50% 50%')
 await dialog.getByRole('button',{name:'Mobile Preview',exact:true}).click()
 const phone=await dialog.getByRole('group',{name:'Mobile positioning preview'}).boundingBox();expect(phone!.width).toBeCloseTo(358,0);expect(phone!.height).toBeCloseTo(472.64,0)
 await page.mouse.move(phone!.x+180,phone!.y+180);await page.mouse.down();await page.mouse.move(phone!.x+210,phone!.y+180,{steps:5});await page.mouse.up()
 for(const axis of ['Horizontal','Vertical']){const slider=dialog.getByRole('slider',{name:new RegExp(axis)});await slider.focus();await slider.press('Home');await slider.press('ArrowRight')}
 await expect(image).toHaveCSS('object-position','1% 1%')
 await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
 const canonical=page.getByRole('region',{name:'test-show.png',exact:true});await expect(canonical).toBeVisible();await expect(section).toHaveCount(0)
 await page.reload();await canonical.getByRole('button',{name:'Edit / Position'}).click();await expect(image).toHaveCSS('object-position','1% 1%')
 await dialog.getByRole('button',{name:'Reset',exact:true}).click();await expect(image).toHaveCSS('object-position','50% 50%');await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 await page.goto('/');const hero=page.locator('[data-featured-hero]');await expect(hero.locator('img').first()).toHaveCSS('object-position','1% 1%');await expect(hero.getByRole('link',{name:'View Test Show'})).toHaveAttribute('href','/cartoons/test-show')
 const old=await hero.locator('img').first().getAttribute('src');expect(old).toContain('test-show.png?v=')
 await page.goto('/admin/featured');await canonical.getByRole('button',{name:'Replace',exact:true}).click();await dialog.locator('input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await expect(image).toHaveCSS('object-position','50% 50%');await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.goto('/');await expect(hero.locator('img').first()).toHaveCSS('object-position','50% 50%');expect(await hero.locator('img').first().getAttribute('src')).not.toBe(old)
 await page.goto('/admin/featured');await canonical.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(canonical).toBeVisible()
 await canonical.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Delete Featured image',exact:true}).click();await expect(canonical).toHaveCount(0)
 await orphan.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Delete Featured image',exact:true}).click();await expect(orphan).toHaveCount(0)
 await page.goto('/cartoons/test-show');await expect(page.getByText('Test Show',{exact:true}).first()).toBeVisible()
 await page.setViewportSize({width:390,height:900});await page.goto('/admin/featured');await page.getByRole('button',{name:'Admin',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Featured',exact:true})).toBeVisible()
})

test('mobile Featured editor keeps controls and previews within the page',async({page,context,request})=>{
 await request.post(`${backend}/fixture/featured`);await signIn(context,'admin');await page.setViewportSize({width:390,height:844});await page.goto('/admin/featured')
 await page.getByRole('region',{name:'test-show.webp',exact:true}).getByRole('button',{name:'Edit / Position'}).click()
 const dialog=page.getByRole('dialog',{name:'Edit / Position',exact:true});await expect(dialog.getByRole('button',{name:'Save',exact:true})).toBeInViewport()
 await dialog.getByRole('button',{name:'Mobile Preview',exact:true}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/featured-editor-mobile.png',fullPage:true,animations:'disabled'})
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('region',{name:'test-show.webp',exact:true}).getByRole('button',{name:'Edit / Position'}).click();await page.screenshot({path:'test-results/featured-editor-desktop.png',fullPage:true,animations:'disabled'})
})
