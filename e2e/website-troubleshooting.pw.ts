import { test, expect } from '@playwright/test'

test('Explore fallback autoplays muted when the YouTube API is unavailable', async ({ context, page }) => {
  await context.route('https://www.youtube.com/iframe_api', route => route.abort())
  await context.route('https://www.youtube.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Native player</body></html>' }))
  await page.goto('/explore')
  const player = page.locator('[data-explore-player=active] iframe')
  await expect(player).toHaveAttribute('src', /autoplay=1/)
  await expect(player).toHaveAttribute('src', /mute=1/)
  await expect(player).toHaveAttribute('allow', /autoplay/)
})

test('homepage stays visible while an expired session refresh is delayed', async ({ context, page }) => {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const id = '11111111-1111-4111-8111-111111111111'
  const expires = Math.floor(Date.now() / 1000) - 30
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user: { id, email: 'free@fixture.example', aud: 'authenticated', role: 'authenticated' } })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
  let release!: () => void
  const delay = new Promise<void>(resolve => { release = resolve })
  await context.route('**/auth/v1/token**', async route => { await delay; await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant' }) }) })
  try {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Learn Arabic through cartoons and books' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse Cartoons' })).toBeVisible()
  } finally { release() }
})
