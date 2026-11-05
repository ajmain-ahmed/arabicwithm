import {test,expect} from '@playwright/test'
const backend=`https://localhost:${process.env.AWM_TEST_BACKEND_PORT??4310}`
for(const confirmationRequired of [true,false])test(`registration hand-off with confirmation ${confirmationRequired}`,async({page,context,request})=>{
 await request.post(`${backend}/fixture/registration`,{data:{confirmationRequired,profileDelay:1200}})
 await page.setViewportSize({width:390,height:950});await page.goto('/profile')
 await page.getByRole('main').getByRole('button',{name:'Sign in',exact:true}).click()
 let dialog=page.getByRole('dialog').filter({has:page.getByRole('button',{name:'Register',exact:true})})
 await dialog.getByRole('button',{name:'Register',exact:true}).click()
 const email=`session-${confirmationRequired}-${Date.now()}@fixture.example`,password='fixture-password-123'
 await dialog.getByRole('textbox',{name:'Email address',exact:true}).fill(email)
 await dialog.getByLabel('Password',{exact:true}).fill(password)
 await dialog.getByRole('button',{name:'Create Account',exact:true}).click()
 if(confirmationRequired){
  await expect(page.getByText('Check your inbox — verify your email before signing in.')).toBeVisible()
  expect((await context.cookies()).some(c=>c.name.startsWith('sb-localhost-auth-token'))).toBe(false)
  await request.post(`${backend}/fixture/registration`,{data:{confirmEmail:email}})
  dialog=page.getByRole('dialog').filter({has:page.getByRole('button',{name:'Register',exact:true})})
  await dialog.getByRole('textbox',{name:'Email address',exact:true}).fill(email)
  await dialog.getByLabel('Password',{exact:true}).fill(password)
  await dialog.getByRole('button',{name:'Sign In',exact:true}).last().click()
 }
 await expect(page).toHaveURL(/\/profile\/[a-f0-9-]{36}$/)
 await expect(page.getByRole('button',{name:'Edit',exact:true})).toBeVisible()
 expect((await context.cookies()).some(c=>c.name.startsWith('sb-localhost-auth-token'))).toBe(true)
 await page.reload();await expect(page.getByRole('button',{name:'Edit',exact:true})).toBeVisible()
 await page.goto('/profile');await expect(page).toHaveURL(/\/profile\/[a-f0-9-]{36}$/)
 await request.post(`${backend}/fixture/registration`,{data:{profileDelay:0}})
})
