import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { installYouTubeFixture } from './helpers/youtube'

const backend = 'https://localhost:4377'
async function account(context: BrowserContext, kind: 'free' | 'admin' = 'free', expired = false) {
  const id = kind === 'admin' ? '44444444-4444-4444-8444-444444444444' : '11111111-1111-4111-8111-111111111111'
  const exp = Math.floor(Date.now() / 1000) + (expired ? -60 : 3600)
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const user = { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, app_metadata: { provider: 'email' }, user_metadata: {} }
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp, role: 'authenticated' })}.fixture-signature`
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: expired ? `fixture-refresh:${id}` : 'fixture-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}
async function healthy(page: Page) {
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
}
async function featured(page: Page) {
  // React may stage another hidden tree while completing a streamed boundary.
  // Require exactly one visible Featured region throughout that handover.
  await expect(page.locator('[data-featured-carousel]:visible')).toHaveCount(1)
  await expect(page.locator('[data-featured-hero]:visible')).toHaveCount(1)
  await expect(page.locator('[data-featured-carousel]:visible [data-featured-slide]').first()).toBeVisible()
  await expect(page.locator('[data-home-hero], img[src*="/homepage/hero-"]')).toHaveCount(0)
  await expect.poll(() => page.locator('[data-featured-carousel]:visible [data-featured-slide]').first().locator('img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
}
test.beforeEach(async ({ page, request, browserName }) => {
  if (browserName === 'firefox') process.env.PLAYWRIGHT_SKIP_NAVIGATION_CHECK = '1'
  await request.post(`${backend}/fixture/reliability`, { data: { reset: true, publicTranscript: true } })
  await installYouTubeFixture(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

for (const width of [320, 375, 390, 414, 430, 768, 1024, 1440]) test(`Featured, Learn and navigation at ${width}`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 })
  await account(context)
  await page.goto('/'); await featured(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.reload(); await featured(page)
  if (width < 900) await expect(page.getByRole('navigation', { name: 'Quick Actions' })).toBeVisible()
  if (width < 600) await expect(page.getByRole('heading', { name: 'Phrase of the Day', exact: true })).toBeVisible()
  const destination = await page.locator('[data-featured-carousel]:visible [data-featured-slide]').first().getByRole('link', { name: /^View / }).getAttribute('href')
  await page.locator('[data-featured-carousel]:visible [data-featured-slide]').first().getByRole('link', { name: /^View / }).click()
  await expect(page).toHaveURL(destination!); await healthy(page)
  await page.goBack(); await featured(page)
  await page.goForward(); await expect(page).toHaveURL(destination!); await healthy(page)
  await page.goto('/learn')
  await page.locator('main a[href="/grammar"]').first().click()
  await expect(page).toHaveURL('/grammar')
  await expect(page.getByRole('heading', { name: 'Naḥw', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ṣarf', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Grammar in Context', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Word Type', exact: true }).click()
  await expect(page.locator('[data-grammar-question]')).toBeVisible()
  await page.getByRole('link', { name: 'Back to Grammar', exact: true }).click()
  await page.getByRole('button', { name: 'Revise the Ten Forms', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Next Form', exact: true })).toBeVisible()
})

test('public routes, retired links, reader, profile and Admin guards', async ({ page, context }) => {
  await page.goto('/'); await featured(page)
  for (const path of ['/grammar/context', '/grammar/context/A1', '/grammar/context/C2', '/grammar/notes/missing']) {
    await page.goto(path); await expect(page).toHaveURL('/grammar'); await healthy(page)
  }
  for (const path of ['/explore', '/cartoons', '/cartoons/test-show', '/cartoons/test-show/clip-0', '/books', '/books/test-book']) {
    await page.goto(path); await healthy(page)
  }
  await page.goto('/admin/books'); await expect(page).toHaveURL('/')
  await page.goto('/admin/phrases'); await expect(page).toHaveURL('/')
  await account(context)
  await page.goto('/books/test-book/chapter-1'); await expect(page.locator('#reader-content:visible')).toBeVisible()
  await page.goto('/profile'); await expect(page).toHaveURL(/\/profile\//); await healthy(page)
  await page.goto('/books'); await expect(page.getByRole('group', { name: 'Library mode', exact: true })).toBeVisible()
  await page.goto('/cartoons/test-show/clip-0'); await healthy(page)
  await expect(page.getByRole('button', { name: 'Grammar Notes', exact: true })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Grammar Notes', exact: true })).toHaveCount(0)
  await account(context, 'admin')
  await page.goto('/admin/books'); await expect(page.getByRole('button', { name: 'New book', exact: true })).toBeVisible()
  await page.goto('/admin/phrases'); await expect(page.getByRole('heading', { name: /Phrases/ }).first()).toBeVisible()
})

test('standalone-style launch, storage denial, resume, offline and chunk recovery', async ({ page, context, request }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { get: () => true })
    const match = window.matchMedia.bind(window)
    window.matchMedia = query => {
      const result = match(query)
      if (query !== '(display-mode: standalone)') return result
      return new Proxy(result, { get(target, key) {
        if (key === 'matches') return true
        const value = Reflect.get(target, key, target)
        return typeof value === 'function' ? value.bind(target) : value
      } })
    }
    for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get: () => { throw new DOMException('Storage denied', 'SecurityError') } })
  })
  let restoringFromOffline = false
  const errors: string[] = [], offlineErrors: string[] = []
  page.on('pageerror', error => {
    // WebKit can report an interrupted Server Action as an access-control
    // fetch error after reconnection/reload. Allow only this injected window.
    if (restoringFromOffline && error.name.startsWith('Fetch API cannot load') && error.message.includes('127.0.0.1:3077') && error.message.includes('access control')) offlineErrors.push(error.message)
    else errors.push(error.message)
  })
  const manifest = await (await request.get('/site.webmanifest')).json()
  expect(manifest).toMatchObject({ start_url: '/', scope: '/', display: 'standalone' })
  await page.goto(manifest.start_url); await featured(page)
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('link[as="font"]')).toHaveCount(3)
  for (const link of await page.locator('link[as="font"]').all()) {
    await expect(link).toHaveAttribute('type', 'font/woff2')
    await expect(link).toHaveAttribute('crossorigin', /^(anonymous)?$/)
  }
  await page.getByRole('button', { name: 'Open menu', exact: true }).click(); await expect(page.locator('.MuiDrawer-paper')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); document.dispatchEvent(new Event('visibilitychange')) })
  await featured(page)
  restoringFromOffline = true
  await context.setOffline(true); await expect(page.locator('#awm-startup-recovery')).toContainText('offline')
  await context.setOffline(false); await expect(page.locator('#awm-startup-recovery')).toContainText('back online')
  await page.reload(); await featured(page)
  restoringFromOffline = false
  await test.info().attach('injected-offline-fetch-errors', { body: JSON.stringify(offlineErrors), contentType: 'application/json' })
  const recovered = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame() })
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'ChunkLoadError: Loading chunk failed' })))
  await recovered
  await featured(page)
  await page.waitForFunction(() => document.documentElement.dataset.awmHydrated === 'true')
  // A second failure keeps a usable Reload control and cannot auto-loop.
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'ChunkLoadError: Loading chunk failed' })))
  await expect(page.locator('#awm-startup-recovery')).toContainText('update could not load')
  await page.locator('#awm-startup-recovery button').click(); await featured(page)
  await expect(page.locator('#awm-startup-recovery')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('an obsolete first module recovers automatically while retaining the signed-in session', async ({ page, context }) => {
  await account(context)
  let injected = 0
  await page.route('**/_next/static/**/*.js', route => {
    if (!injected && route.request().resourceType() === 'script') {
      injected++
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Obsolete deployment chunk fixture' })
    }
    return route.continue()
  })
  await page.goto('/', { waitUntil: 'commit' })
  try {
    await expect(page.locator('html')).toHaveAttribute('data-awm-hydrated', 'true', { timeout: 25000 })
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({ url: location.href,
      trace: (window as Window & { __awmStartupTrace?: unknown }).__awmStartupTrace,
      recovery: document.querySelector('#awm-startup-recovery')?.textContent,
      scripts: [...document.scripts].map(script => script.src).filter(Boolean),
      resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name, type: (entry as PerformanceResourceTiming).initiatorType })),
    }))
    await test.info().attach('entry-recovery-state', { body: JSON.stringify(diagnostics), contentType: 'application/json' })
    throw error
  }
  await featured(page)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.locator('.MuiDrawer-paper')).toBeVisible()
  expect(injected).toBe(1)
  expect((await context.cookies()).some(cookie => cookie.name === 'sb-localhost-auth-token')).toBe(true)
})

test('expired session refresh and background resume keep Featured public', async ({ page, context }) => {
  await account(context, 'free', true)
  await page.goto('/'); await featured(page)
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible()
  await page.goto('/grammar')
  await expect(page.getByRole('heading', { name: 'Naḥw', exact: true })).toBeVisible()
  await page.goto('/'); await featured(page)
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')) })
  await page.goto('/learn'); await healthy(page)
  await page.goBack(); await featured(page)
  await page.reload(); await featured(page)
  await expect(page.locator('[data-awm-page-error]')).toHaveCount(0)
})

test('slow Spotlight cannot hold Featured or menu hydration', async ({ page, request }) => {
  await request.post(`${backend}/fixture/reliability`, { data: { rules: [{ path: '/rest/v1/rpc/home_for_you_spotlight', delay: 2500, remaining: -1 }] } })
  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.locator('[data-featured-carousel]:visible')).toHaveCount(1, { timeout: 1800 })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.locator('.MuiDrawer-paper')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'For You Spotlight', exact: true })).toBeVisible()
  await featured(page)
  await page.getByRole('heading', { name: 'For You Spotlight', exact: true }).scrollIntoViewIfNeeded()
  await expect(page.locator('[data-spotlight-ready="true"]')).toBeVisible()
  const { hits } = await (await request.post(`${backend}/fixture/reliability`, { data: {} })).json()
  expect(hits.filter((hit: { path: string }) => hit.path === '/rest/v1/rpc/home_for_you_spotlight')).toHaveLength(1)
})

test('a pending Admin role check does not block public Featured or show Admin', async ({ page, context, request }) => {
  await account(context)
  await request.post(`${backend}/fixture/reliability`, { data: { rules: [{ path: '/rest/v1/rpc/account_role', delay: 2500, remaining: -1 }] } })
  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.locator('[data-featured-carousel]:visible')).toHaveCount(1, { timeout: 1800 })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const drawer = page.locator('.MuiDrawer-paper')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await featured(page)
})

test('session verification cannot delay the first public Homepage byte', async ({ page, context, request }) => {
  await account(context)
  await request.post(`${backend}/fixture/reliability`, { data: { rules: [{ path: '/auth/v1/user', delay: 12000, remaining: -1 }] } })
  const started = Date.now()
  await page.goto('/', { waitUntil: 'commit' })
  expect(Date.now() - started).toBeLessThan(2500)
  await featured(page)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.locator('.MuiDrawer-paper')).toBeVisible()
  await expect(page.locator('.MuiDrawer-paper').getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0)
})
