import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
test.beforeEach(async({page})=>{await installYouTubeFixture(page)})


async function signIn(context: BrowserContext, kind: 'free' | 'premium' | 'admin') {
  const id = { free: '11111111-1111-4111-8111-111111111111', premium: '22222222-2222-4222-8222-222222222222', admin: '44444444-4444-4444-8444-444444444444' }[kind]
  const expires = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  const user = { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, app_metadata: { provider: 'email' }, user_metadata: {} }
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`app CTA and dedicated player at ${width}px`, async ({ page, context, request }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    const cta = page.locator('#download-app')
    await cta.scrollIntoViewIfNeeded()
    const badges = await cta.locator('img').evaluateAll(elements => elements.filter((element): element is HTMLImageElement => element instanceof HTMLImageElement && element.src.includes('store-badges')).map(image => ({ width: image.parentElement!.getBoundingClientRect().width, height: image.parentElement!.getBoundingClientRect().height, loaded: image.complete && image.naturalWidth > 0 })))
    expect(badges).toHaveLength(2); expect(badges[0]).toEqual(badges[1]); expect(badges[0].loaded).toBe(true)
    const visualHeights = await cta.locator('img[src*="store-badges"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height * (element.getAttribute('src')!.endsWith('.png') ? 166 / 250 : 1)))
    expect(Math.abs(visualHeights[0] - visualHeights[1])).toBeLessThan(1)
    await expect(cta.getByRole('img',{name:'QR code placeholder'})).toBeVisible()
    await noOverflow(page)
    await cta.screenshot({ path: `test-results/app-cta-${width}.png` })
    await signIn(context, 'premium')
    await request.post('https://localhost:4310/fixture/website-update', { ignoreHTTPSErrors: true })
    await page.goto('/books')
    await expect(page.getByRole('link', { name: 'Test Book cover Test Book' })).toBeVisible()
    await expect(page.getByText('AWM+ Exclusive', { exact: false })).toHaveCount(0)
    await page.screenshot({ path: `test-results/read-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Listen', exact: true }).click()
    await expect(page).toHaveURL(/mode=listen/)
    await page.getByRole('region', { name: 'Audiobook library' }).getByRole('link').click()
    await expect(page).toHaveURL(/\/listen\/test-book$/)
    const player = page.getByRole('region', { name: 'Audiobook player' })
    await expect(player).toBeVisible()
    await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
    const audio = player.locator('audio')
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0)
    await player.getByRole('button', { name: 'Pause Audio', exact: true }).click()
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true)
    await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
    await expect(player.getByRole('slider', { name: 'Audiobook position' })).toBeEnabled()
    await player.getByRole('slider', { name: 'Audiobook position' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(1)
    const arabicElement = await audio.elementHandle()
    await player.getByLabel('Audio language').click()
    await page.getByRole('option', { name: 'English', exact: true }).click()
    await expect(audio).toHaveCount(0)
    expect(await arabicElement!.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true)
    await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
    await expect(audio).toHaveAttribute('src', /\/en\//)
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false)
    const englishElement = await audio.elementHandle()
    await player.getByLabel('Audio language').click()
    await page.getByRole('option', { name: 'Arabic', exact: true }).click()
    await expect(audio).toHaveCount(0)
    expect(await englishElement!.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true)
    await player.getByLabel('Audio language').click()
    await page.getByRole('option', { name: 'English', exact: true }).click()
    await player.getByRole('button', { name: 'Next chapter' }).click()
    await expect(player.getByText('Chapter 6 · Sixth Chapter')).toBeVisible()
    await expect(audio).toHaveCount(0)
    await expect(player.getByRole('button', { name: 'Next chapter' })).toBeDisabled()
    await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false)
    await player.getByRole('button', { name: 'Previous chapter' }).click()
    await expect(player.getByRole('link', { name: 'Read This Chapter' })).toHaveAttribute('href', '/books/test-book/chapter-1?lang=en')
    await noOverflow(page)
    await page.screenshot({ path: `test-results/listen-${width}.png`, fullPage: true })
    await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false)
    const departingAudio = await audio.elementHandle()
    await player.getByRole('link', { name: 'Read This Chapter' }).click()
    await expect(page).toHaveURL(/test-book\/chapter-1\?lang=en/)
    await expect(page.locator('audio')).toHaveCount(0)
    expect(await departingAudio!.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true)
  })
}

test('restored app section has QR/store controls without email signup for guests and accounts',async({page,context})=>{
 await page.goto('/')
 const cta=page.locator('#download-app')
 await expect(cta.getByLabel('Email address')).toHaveCount(0)
 await expect(cta.getByRole('img',{name:'QR code placeholder'})).toBeVisible()
 await signIn(context,'free');await page.reload()
 await expect(cta.getByLabel('Email address')).toHaveCount(0)
 await expect(cta.getByRole('img',{name:'QR code placeholder'})).toBeVisible()
})

test('free account is gated by the existing Premium prompt in Listen', async ({ page, context }) => {
  await signIn(context, 'free'); await page.goto('/books?mode=listen')
  await page.getByRole('region', { name: 'Audiobook library' }).getByRole('link').click()
  await page.getByRole('button', { name: 'Play Audio', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(0)
})

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`For You preserves glosses and display settings without word hover at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/explore')
    await page.getByRole('button', { name: 'For You feed', exact: true }).click()
    const arabic = page.locator('[lang="ar"]').first()
    await expect(arabic).toHaveText('\u0643\u0650\u062a\u064e\u0627\u0628\u064c')
    await arabic.hover()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('switch', { name: 'Tashk\u012bl' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(arabic).toHaveText('\u0643\u062a\u0627\u0628')
    await expect(page.getByText('book', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('switch', { name: 'Tashk\u012bl' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(arabic).toHaveText('\u0643\u0650\u062a\u064e\u0627\u0628\u064c')
    await noOverflow(page)
    await page.screenshot({ path: `test-results/for-you-${width}.png`, fullPage: true })
  })
}
