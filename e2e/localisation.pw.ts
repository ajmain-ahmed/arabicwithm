import {WEBSITE_LOCALISATION_ENABLED} from '../app/lib/localisation/features'
import {test,expect} from '@playwright/test'
test.skip(!WEBSITE_LOCALISATION_ENABLED,'Bilingual website mode is temporarily paused; retained for reactivation.')
import {installYouTubeFixture} from './helpers/youtube'
import {mkdir} from 'node:fs/promises'
for(const width of [390,768,1440])test(`website locale persistence and player/workspace identity ${width}`,async({page,request},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/hydration|server rendered|client.*match/i.test(message.text()))errors.push(message.text())})
 const providerCalls:string[]=[];page.on('request',req=>{if(/openai\.com|generativelanguage\.googleapis|functions\/v1\/metadata-localisation/.test(req.url()))providerCalls.push(req.url())})
 await request.post('https://localhost:4365/fixture/localisation')
 await request.post('https://localhost:4365/fixture/english-for-you',{data:{subtitleLayout:true,seek:true}})
 await installYouTubeFixture(page);await page.setViewportSize({width,height:1000});await page.goto('/')
 await expect(page.locator('html')).toHaveAttribute('lang','en')
 await mkdir('artifacts/localisation/screenshots',{recursive:true})
 const screenshot=async(name:string)=>page.screenshot({path:`artifacts/localisation/screenshots/${info.project.name}-${width}-${name}.png`,fullPage:true})
 const set=async(locale:'en'|'ar')=>{if(width<900)await page.locator('[data-mobile-menu-trigger]').first().click();await page.getByRole('button',{name:locale==='ar'?'Website language':'لغة الموقع',exact:true}).click();await page.getByRole('menuitem',{name:locale==='ar'?'العربية — AR':'English — EN',exact:true}).click();await expect(page.getByRole('menu')).not.toBeVisible();if(width<900)await page.keyboard.press('Escape');await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr')}
 await screenshot('home-en');await set('ar')
 if(width>=900){
  const navbar=page.getByRole('banner')
  await navbar.screenshot({path:`artifacts/localisation/screenshots/${info.project.name}-${width}-navbar-ar.png`})
  for(const name of ['تسجيل الدخول','لغة الموقع']){
   const gap=await navbar.getByRole('button',{name,exact:true}).evaluate(el=>Number.parseFloat(getComputedStyle(el).columnGap))
   expect(gap).toBeGreaterThanOrEqual(6);expect(gap).toBeLessThanOrEqual(8)
  }
 }
 const footer=page.getByRole('contentinfo');await footer.scrollIntoViewIfNeeded()
 await expect(footer.getByRole('button',{name:'سياسة الخصوصية',exact:true})).toBeVisible()
 await expect(footer.getByRole('button',{name:'شروط الاستخدام',exact:true})).toBeVisible()
 await expect(footer).toContainText('نجعل تعلّم اللغة العربية في متناول الجميع')
 await footer.screenshot({path:`artifacts/localisation/screenshots/${info.project.name}-${width}-footer-ar.png`})
 await expect(page.getByRole('heading',{name:'ترقَّ إلى AWM+',exact:true})).toBeVisible()
 await expect(page.getByText('مشاهدة غير محدودة في «لك»',{exact:true})).toBeVisible()
 await screenshot('home-ar');await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','ar')
 for(const [name,url] of [['watch','/cartoons'],['read','/books'],['learn','/learn']] as const){
  await page.goto(url);await expect(page.locator('html')).toHaveAttribute('lang','ar')
  if(name==='watch'){
   await expect(page.getByPlaceholder('ابحث عن حلقة أو مسلسل').filter({visible:true})).toBeVisible()
   if(width<900)await page.getByRole('button',{name:/^عوامل التصفية/}).filter({visible:true}).first().click()
   await expect(page.getByRole('button',{name:'أكشن',exact:true}).filter({visible:true})).toBeVisible()
   await screenshot('watch-filters-ar');await page.getByRole('button',{name:'أكشن',exact:true}).filter({visible:true}).click();await expect(page).toHaveURL(/category=Action/)
   if(width<900)await page.getByRole('button',{name:'إغلاق عوامل التصفية',exact:true}).click()
  }
  if(name==='read'){
   await expect(page.getByPlaceholder('ابحث عن كتاب').filter({visible:true})).toBeVisible()
   await expect(page.getByText('كِتَابُ الْأَمْثَالِ',{exact:true}).first()).toBeVisible()
   await expect(page.getByRole('button',{name:'استمع',exact:true})).toBeVisible()
  }
  if(name==='learn'){
   await expect(page.locator('[data-practice-launcher]')).toHaveCount(3);await expect(page.getByRole('grid')).toHaveCount(0)
   for(const id of ['puzzle','grammar'])await page.locator(`[data-practice-launcher=${id}]`).getByRole('button').first().click()
   await expect(page.getByRole('grid')).toBeVisible();await expect(page.locator('[data-grammar-question]')).toBeVisible({timeout:30000})
   const nav=page.locator('[data-learn-navigation]:visible');await expect(nav.getByRole('link')).toHaveCount(3)
   await expect(nav.getByRole('link',{name:'البحث عن الكلمات',exact:true})).toHaveAttribute('href','/word-search')
   const tiles=await nav.getByRole('link').all();const rectangles=await Promise.all(tiles.map(tile=>tile.boundingBox()))
   for(const rect of rectangles){expect(Math.abs(rect!.width-rect!.height)).toBeLessThan(2);expect(Math.abs(rect!.width-rectangles[0]!.width)).toBeLessThan(1);expect(Math.abs(rect!.y-rectangles[0]!.y)).toBeLessThan(1)}
   await nav.screenshot({path:`artifacts/localisation/screenshots/${info.project.name}-${width}-learn-tiles-ar.png`})
  }
  await screenshot(name+'-ar');await set('en');await screenshot(name+'-en');await set('ar')
 }
 const question=await page.locator('[data-grammar-question]').first().getAttribute('data-grammar-question');const grid=await page.getByRole('grid').first().textContent();await set('en');expect(await page.locator('[data-grammar-question]').first().getAttribute('data-grammar-question')).toBe(question);expect(await page.getByRole('grid').first().textContent()).toBe(grid)
 await page.goto('/explore?view=foryou');const player=page.locator('[data-for-you-source] iframe');await expect(player).toBeVisible();await player.evaluate(el=>el.setAttribute('data-locale-identity','retained'));await screenshot('explore-en');await set('ar');await expect(player).toHaveAttribute('data-locale-identity','retained');await screenshot('explore-ar')
 await page.goto('/learn');await expect(page.locator('html')).toHaveAttribute('lang','ar');await page.goBack();await expect(page.locator('html')).toHaveAttribute('lang','ar')
 await page.goto('/');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('البريد الإلكتروني',{exact:true})).toBeVisible();await screenshot('auth-ar');await page.getByRole('button',{name:'إغلاق',exact:true}).click();await set('en');await page.getByRole('button',{name:/^sign in$/i}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await screenshot('auth-en')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 expect(errors.filter(error=>/hydration|server rendered|client.*match/i.test(error))).toEqual([])
 expect(providerCalls).toEqual([])
})
