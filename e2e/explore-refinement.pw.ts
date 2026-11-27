import {test,expect} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import {translateMessage} from '../app/lib/localisation/messages'
import {installYouTubeFixture} from './helpers/youtube'

for(const width of [320,375,390,430])for(const locale of ['en','ar'] as const)for(const theme of ['light','dark'])test(`mobile toolbar ${width} ${locale} ${theme}`,async({page,context,request},info)=>{
 const t=(value:string)=>translateMessage(locale,value)
 const id='22222222-2222-4222-8222-222222222222',encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),exp=Math.floor(Date.now()/1000)+3600
 const user={id,aud:'authenticated',role:'authenticated',email:'plus@fixture.example',app_metadata:{provider:'email'},user_metadata:{}}
 const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp,role:'authenticated'})}.fixture-signature`
 await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({user,access_token:token,expires_at:exp,refresh_token:'fixture-refresh',token_type:'bearer'})}`,domain:'127.0.0.1',path:'/'},{name:'awm-website-locale',value:locale,domain:'127.0.0.1',path:'/'}])
 await page.addInitScript(({locale,theme})=>{localStorage.setItem('awm-website-locale',locale);localStorage.setItem('awm-color-mode',theme);sessionStorage.setItem('awm-mobile-nav-intro-seen','1')},{locale,theme})
 await request.post('https://localhost:4365/fixture/for-you-playback');await request.post('https://localhost:4365/fixture/for-you-discovery')
 await installYouTubeFixture(page);await page.setViewportSize({width,height:844});await page.goto('/explore?view=foryou')
 const toolbar=page.locator('[data-mobile-for-you-toolbar]');await expect(toolbar).toBeVisible()
 await expect.poll(async()=>{const rects=await toolbar.getByRole('button').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().y));return Math.max(...rects)-Math.min(...rects)}).toBeLessThan(1)
 for(const button of await toolbar.getByRole('button').all()){const box=(await button.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(43);expect(box.width).toBeGreaterThanOrEqual(43);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr')
 const directory='artifacts/explore-refinement';await mkdir(directory,{recursive:true});await toolbar.screenshot({path:`${directory}/${info.project.name}-${width}-${locale}-${theme}.png`})
 await toolbar.getByRole('button',{name:t('Filter content'),exact:true}).click()
 const labels=page.locator('label');await expect(labels).toHaveCount(3);await expect(labels.filter({hasText:/^English$/})).toHaveCount(0)
 await labels.filter({hasText:'Fixture B'}).locator('input').uncheck();await page.getByRole('button',{name:t('Apply'),exact:true}).click()
 await toolbar.getByRole('button',{name:t('Filter content'),exact:true}).click();await expect(labels.filter({hasText:'Fixture A'}).locator('input')).toBeChecked();await expect(labels.filter({hasText:'Fixture B'}).locator('input')).not.toBeChecked()
 await labels.first().locator('input').check();await page.getByRole('button',{name:t('Apply'),exact:true}).click()
 await toolbar.getByRole('button',{name:t('More'),exact:true}).click();await page.locator('[data-mobile-playback-options]').screenshot({path:`${directory}/${info.project.name}-${width}-${locale}-${theme}-more.png`});
 expect(await page.locator('[data-mobile-playback-options]').getByText(t('Playback speed'),{exact:true}).evaluate(el=>getComputedStyle(el).color)).toBe('rgb(245, 237, 224)');const speed=page.locator('[data-mobile-playback-options]').getByRole('button',{name:t('Playback speed'),exact:true});await expect(speed).toBeEnabled();const prior=await speed.textContent();await speed.click();await expect(speed).not.toHaveText(prior!)
 await page.locator('[data-mobile-playback-options]').getByRole('button',{name:t('Settings'),exact:true}).click();await expect(page.getByText(t('Arabic text size'),{exact:true}).filter({visible:true})).toBeVisible();await page.keyboard.press('Escape')
})

for(const width of [320,1440])for(const theme of ['light','dark'])test(`book overlays ${width} ${theme}`,async({page},info)=>{
 await page.addInitScript(theme=>localStorage.setItem('awm-color-mode',theme),theme)
 await page.setViewportSize({width,height:844});await page.goto('/books')
 const badges=page.locator('[data-book-status-overlay]');await expect(badges.first()).toBeVisible()
 expect(await badges.count()).toBeGreaterThanOrEqual(2)
 for(const badge of await badges.all()){
  expect(await badge.evaluate(el=>getComputedStyle(el).opacity)).toBe('0.28')
  expect(await badge.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  expect(await badge.getAttribute('aria-label')).toBeTruthy()
 }
 const cover=page.locator('[data-library-book-card] img').first();await expect(cover).toBeVisible()
 expect(await cover.evaluate(el=>getComputedStyle(el).opacity)).toBe('1')
 const frame=await cover.locator('..').boundingBox();expect(frame!.width/frame!.height).toBeCloseTo(width<600?2/2.6:2/3,2)
 await badges.first().locator('xpath=ancestor::*[@data-library-book-card][1]').screenshot({path:`artifacts/explore-refinement/${info.project.name}-book-${width}-${theme}.png`})
})
