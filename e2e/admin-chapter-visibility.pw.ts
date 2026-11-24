import { test, expect } from '@playwright/test'
for (const role of ['guest', 'free', 'plus', 'editor', 'admin']) test(`${role}: draft reader boundary`, async ({ page, context }) => {
  if (role !== 'guest') {
    const id = role === 'admin' ? '44444444-4444-4444-8444-444444444444' : role === 'editor' ? '33333333-3333-4333-8333-333333333333' : role === 'plus' ? '22222222-2222-4222-8222-222222222222' : '11111111-1111-4111-8111-111111111111'
    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url'), exp = Math.floor(Date.now()/1000)+3600
    const user = { id, role: 'authenticated', aud: 'authenticated', email: `${role}@fixture.example`, user_metadata: {}, app_metadata: {provider:'email'} }
    const access_token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',exp,role:'authenticated'})}.fixture-signature`
    await context.addCookies([{name:'sb-localhost-auth-token',value:`base64-${encode({user,access_token,expires_at:exp,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600})}`,domain:'127.0.0.1',path:'/',sameSite:'Lax'}])
  }
  await page.goto('/books/unreleased-book/hidden-parent')
  if (role !== 'admin') {
    await expect(page).toHaveURL(/\/books\/unreleased-book$/)
    await expect(page.locator('#reader-content:visible')).toHaveCount(0)
    await expect(page.getByText('This book is in progress',{exact:true}).filter({visible:true})).toBeVisible()
    await expect(page.getByText('Draft legacy chapter',{exact:true})).toHaveCount(0)
    if(process.env.AWM_TEST_PUBLIC_VISIBILITY==='1') return
    await page.goto('/books/test-book/draft-structured')
    await expect(page.locator('#reader-content:visible')).toHaveCount(0)
    return
  }
  await expect(page.locator('#reader-content:visible')).toContainText('A book. Paragraph 1.')
  await expect(page.getByRole('navigation',{name:'Admin chapter navigation'})).toContainText('Published chapter in unreleased Book')
  await page.goto('/books/unreleased-book')
  await expect(page.getByRole('heading',{name:'Unreleased Book',exact:true})).toBeVisible()
  await expect(page.getByText('Published chapter in unreleased Book',{exact:true}).filter({visible:true}).first()).toBeVisible()
  await expect(page.getByText('In progress — Admin preview',{exact:true})).toBeVisible()
  await page.getByRole('link').filter({hasText:'Draft legacy chapter'}).click()
  await expect(page.locator('#reader-content:visible')).toContainText('A book. Paragraph 1.')
  await page.reload()
  await expect(page.locator('#reader-content:visible')).toContainText('A book. Paragraph 1.')
  await page.getByRole('link',{name:'Next chapter',exact:true}).click()
  await expect(page.locator('#reader-content:visible')).toContainText('The Government of the Adjective')
  await expect(page.getByRole('navigation',{name:'Admin chapter navigation'})).toContainText('Draft legacy chapter')
  await page.getByRole('link',{name:'Previous chapter',exact:true}).click()
  await expect(page.locator('#reader-content:visible')).toContainText('A book. Paragraph 1.')
  await page.goto('/books/unreleased-book/hidden-structured')
  await expect(page.locator('#reader-content:visible')).toContainText('The Government of the Adjective')
  if(process.env.AWM_TEST_PUBLIC_VISIBILITY==='1') return
  await page.goto('/admin/books/preview/abababab-abab-4bab-8bab-000000000010')
  await expect(page.getByRole('navigation',{name:'All Chapters'})).toContainText('Unpublished structured chapter')
  await page.getByRole('link',{name:'Next chapter',exact:true}).click()
  await expect(page.locator('#reader-content:visible')).toContainText('missing the sections list')
  await page.getByRole('link',{name:'Next chapter',exact:true}).click()
  await expect(page.locator('#reader-content:visible')).toContainText('The Government of the Adjective')
  await page.goto('/books/test-book/draft-structured')
  await expect(page.locator('#reader-content:visible')).toContainText('The Government of the Adjective')
})
