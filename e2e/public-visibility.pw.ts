import { test, expect } from '@playwright/test'
import { installYouTubeFixture } from './helpers/youtube'
for (const role of ['guest', 'free', 'premium', 'admin'])
  for (const width of [320, 390, 430, 768, 1024, 1440]) {
    test(`${role} public content remains visible at ${width}px without chapter publication schema`, async ({
      page,
      context,
      request,
    }) => {
      await request.post('https://localhost:4365/fixture/spotlight', { data: {} })
      if (role !== 'guest') {
        const id =
          role === 'admin'
            ? '44444444-4444-4444-8444-444444444444'
            : role === 'premium'
              ? '22222222-2222-4222-8222-222222222222'
              : '11111111-1111-4111-8111-111111111111'
        const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
        const expires = Math.floor(Date.now() / 1000) + 3600,
          user = {
            id,
            aud: 'authenticated',
            role: 'authenticated',
            email: `${role}@fixture.example`,
            app_metadata: { provider: 'email' },
            user_metadata: {},
          }
        const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
        await context.addCookies([
          {
            name: 'sb-localhost-auth-token',
            value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`,
            domain: '127.0.0.1',
            path: '/',
            sameSite: 'Lax',
          },
        ])
      }
      await installYouTubeFixture(page)
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('/books')
      await expect(page.locator('a[href^="/books/"]').first()).toBeAttached()
      await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
      await page.reload()
      await expect(page.locator('a[href^="/books/"]').first()).toBeAttached()
      await page.goto('/explore')
      await expect(page.locator('#explore-feed section').first()).toBeAttached()
      await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
      await page.goto('/explore?view=foryou')
      await expect(page.locator('[data-for-you-source]').first()).toBeAttached()
      await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    })
  }
