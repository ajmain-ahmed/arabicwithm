import {test,expect} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const width of [320,1440])test(`guest app reminder and full book artwork at ${width}`,async({page,request})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/')
 const card=page.locator('#download-app')
 await expect(card.getByRole('heading',{name:'App Coming Soon',exact:true})).toBeVisible()
 const email=`home-cleanup-${width}@fixture.example`
 for(let attempt=0;attempt<2;attempt++){
  await card.getByRole('textbox',{name:'Email address',exact:true}).fill(attempt===0?`  ${email.toUpperCase()} `:email)
  await card.getByRole('button',{name:'Remind Me',exact:true}).click()
  await expect(card.getByRole('status')).toContainText('You’re on the list')
  if(attempt===0)await page.reload()
 }
 const rows=await(await request.get(`${backend}/rest/v1/email_preferences?email=eq.${email}`)).json()
 expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({purpose:'app_launch',subscribed:true,user_id:null,consent_version:'app-launch-v1'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 const books=page.getByRole('region',{name:'Books',exact:true})
 await books.scrollIntoViewIfNeeded()
 const cover=books.locator('img').first();await expect(cover).toBeVisible()
 expect(await cover.evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain')
 expect(await cover.evaluate(el=>{const box=el.parentElement!.getBoundingClientRect();return Math.abs(box.width/box.height-2/3)<.01})).toBe(true)
 await page.screenshot({path:`docs/validation/home-cleanup/guest-${width}.png`,fullPage:true})
})
