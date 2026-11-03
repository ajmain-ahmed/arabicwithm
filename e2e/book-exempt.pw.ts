import { test, expect, type BrowserContext, type Page, type APIRequestContext, type Browser } from '@playwright/test'
const backend = `https://localhost:${process.env.AWM_TEST_BACKEND_PORT ?? 4310}`
const baseURL = `http://127.0.0.1:${process.env.AWM_TEST_WEB_PORT ?? 3000}`
const targets = [['bos3', 'Bolder Deeds'], ['bos1', 'Lord of The Boy'], ['bos2', 'The Fragrant Scent'], ['bpd', 'Between People & Days']]
test.use({ actionTimeout: 15_000 })
async function login(context: BrowserContext, kind: 'free' | 'premium' | 'admin') {
  const id = { free: '11111111-1111-4111-8111-111111111111', premium: '22222222-2222-4222-8222-222222222222', admin: '44444444-4444-4444-8444-444444444444' }[kind]
  const expires = Math.floor(Date.now() / 1000) + 3600, encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const metadata = kind === 'free' ? { my_list_books: targets.map(([slug]) => slug), book_progress: { bos1: { chapterSlug: 'chapter-99', page: 3, totalPages: 10, language: 'ar', updatedAt: '2026-11-03T12:00:00Z' } } } : {}
  const user = { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, app_metadata: { provider: 'email' }, user_metadata: metadata }
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}
async function seed(editor: Page, context: BrowserContext, request: APIRequestContext) {
  await request.post(`${backend}/fixture/book-exempt`, { data: { reset: true, seed: true } })
  await login(context, 'admin'); await editor.goto('/admin/books')
  await editor.getByRole('row').filter({ has: editor.getByRole('cell', { name: 'Bolder Deeds', exact: true }) }).getByRole('button').last().click()
  await editor.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click()
  await expect(editor.getByRole('dialog')).toHaveCount(0)
}
const newContext = (browser: Browser) => browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 1000 } })
async function play(page: Page) {
  const player = page.getByRole('region', { name: 'Audiobook player' })
  await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
  const audio = player.locator('audio')
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => !el.paused && el.currentTime > 0)).toBe(true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  return audio
}

test('all four exempt books allow free-account reading, PDF and both narration languages; progress resumes', async ({ page: editor, context, browser, request }) => {
  test.setTimeout(150_000)
  await seed(editor, context, request)
  const free = await newContext(browser); await login(free, 'free'); const page = await free.newPage()
  try {
    for (const [slug, title] of targets) {
      await page.goto(`/books/${slug}`)
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible()
      await expect(page.getByText('Late Chapter', { exact: true }).filter({ visible: true })).toBeVisible()
      await page.getByRole('button', { name: 'PDF', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Download PDF' }).getByRole('button', { name: 'Arabic PDF' })).toBeVisible()
      await expect(page.getByRole('dialog', { name: 'Download PDF' }).getByRole('button', { name: 'English PDF' })).toBeVisible()
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
      for (const language of ['ar', 'en']) {
        await page.goto(`/books/${slug}/chapter-99?lang=${language}${slug==='bos1'?'&page=3':''}`)
        await expect(page.locator('#reader-content:visible')).toBeVisible()
        await expect(page.getByRole('dialog')).toHaveCount(0)
      }
      await page.goto(`/listen/${slug}`)
      const arabic = await play(page)
      if (slug === 'bos1') {
        await arabic.evaluate((el: HTMLAudioElement) => { el.currentTime = 28; el.dispatchEvent(new Event('timeupdate')) })
        await page.goto('/books')
        await expect.poll(async () => {
          const state = await (await request.get(`${backend}/fixture/book-exempt`)).json()
          return state.positions.some((row: { language: string; position_seconds: number }) => row.language === 'ar' && row.position_seconds >= 27)
        }).toBe(true)
        await page.goto(`/listen/${slug}`)
        const resumed = await play(page)
        await expect.poll(() => resumed.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(27)
      }
      await page.getByLabel('Audio language', { exact: true }).click()
      await page.getByRole('option', { name: 'English', exact: true }).click()
      const english = await play(page)
      await expect(english).toHaveAttribute('src', /\/en\/chapter.wav/)
    }
    await page.goto('/')
    await expect(page.locator('a[href="/books/bos1"]').first()).toBeVisible()
    await expect(page.locator('a[href^="/books/bos1/chapter-99"]').first()).toBeVisible()
  } finally { await free.close(); await request.post(`${backend}/fixture/book-exempt`, { data: { reset: true } }) }
})

test('guests receive sign-in for direct chapter/audio routes and no prose or PDF', async ({ page: editor, context, browser, request }) => {
  await seed(editor, context, request)
  const guest = await newContext(browser), page = await guest.newPage()
  try {
    await page.goto('/books/bos1')
    await page.getByRole('link', { name: 'Arabic', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.goto('/books/bos1/chapter-99')
    await expect(page.getByRole('button', { name: 'Sign in', exact: true }).filter({ hasText: 'Sign in' })).toBeVisible()
    await expect(page.locator('#reader-content')).toHaveCount(0)
    await page.goto('/listen/bos1')
    await expect(page.getByText('Sign in to listen to this book', { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Audiobook player' })).toHaveCount(0)
    expect((await guest.request.get('/api/books/bos1/download?lang=ar')).status()).toBe(401)
    const raw = await request.get(`${backend}/rest/v1/chapters`, { headers: { apikey: 'fixture-public-key' } })
    expect(await raw.json()).toEqual([])
  } finally { await guest.close(); await request.post(`${backend}/fixture/book-exempt`, { data: { reset: true } }) }
})

test('existing exemptions and Plus remain valid; normal audio stays paid until its database flag changes', async ({ page: editor, context, browser, request }) => {
  test.setTimeout(90_000)
  await seed(editor, context, request)
  const free = await newContext(browser), paid = await newContext(browser)
  await login(free, 'free'); await login(paid, 'premium')
  const page = await free.newPage(), plus = await paid.newPage()
  try {
    await page.goto('/listen/layout-book-1'); await play(page)
    expect((await free.request.get('/api/books/layout-book-1/download?lang=ar')).status()).toBe(200)
    expect((await free.request.get('/api/books/test-book/download?lang=ar')).status()).toBe(403)
    await page.goto('/listen/test-book')
    await page.getByRole('button', { name: 'Play Audio', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('audio')).toHaveCount(0)
    await plus.goto('/listen/test-book'); await play(plus)
    expect((await paid.request.get('/api/books/test-book/download?lang=ar')).status()).toBe(200)
    await request.post(`${backend}/fixture/book-exempt`, { data: { normalExempt: true } })
    expect((await free.request.get('/api/books/test-book/download?lang=ar')).status()).toBe(200)
    await page.goto('/listen/test-book'); await play(page)
  } finally { await free.close(); await paid.close(); await request.post(`${backend}/fixture/book-exempt`, { data: { reset: true } }) }
})
