import {test,expect,type BrowserContext} from '@playwright/test'
import {signInFixture} from './helpers/account'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
const id='22222222-2222-4222-8222-222222222222'
async function seed(context:BrowserContext){
 await signInFixture(context)
 // Update the fixture account through its authenticated session, not production.
 const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url')
 const token=`${encode({alg:'HS256'})}.${encode({sub:id})}.fixture-signature`
 await context.request.put(`${backend}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`},data:{data:{avatar_url:`${backend}/storage/v1/object/public/profile-media/legacy.webp`,avatar_crop:{x:50,y:50,zoom:1},banner_url:null}}})
}
for(const width of [320,390,768,1440])test(`left-overlap profile presets save, reload and cancel at ${width}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/profile-presets`,{data:{reset:true}});await seed(context);await page.setViewportSize({width,height:1000});await page.goto('/profile')
 await page.locator('[data-profile-header]:visible').evaluate(async el=>{await Promise.all(el.closest('.pv-fade-up')?.getAnimations().map(a=>a.finished)??[])})
 const avatar=page.locator('[data-profile-avatar]:visible'),banner=page.locator('[data-profile-banner-frame]:visible'),identity=page.locator('[data-profile-identity]:visible')
 const a=(await avatar.boundingBox())!,b=(await banner.boundingBox())!,c=(await identity.boundingBox())!
 const offset=width>=900?32:width>=600?24:16
 expect(a.x-b.x).toBeCloseTo(offset,0);expect(a.y+a.height/2).toBeCloseTo(b.y+b.height,0)
 expect(a.x+a.width/2).toBeLessThan(b.x+b.width*.45);expect(c.y+await identity.evaluate(el=>parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThanOrEqual(a.y+a.height+15)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(page.getByRole('button',{name:'Choose Profile Picture',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Change profile photo'})).toHaveCount(0);await expect(page.locator('input[type=file]')).toHaveCount(0)
 await expect(avatar.locator('img')).toHaveAttribute('src',/legacy.webp/)
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Choose Profile Picture',exact:true}).click()
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Choose Profile Picture'})).toBeVisible()
 await expect(dialog.locator('[aria-label^="Select "]')).toHaveCount(11);await expect(dialog.getByRole('button',{name:'Select not an image'})).toHaveCount(0)
 const select=dialog.getByRole('button',{name:'Select fox',exact:true});await select.focus();await page.keyboard.press('Enter');await expect(select).toHaveAttribute('aria-pressed','true')
 await expect(avatar.locator('img')).toHaveAttribute('src','/api/profile-presets/profile-pictures/fox.png')
 await expect.poll(()=>avatar.locator('img').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0)
 await page.screenshot({path:`test-results/profile-avatar-picker-${width}.png`,fullPage:true,animations:'disabled'});await dialog.getByRole('button',{name:'Done',exact:true}).click()
 await page.getByRole('button',{name:'Choose Profile Banner',exact:true}).click();await dialog.getByRole('button',{name:'Select oasis',exact:true}).click()
 const thumb=(await dialog.getByRole('button',{name:'Select oasis',exact:true}).boundingBox())!;expect(thumb.width/thumb.height).toBeCloseTo(3,1)
 await page.screenshot({path:`test-results/profile-banner-picker-${width}.png`,fullPage:true,animations:'disabled'});await dialog.getByRole('button',{name:'Done',exact:true}).click()
 await expect(banner.locator('img')).toHaveAttribute('src','/api/profile-presets/profile-banners/oasis.png')
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect(page.getByText('Profile saved.',{exact:true})).toBeVisible()
 if(width>=900)await expect(page.getByRole('button',{name:'Open user menu',exact:true}).locator('img')).toHaveAttribute('src','/api/profile-presets/profile-pictures/fox.png')
 await page.reload()
 await expect(avatar.locator('img')).toHaveAttribute('src','/api/profile-presets/profile-pictures/fox.png');await expect(banner.locator('img')).toHaveAttribute('src','/api/profile-presets/profile-banners/oasis.png')
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Choose Profile Picture',exact:true}).click();await dialog.getByRole('button',{name:'Select owl',exact:true}).click();await dialog.getByRole('button',{name:'Done',exact:true}).click()
 await page.getByRole('button',{name:'Choose Profile Banner',exact:true}).click();await dialog.getByRole('button',{name:'Select sea',exact:true}).click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 await expect(banner.locator('img')).toHaveAttribute('src','/api/profile-presets/profile-banners/oasis.png')
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(avatar.locator('img')).toHaveAttribute('src','/api/profile-presets/profile-pictures/fox.png')
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`test-results/profile-header-${width}.png`,fullPage:true,animations:'disabled'});await page.reload();await expect(avatar.locator('img')).toHaveAttribute('src','/api/profile-presets/profile-pictures/fox.png')
})
test('fresh Storage additions, empty banners and safe load failure recover without a deployment',async({page,context,request})=>{
 await request.post(`${backend}/fixture/profile-presets`,{data:{reset:true,emptyBanners:true}});await seed(context);await page.goto('/profile');await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Choose Profile Banner',exact:true}).click()
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('No profile banners are available yet.')
 await request.post(`${backend}/fixture/profile-presets`,{data:{add:'profile-banners/new-arrival.png'}});await dialog.getByRole('button',{name:'Refresh',exact:true}).click();await expect(dialog.getByRole('button',{name:'Select new arrival'})).toBeVisible()
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await request.post(`${backend}/fixture/profile-presets`,{data:{fail:true}});await page.getByRole('button',{name:'Choose Profile Picture',exact:true}).click()
 await expect(dialog).toContainText('Profile pictures could not be loaded. Please try again.');await expect(dialog).not.toContainText('PRIVATE_STORAGE_DETAIL')
 await request.post(`${backend}/fixture/profile-presets`,{data:{fail:false,add:'profile-pictures/new-avatar.png'}});await dialog.getByRole('button',{name:'Try again',exact:true}).click();await expect(dialog.getByRole('button',{name:'Select new avatar'})).toBeVisible()
})
test('image endpoint denies non-preset buckets and unsupported objects',async({request})=>{
 for(const path of ['profile-media/private.png','profile-pictures/not-an-image.txt','profile-pictures/unknown.svg','profile-banners/missing.png'])expect((await request.get(`/api/profile-presets/${path}`)).status()).toBe(404)
})
