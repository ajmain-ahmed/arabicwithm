import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const backend = `https://localhost:${process.env.AWM_TEST_BACKEND_PORT ?? 4310}`
async function admin(context: BrowserContext) {
  const id = '44444444-4444-4444-8444-444444444444', expires = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'admin@fixture.example', app_metadata: { provider: 'email' }, user_metadata: {} }
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}
async function edit(page: Page, number = 1) {
  await page.goto('/admin/books')
  await page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Test Book', exact: true }) }).getByRole('button').first().click()
  await page.getByRole('row', { name: number === 1 ? '1 First Chapter chapter-1' : '6 Sixth Chapter chapter-6', exact: true }).getByRole('button').click()
  await page.getByRole('tab', { name: 'Audiobook', exact: true }).click()
}
async function save(page: Page, language: 'Arabic' | 'English', published = true) {
  await page.getByLabel(`Publish ${language} audio for AWM+ listeners`).setChecked(published)
  await page.getByLabel(`${language} Audio path or URL`).fill(`audiobooks/fixture/${language === 'Arabic' ? 'ar' : 'en'}/chapter.wav`)
  await page.getByRole('button', { name: `Save ${language} audio`, exact: true }).click()
  await expect(page.locator('fieldset').filter({ has: page.getByText(`${language} Audiobook`, { exact: true }) }).getByRole('status')).toHaveText('Audio saved')
}
async function refreshUntil(page: Page, assertion: () => Promise<void>) {
  const focus = () => page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await focus()
  const timer = setInterval(() => { void focus().catch(() => {}) }, 1000)
  try { await expect(assertion).toPass({ timeout: 25_000 }) }
  finally { clearInterval(timer) }
}

for (const width of [320, 768, 1440]) test(`Admin audio updates an open Listen catalogue and player at ${width}`, async ({ page, context, request }) => {
  test.setTimeout(150_000)
  await request.post(`${backend}/fixture/listen-discovery`)
  await admin(context)
  await page.setViewportSize({ width, height: 1000 })
  const editor = await context.newPage()
  // Establish the unpublished starting state through Admin too: fixture resets
  // deliberately do not reach into Next's shared production cache.
  await edit(editor); await save(editor, 'Arabic', false)
  // Warm the empty catalogue in the running build before Admin adds audio.
  await page.goto('/books')
  const canonicalCover = await page.locator('[data-all-books-row] img[alt="Test Book cover"], section[aria-label="All Books"] img[alt="Test Book cover"]').first().getAttribute('src')
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await expect(page).toHaveURL(/mode=listen/)
  const catalogue = page.getByRole('region', { name: 'Audiobook library' })
  await expect(catalogue).toBeVisible()
  await expect(catalogue.getByRole('link')).toHaveCount(0)
  await page.evaluate(() => Object.assign(window, { __listenDocument: 'unchanged' }))
  await save(editor, 'Arabic')
  await page.bringToFront()
  await refreshUntil(page, () => expect(catalogue.getByRole('link', { name: 'Test Book cover Test Book' })).toBeVisible())
  expect(await page.evaluate(() => (window as unknown as { __listenDocument: string }).__listenDocument)).toBe('unchanged')
  const image = catalogue.getByRole('img', { name: 'Test Book cover' })
  expect(await image.getAttribute('src')).toBe(canonicalCover)
  expect(await image.evaluate(el => getComputedStyle(el).objectFit)).toBe('contain')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/listen-discovery-${width}.png`, fullPage: true })
  await catalogue.getByRole('link').click()
  const player = page.getByRole('region', { name: 'Audiobook player' })
  await expect(player.getByLabel('Audio language', { exact: true })).toHaveText('Arabic')
  await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
  await expect.poll(() => player.locator('audio').evaluate((el: HTMLAudioElement) => !el.paused && el.currentTime > 0)).toBe(true)

  // Later chapter contains English only. Refresh reveals just its valid pair.
  await edit(editor, 6); await save(editor, 'English'); await page.bringToFront()
  await refreshUntil(page, async () => {
    await player.getByLabel('Audio language', { exact: true }).click()
    await expect(page.getByRole('option', { name: 'English', exact: true })).toBeVisible()
  })
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(player).toContainText('Sixth Chapter')
  await player.getByLabel('Chapter', { exact: true }).click()
  await expect(page.getByRole('option')).toHaveCount(1)
  await expect(page.getByRole('option')).toHaveText('6. Sixth Chapter')
  await page.keyboard.press('Escape')

  // Unpublish Arabic; the remaining English chapter keeps the book available.
  await edit(editor); await save(editor, 'Arabic', false); await page.bringToFront()
  await refreshUntil(page, async () => {
    await player.getByLabel('Audio language', { exact: true }).click()
    await expect(page.getByRole('option')).toHaveCount(1)
    await expect(page.getByRole('option')).toHaveText('English')
  })
  await page.keyboard.press('Escape')
  await page.goto('/books?mode=listen')
  await expect(catalogue.getByRole('link')).toHaveCount(1)
  // Removing the last published source must immediately expire warm caches.
  await edit(editor, 6)
  editor.once('dialog', dialog => dialog.accept())
  await editor.getByRole('button', { name: 'Remove English audiobook' }).click()
  await expect(editor.getByRole('button', { name: 'Remove English audiobook' })).toHaveCount(0)
  await page.bringToFront()
  await refreshUntil(page, () => expect(catalogue.getByRole('link')).toHaveCount(0))
  // English-only first source is also discoverable in the same running build.
  await edit(editor); await save(editor, 'English'); await page.bringToFront()
  await refreshUntil(page, () => expect(catalogue.getByRole('link')).toHaveCount(1))
  await catalogue.getByRole('link').click()
  await expect(player.getByLabel('Audio language', { exact: true })).toHaveText('English')
  await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
  await expect.poll(() => player.locator('audio').evaluate((el: HTMLAudioElement) => !el.paused && el.currentTime > 0)).toBe(true)
  await page.goto('/books?mode=listen')
  editor.once('dialog', dialog => dialog.accept())
  await editor.getByRole('button', { name: 'Remove English audiobook' }).click()
  await expect(editor.getByRole('button', { name: 'Remove English audiobook' })).toHaveCount(0)
  await page.bringToFront()
  await refreshUntil(page, () => expect(catalogue.getByRole('link')).toHaveCount(0))
  await page.goto('/listen/test-book')
  await expect(player).toHaveCount(0)
  await editor.close()
})
