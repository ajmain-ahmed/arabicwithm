import { test, expect } from '@playwright/test'
import { installYouTubeFixture } from './helpers/youtube'

// Run with AWM_FEATURED_CAROUSEL_FIXTURE=1 on a fresh fixture cache.
for (const width of [390, 1440]) test(`curated artwork, crop and hidden slides at ${width}`, async ({ page, context, browserName }) => {
  if (browserName === 'firefox') process.env.PLAYWRIGHT_SKIP_NAVIGATION_CHECK = '1'
  await installYouTubeFixture(page)
  await page.setViewportSize({ width, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const carousel = page.locator('[data-featured-carousel]:visible')
  await expect(carousel).toHaveCount(1)
  await expect(page.locator('[data-featured-shell]:visible, [data-home-hero]')).toHaveCount(0)
  const slides = carousel.locator('[data-featured-slide]')
  await expect(slides).toHaveCount(3)
  await expect(carousel.locator('img')).toHaveCount(1)
  const slug = (await slides.first().getAttribute('data-featured-slide'))!
  const number = Number(slug.at(-1))
  const image = slides.first().locator('img')
  await expect(image).toHaveCSS('object-position', `${20 + number * 10}% ${30 + number * 10}%`)
  await expect(image).toHaveAttribute('fetchpriority', 'high')
  await expect(image).toHaveAttribute('srcset', /828w.*1600w/)
  const selection = await slides.evaluateAll(elements => elements.map(element => element.getAttribute('data-featured-slide')))
  await carousel.getByRole('button', { name: /^Show Featured / }).nth(1).click()
  await expect(slides.nth(1)).toHaveAttribute('aria-hidden', 'false')
  await expect(carousel.locator('img')).toHaveCount(1)
  await expect(slides.nth(1).locator('img')).toHaveAttribute('fetchpriority', 'low')
  await page.reload()
  await expect(carousel).toHaveCount(1)
  expect(await slides.evaluateAll(elements => elements.map(element => element.getAttribute('data-featured-slide')))).toEqual(selection)
  await slides.first().getByRole('link', { name: /^View / }).click()
  await expect(page).toHaveURL(`/cartoons/${slug}`)
  await page.goBack(); await expect(carousel).toHaveCount(1)
  await page.goForward(); await expect(page).toHaveURL(`/cartoons/${slug}`)
  // A cookie/session change must not select another hero implementation.
  const id = '11111111-1111-4111-8111-111111111111', exp = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'free@fixture.example', app_metadata: { provider: 'email' }, user_metadata: {} }
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp, role: 'authenticated' })}.fixture-signature`
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: exp, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
  await page.goto('/'); await expect(carousel).toHaveCount(1)
  expect(await slides.evaluateAll(elements => elements.map(element => element.getAttribute('data-featured-slide')))).toEqual(selection)
  await context.clearCookies()
  await page.goto('/'); await expect(carousel).toHaveCount(1)
  await expect(page.locator('[data-featured-shell]:visible, [data-home-hero]')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-awm-hydrated', 'true')
  await page.evaluate(() => document.fonts.ready)
  if (width === 390) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await expect(page.locator('.MuiDrawer-paper')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.MuiDrawer-paper')).toHaveCount(0)
    await page.screenshot({ path: `docs/validation/home-startup/curated-${test.info().project.name}.png` })
  }
})
