import { test, expect, type BrowserContext } from '@playwright/test'
async function signIn(context: BrowserContext, id: string) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url'), expires = Math.floor(Date.now()/1000)+3600
  const user = { id, aud:'authenticated',role:'authenticated',email:'learner@fixture.example',app_metadata:{provider:'email'},user_metadata:{} }
  const access_token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
  await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
}
for (const [index, width] of [320,375,390,414,430,768,1024,1440].entries()) test(`Profile and immediate Learn at ${width}px`, async ({ page, context }, info) => {
  const id = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444'][index % 3]
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url'), expires = Math.floor(Date.now()/1000)+3600
  const user = { id, aud:'authenticated',role:'authenticated',email:'learner@fixture.example',app_metadata:{provider:'email'},user_metadata:{} }
  const access_token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp:expires,role:'authenticated'})}.fixture-signature`
  await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({access_token,refresh_token:'fixture-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
  await page.setViewportSize({width,height:1000})
  await page.goto('/profile')
  await expect(page.getByText('Your Account',{exact:true}).filter({visible:true})).toBeVisible()
  await page.reload()
  await expect(page.getByText('Your Account',{exact:true}).filter({visible:true})).toBeVisible()
  await page.goto('/books')
  await page.goBack()
  await expect(page.getByText('Your Account',{exact:true}).filter({visible:true})).toBeVisible()
  await page.getByRole('button',{name:'Settings',exact:true}).click()
  await expect(page).toHaveURL(/tab=settings/)
  await expect(page.getByText('Send Reset Link',{exact:true})).toBeVisible()
  await page.goBack()
  await expect(page.getByText('Your Account',{exact:true}).filter({visible:true})).toBeVisible()
  await page.goto('/learn')
  const puzzle = page.getByRole('region',{name:'Word Search activity'})
  const grammar = page.getByRole('region',{name:'Grammar activity'})
  const memory = page.getByRole('region',{name:'Memory activity'})
  await expect(puzzle.getByRole('grid')).toBeVisible()
  await expect(grammar.locator('[data-grammar-question]')).toBeVisible()
  const before = await grammar.locator('[data-grammar-question]').getAttribute('data-grammar-question')
  if (id.startsWith('11111111')) {
    await expect(memory.getByRole('button',{name:/Reveal/i}).or(memory.getByText(/used today.s free Memory session/)).first()).toBeVisible()
  } else {
    await expect(memory.getByRole('button',{name:/Reveal/i}).first()).toBeVisible()
    await memory.getByRole('button',{name:/Reveal/i}).first().click()
  }
  await page.setViewportSize({width:width===390?414:width,height:900})
  await expect(grammar.locator('[data-grammar-question]')).toHaveAttribute('data-grammar-question',before!)
  if(width<900) expect((await grammar.boundingBox())!.y).toBeGreaterThan((await puzzle.boundingBox())!.y)
  if(width>=1200) expect(Math.abs((await grammar.boundingBox())!.y-(await puzzle.boundingBox())!.y)).toBeLessThan(2)
  await expect(page.getByRole('link',{name:'Explore Naḥw'})).toBeVisible()
  await expect(page.getByRole('link',{name:'Explore Ṣarf'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({path:`test-results/learn-${info.project.name}-${width}.png`,fullPage:true})
})
test('Profile avatar entry and optional statistics outage', async ({ page, context }) => {
  await signIn(context, '44444444-4444-4444-8444-444444444444')
  await page.setViewportSize({ width: 390, height: 1000 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByText('My Profile', { exact: true }).filter({visible:true}).click()
  await expect(page.getByText('Your Account', { exact: true }).filter({visible:true})).toBeVisible()
  await page.request.post('https://localhost:4361/fixture/reliability', { data: { rules: [{ path: '/rest/v1/rpc/website_learning_history', status: 503, remaining: -1 }] } })
  try {
    await page.reload()
    await expect(page.getByText('Your Account', { exact: true }).filter({visible:true})).toBeVisible()
    await expect(page.getByText(/Learning statistics is temporarily unavailable/)).toBeVisible()
  } finally { await page.request.post('https://localhost:4361/fixture/reliability', { data: { reset: true } }) }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Open user menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'My Profile', exact: true }).click()
  await expect(page.getByText('Your Account', { exact: true }).filter({visible:true})).toBeVisible()
})
