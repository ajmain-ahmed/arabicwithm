import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const ids = {
  free: '11111111-1111-4111-8111-111111111111',
  premium: '22222222-2222-4222-8222-222222222222',
  reviewer: '33333333-3333-4333-8333-333333333333',
  admin: '44444444-4444-4444-8444-444444444444',
}
type Account = keyof typeof ids
const chapter = '/books/test-book/chapter-1'
const ordinaryItems = ['My Profile', 'Home', 'Explore', 'Watch', 'Read', 'Memory', 'Give Feedback', 'Support Us']

async function session(context: BrowserContext, kind: Account) {
  const id = ids[kind], expires = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, iat: expires - 3600, role: 'authenticated' })}.fixture-signature`
  const user = { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, created_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: `${kind} learner` } }
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expires, user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}

// Controlled IFrame API contract; no production hooks or auth bypasses.
// Live YouTube embedding is checked separately from these deterministic cases.
async function youtube(context: BrowserContext, blocked = false) {
  await context.addInitScript(({ blocked }) => {
    const state = { players: [] as Array<{ id: string; muted: boolean; playing: boolean; destroyed: boolean }>, calls: [] as Array<{ id: string; muted: boolean }>, blockNext: blocked }
    Object.assign(window, { __ytFixture: state })
    class Player {
      info: typeof state.players[number]
      events: Record<string, (event?: { data: number }) => void>
      iframe: HTMLIFrameElement
      constructor(element: HTMLElement, options: { videoId: string; events: Player['events'] }) {
        this.info = { id: options.videoId, muted: false, playing: false, destroyed: false }
        this.events = options.events
        this.iframe = document.createElement('iframe'); this.iframe.title = 'YouTube video player'; this.iframe.src = `https://www.youtube.com/embed/${options.videoId}`; this.iframe.style.cssText = 'width:100%;height:100%;border:0'; element.replaceWith(this.iframe)
        state.players.push(this.info); setTimeout(() => this.events.onReady(), 0)
      }
      getCurrentTime() { return 0 }
      seekTo() {}
      playVideo() {
        state.calls.push({ id: this.info.id, muted: this.info.muted })
        if (state.blockNext && !this.info.muted) { state.blockNext = false; this.events.onAutoplayBlocked(); return }
        this.info.playing = true; this.events.onStateChange({ data: 1 })
      }
      pauseVideo() { this.info.playing = false; this.events.onStateChange({ data: 2 }) }
      mute() { this.info.muted = true; this.events.onVolumeChange() }
      unMute() { this.info.muted = false; this.events.onVolumeChange() }
      isMuted() { return this.info.muted }
      getVolume() { return 100 }
      setVolume() {}
      destroy() { this.info.destroyed = true; this.info.playing = false; this.iframe.remove() }
    }
    Object.assign(window, { YT: { Player, PlayerState: { PLAYING: 1, ENDED: 0 } } })
  }, { blocked })
  await context.route('https://www.youtube.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="background:#18251c;color:white">Video fixture</body></html>' }))
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
}

test.beforeEach(async ({ context, page }) => {
  await youtube(context)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text()) })
  // Check uncaught exceptions on every route and interaction in each case.
  Object.assign(page, { regressionErrors: errors })
})
test.afterEach(async ({ page }) => {
  expect((page as Page & { regressionErrors: string[] }).regressionErrors).toEqual([])
})

for (const kind of ['free', 'premium', 'reviewer', 'admin'] as const) {
  test(`${kind}: mobile menu, canonical Profile, refresh and history`, async ({ context, page }) => {
    await session(context, kind)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/books')
    await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible()
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Site navigation', exact: true })
    await expect(drawer).toBeVisible()
    const expected = kind === 'reviewer' ? ['My Profile', 'Reviewer', ...ordinaryItems.slice(1)] : kind === 'admin' ? ['My Profile', 'Admin', 'Reviewer', ...ordinaryItems.slice(1)] : ordinaryItems
    await expect(drawer.locator('.MuiListItemButton-root')).toHaveText(expected)
    await expect(drawer).not.toContainText(/Contact|Checking permissions|Access denied|Unable to verify/)
    await drawer.getByText('My Profile', { exact: true }).click()
    await expect(page).toHaveURL(`/profile/${ids[kind]}`)
    await expect(page.getByRole('heading', { name: `${kind} learner`, exact: true })).toBeVisible()
    await expect(page.getByText('My learning profile', { exact: true })).toBeVisible()
    await noOverflow(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: `${kind} learner`, exact: true })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL('/books')
    await page.goForward()
    await expect(page).toHaveURL(`/profile/${ids[kind]}`)
    await expect(page.getByRole('heading', { name: `${kind} learner`, exact: true })).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.getByRole('button', { name: 'Open user menu' }).click()
    await expect(page.getByRole('menuitem', { name: 'My Profile' })).toHaveAttribute('href', `/profile/${ids[kind]}`)
    await page.getByRole('menuitem', { name: 'My Profile' }).click()
    await expect(page).toHaveURL(`/profile/${ids[kind]}`)
    await noOverflow(page)
    if (kind === 'reviewer' || kind === 'admin') {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await page.getByRole('dialog', { name: 'Site navigation', exact: true }).getByText('Reviewer', { exact: true }).click()
      await expect(page).toHaveURL('/reviewer')
      await expect(page.getByRole('tab', { name: 'Books', exact: true })).toBeVisible()
      await expect(page.getByRole('combobox', { name: 'Book', exact: true })).toBeVisible()
      await noOverflow(page)
    }
  })
}

test('ordinary mobile drawer links all reach their desktop destinations', async ({ context, page }) => {
  await session(context, 'free')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/books')
  for (const [name, route] of [['Home', '/'], ['Explore', '/explore'], ['Watch', '/cartoons'], ['Read', '/books'], ['Memory', '/memory'], ['Give Feedback', '/feedback'], ['Support Us', '/support']]) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await page.getByRole('dialog', { name: 'Site navigation', exact: true }).getByText(name, { exact: true }).click()
    await expect(page).toHaveURL(route)
    await expect(page.getByRole('dialog', { name: 'Site navigation', exact: true })).not.toBeVisible()
    await noOverflow(page)
    await expect(page.getByText(/Access denied|Unable to verify account|Application error/)).not.toBeVisible()
  }
})

test('guest Profile stays on a sign-in route; guest book chapters require sign-in', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/profile')
  await expect(page).toHaveURL('/profile')
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.goto(chapter)
  await expect(page.getByRole('heading', { name: /Sign in to read/ })).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(0)
  await noOverflow(page)
})

test('free reader audio opens the existing upgrade without navigation or media', async ({ context, page }) => {
  await session(context, 'free')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(chapter)
  await expect(page.locator('[data-reader-mobile-audio]')).toBeVisible()
  await expect(page.locator('[data-reader-heading]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play Audio', exact: true })).toBeVisible()
  const button = await page.locator('[data-reader-audio-trigger]').boundingBox(), header = await page.locator('[data-reader-heading]').boundingBox()
  expect(button!.y + button!.height).toBeLessThanOrEqual(header!.y)
  await page.locator('[data-reader-audio-trigger]').click()
  await expect(page.getByRole('dialog')).toContainText('AWM')
  await expect(page.locator('audio')).toHaveCount(0)
  await expect(page).toHaveURL(chapter)
  await expect(page.getByText(/Audio couldn.t|Access denied|Forbidden/)).not.toBeVisible()
})

test('premium audio plays inline and survives reading modes, settings, scrolling and resize', async ({ context, page }) => {
  await session(context, 'premium')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(chapter)
  const mobileBar = page.locator('[data-reader-mobile-audio]')
  await expect(mobileBar).toBeVisible()
  const bounds = await mobileBar.boundingBox()
  expect(bounds!.width).toBeGreaterThan(330)
  await page.locator('[data-reader-audio-trigger]').click()
  const audio = page.locator('audio')
  await expect(audio).toHaveCount(1)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).readyState)).toBeGreaterThanOrEqual(1)
  // Desktop Chrome may enforce autoplay after the asynchronous URL request.
  // The next direct tap must play the same native element, without downloading again.
  if (await audio.evaluate(element => (element as HTMLAudioElement).paused)) await page.locator('[data-reader-audio-trigger]').click()
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0.2)
  await audio.evaluate(element => { Object.assign(window, { readerMediaElement: element }); (element as HTMLAudioElement).currentTime = 10 })
  const sameMedia = () => audio.evaluate(element => element === (window as Window & { readerMediaElement?: Element }).readerMediaElement)
  const readingModes = page.getByRole('group', { name: 'Reading view' })
  await readingModes.getByRole('button', { name: 'Book view', exact: true }).click()
  expect(await sameMedia()).toBe(true)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Reading settings')
  await page.getByRole('button', { name: 'Modern', exact: true }).click()
  await page.getByRole('slider', { name: 'Book text size' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: 'Close reading settings' }).click()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await sameMedia()).toBe(true)
  expect(await audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(false)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(mobileBar).toHaveCount(0)
  await expect(page.locator('[data-reader-heading] [data-reader-audio-trigger]')).toBeVisible()
  expect(await sameMedia()).toBe(true)
  const heading = await page.locator('h1').boundingBox(), desktopAudio = await page.locator('[data-reader-audio-trigger]').boundingBox()
  expect(Math.abs(desktopAudio!.y - heading!.y)).toBeLessThan(25)
  await page.locator('[data-reader-audio-trigger]').click()
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true)
  expect(await audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThanOrEqual(10)
  await noOverflow(page)
  await page.screenshot({ path: 'test-results/reader-desktop.png' })
  await page.setViewportSize({ width: 320, height: 700 })
  await noOverflow(page)
  await page.screenshot({ path: 'test-results/reader-mobile.png' })
})

test('Explore has one measured header offset through dynamic viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/explore')
  const active = page.locator('[data-explore-player=active]')
  await expect(active).toBeVisible()
  for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 680 }, { width: 320, height: 700 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await expect.poll(async () => {
      const nav = await page.locator('.MuiAppBar-root').boundingBox(), video = await active.boundingBox()
      return Math.abs(video!.y - (nav!.y + nav!.height))
    }).toBeLessThanOrEqual(1)
    await noOverflow(page)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  // A changing safe-area/header contribution must be measured once as well.
  await page.locator('#main-navbar').evaluate(nav => { nav.style.paddingTop = '20px' })
  await expect.poll(async () => {
    const nav = await page.locator('#main-navbar').boundingBox(), video = await active.boundingBox()
    return Math.abs(video!.y - (nav!.y + nav!.height))
  }).toBeLessThanOrEqual(1)
  await page.locator('#main-navbar').evaluate(nav => { nav.style.paddingTop = '' })
  await page.screenshot({ path: 'test-results/explore-mobile.png' })
})

test('Explore requests sound on each clip; mute persists without overlapping players', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/explore')
  const current = () => page.evaluate(() => {
    const state = (window as unknown as { __ytFixture: { players: Array<{ id: string; muted: boolean; playing: boolean; destroyed: boolean }>; calls: Array<{ id: string; muted: boolean }> } }).__ytFixture
    return { active: state.players.filter(player => !player.destroyed), calls: state.calls }
  })
  await expect.poll(async () => (await current()).calls.length).toBeGreaterThan(0)
  expect((await current()).calls[0].muted).toBe(false)
  await page.locator('[data-explore-player=active]').getByRole('button', { name: 'Mute Explore video', exact: true }).click()
  const first = (await current()).active[0].id
  await page.locator('#explore-feed').evaluate(feed => feed.scrollBy({ top: feed.clientHeight, behavior: 'instant' }))
  await expect.poll(async () => (await current()).active[0]?.id ?? first).not.toBe(first)
  await expect.poll(async () => (await current()).active.length).toBe(1)
  await expect.poll(async () => (await current()).active[0]?.muted).toBe(true)
  await page.locator('[data-explore-player=active]').getByRole('button', { name: 'Turn Explore sound on', exact: true }).click()
  await expect.poll(async () => (await current()).active[0]?.muted).toBe(false)
  await page.locator('#explore-feed').evaluate(feed => feed.scrollBy({ top: feed.clientHeight, behavior: 'instant' }))
  await expect.poll(async () => (await current()).active[0]?.id ?? first).not.toBe(first)
  await expect.poll(async () => (await current()).active[0]?.muted).toBe(false)
  await expect.poll(async () => (await current()).active.length).toBe(1)
  await page.locator('#explore-feed').evaluate(feed => feed.scrollTo({ top: 0, behavior: 'instant' }))
  await expect.poll(async () => (await current()).active[0]?.id).toBe(first)
  expect((await current()).active).toHaveLength(1)
  expect((await current()).active[0].muted).toBe(false)
})

test('mobile navigation has usable touch targets and closing the drawer does not navigate', async ({ context, page }) => {
  await session(context, 'free')
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/books')
  await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible()
  const buttons = page.locator('#main-navbar button')
  for (const button of await buttons.all()) {
    const box = await button.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('button', { name: 'Open menu', exact: true }).tap()
  await expect(page.getByRole('dialog', { name: 'Site navigation', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Site navigation', exact: true })).not.toBeVisible()
  await expect(page).toHaveURL('/books')
  await noOverflow(page)
  await page.getByRole('button', { name: 'Open navigation', exact: true }).tap()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Read', exact: true }).tap()
  await expect(page).toHaveURL('/books')
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible()
})

test('sign-out clears the premium player and authenticated navigation', async ({ context, page }) => {
  await session(context, 'premium')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(chapter)
  await page.locator('[data-reader-audio-trigger]').click()
  await expect(page.locator('audio')).toHaveCount(1)
  await page.getByRole('button', { name: 'Open user menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign Out' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.locator('audio')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Site navigation', exact: true })).not.toContainText(/My Profile|Reviewer|Admin/)
})

test('Explore handles one policy rejection and restores sound on a gesture', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/books')
  await page.evaluate(() => { (window as unknown as { __ytFixture: { blockNext: boolean } }).__ytFixture.blockNext = true })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByRole('dialog', { name: 'Site navigation', exact: true }).getByText('Explore', { exact: true }).click()
  await expect(page.locator('[data-explore-player=active]').getByRole('button', { name: 'Turn Explore sound on', exact: true })).toBeVisible()
  const calls = () => page.evaluate(() => (window as unknown as { __ytFixture: { calls: unknown[] } }).__ytFixture.calls.length)
  const before = await calls()
  // One muted fallback settles; it must not repeatedly unmute itself.
  await page.waitForTimeout(500)
  expect(await calls()).toBe(before)
  await page.locator('[data-explore-player=active]').getByRole('button', { name: 'Turn Explore sound on', exact: true }).click()
  await expect(page.locator('[data-explore-player=active]').getByRole('button', { name: 'Mute Explore video', exact: true })).toBeVisible()
})
