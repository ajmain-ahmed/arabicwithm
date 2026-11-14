import { test, expect } from '@playwright/test'

for (const width of [320, 390, 430, 1440]) {
  test(`authored case in reader word details at ${width}px`, async ({ page, context }) => {
    const id = '44444444-4444-4444-8444-444444444444'
    const expires = Math.floor(Date.now() / 1000) + 3600
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const user = { id, aud: 'authenticated', role: 'authenticated', email: 'premium@fixture.example', app_metadata: { provider: 'email' }, user_metadata: {} }
    const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
    await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/books/test-book/chapter-1')
    const word = page.locator('#reader-content').getByText('?????????', { exact: true }).first()
    await expect(word).toBeVisible()
    if (width < 600) await word.click()
    else await word.hover()
    const details = page.getByLabel('Grammatical case', { exact: true })
    await expect(details).toBeVisible()
    await expect(details.locator('[dir="rtl"]')).toHaveText('?????????')
    await expect(details.locator('[dir="ltr"]')).toHaveText('Nominative')
    const bounds = await details.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
