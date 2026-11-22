import { test, expect, type BrowserContext, type Page } from '@playwright/test'

async function signIn(context: BrowserContext) {
  const id = '22222222-2222-4222-8222-222222222222'
  const expires = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'audio@fixture.example', app_metadata: { provider: 'email' }, user_metadata: {} }
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}

async function openAndPlay(page: Page) {
  await page.goto('/books/test-book/chapter-1?lang=ar')
  await page.getByRole('button', { name: 'Audio', exact: true }).click()
  await page.getByRole('button', { name: 'Play audio', exact: true }).click()
  const audio = page.locator('audio')
  await expect(audio).toHaveCount(1)
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.readyState >= 2 && !element.paused)).toBe(true)
  await page.getByRole('button', { name: 'Pause audio', exact: true }).click()
  return audio
}

test('timed playback restores, follows, and seeks the reader', async ({ page, context }) => {
  await signIn(context)
  const audio = await openAndPlay(page)
  expect(await audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThanOrEqual(25)
  await expect(page.getByRole('navigation', { name: 'Chapter pages', exact: true }).getByText('Page 2 of 3', { exact: true })).toBeVisible()
  await expect(page.locator('#sentence-12')).toContainText('0:24')
  await expect(page.locator('#sentence-12')).toHaveCSS('background-color', 'rgba(184, 134, 11, 0.12)')
  await expect(page.locator('#sentence-12')).toHaveCSS('border-left-color', 'rgb(225, 185, 87)')
  expect(await page.locator('.MuiSlider-markLabel').allTextContents()).toEqual(['P1', 'P2', 'P3'])
  await expect(page.locator('#reader-audio-panel')).toHaveCSS('border-top-width', '0px')
  const controlBoxes = await Promise.all([
    page.getByRole('button', { name: 'Play audio', exact: true }),
  ].map(async control => await control.boundingBox()))
  expect(controlBoxes.every(box => box?.width === 32 && box.height === 32)).toBe(true)
  expect(Math.max(...controlBoxes.map(box => box!.y)) - Math.min(...controlBoxes.map(box => box!.y))).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Audiobook playback speed', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('button', { name: 'Choose audiobook page', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Page 3', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Next Page', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Chapter pages', exact: true }).getByText('Page 3 of 3', { exact: true })).toBeVisible()
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeCloseTo(48, 0)
  await expect(page.locator('#sentence-24')).toHaveCSS('background-color', 'rgba(184, 134, 11, 0.12)')

  await page.getByRole('button', { name: 'Previous Page', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Chapter pages', exact: true }).getByText('Page 2 of 3', { exact: true })).toBeVisible()
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeCloseTo(24, 0)

  await audio.evaluate((element: HTMLAudioElement) => { element.currentTime = 55; element.dispatchEvent(new Event('timeupdate')) })
  await expect(page.getByRole('navigation', { name: 'Chapter pages', exact: true }).getByText('Page 3 of 3', { exact: true })).toBeVisible()
  await expect(page.locator('#sentence-27')).toHaveCSS('background-color', 'rgba(184, 134, 11, 0.12)')

  await page.getByRole('button', { name: 'Previous Page', exact: true }).click()
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeCloseTo(24, 0)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.getByRole('button', { name: 'Choose audiobook page', exact: true })).toBeHidden()
  await expect(page.locator('#reader-audio-panel')).toHaveCSS('border-top-width', '0px')
  await expect(page.locator('.MuiSlider-markLabel').first()).toBeVisible()
})


test('English text keeps the available Arabic audio control and timestamps', async ({ page, context }) => {
  await signIn(context)
  await page.goto('/books/test-book/chapter-1?lang=en')
  await expect(page.getByRole('button', { name: 'Audio', exact: true })).toBeVisible()
  await expect(page.locator('#sentence-0')).toContainText('0:00')
  await page.getByRole('button', { name: 'Audio', exact: true }).click()
  await page.getByRole('button', { name: 'Play audio', exact: true }).click()
  const audio = page.locator('audio')
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.readyState >= 2 && !element.paused)).toBe(true)
  expect(await audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0)
})


test('the compact page selector seeks to the selected page', async ({ page, context }) => {
  await signIn(context)
  await page.goto('/books/test-book/chapter-1?lang=ar')
  await page.getByRole('button', { name: 'Audio', exact: true }).click()
  await page.getByRole('button', { name: 'Play audio', exact: true }).click()
  const audio = page.locator('audio')
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.readyState >= 2)).toBe(true)
  await page.getByRole('button', { name: 'Pause audio', exact: true }).click()
  await page.getByRole('button', { name: 'Choose audiobook page', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Page 3', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Chapter pages', exact: true }).getByText('Page 3 of 3', { exact: true })).toBeVisible()
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeCloseTo(48, 0)
})
