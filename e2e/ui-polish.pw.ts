import { test, expect, type BrowserContext, type Page } from '@playwright/test'

async function signIn(context: BrowserContext, kind: 'free' | 'premium' | 'admin' | 'reviewer') {
  const id = { free: '11111111-1111-4111-8111-111111111111', premium: '22222222-2222-4222-8222-222222222222', admin: '44444444-4444-4444-8444-444444444444', reviewer: '33333333-3333-4333-8333-333333333333' }[kind]
  const expires = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  const user = { id, aud: 'authenticated', role: 'authenticated', email: `${kind}@fixture.example`, app_metadata: { provider: 'email' }, user_metadata: {} }
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true) }

// Exercise the real hook's IFrame API contract deterministically. Native chapter
// audio in the separate acceptance suite is real, seekable WAV playback.
async function youtube(page: Page, blockSound = false) {
  await page.addInitScript({ content: `
    window.__ytLog = []; window.__ytActive = new Set();
    window.YT = { PlayerState: {ENDED: 0, PLAYING: 1}, Player: class {
      constructor(element, options) { this.id=options.videoId; this.options=options; this.muted=false; this.volume=100; window.__ytLog.push(['create',this.id]); setTimeout(()=>options.events.onReady(),0); }
      getCurrentTime(){return 1} getDuration(){return 60} seekTo(){}
      playVideo(){window.__ytLog.push(['play',this.id,this.muted]); if(${blockSound}&&!this.muted&&!this.allowed){this.options.events.onAutoplayBlocked();return} window.__ytActive.add(this);this.options.events.onStateChange({data:1});}
      pauseVideo(){window.__ytActive.delete(this);this.options.events.onStateChange({data:2})}
      mute(){this.muted=true;window.__ytLog.push(['mute',this.id])}
      unMute(){this.muted=false;this.unmuteCalls=(this.unmuteCalls||0)+1;this.allowed=this.unmuteCalls>1} isMuted(){return this.muted} getVolume(){return this.volume} setVolume(value){this.volume=value}
      destroy(){window.__ytActive.delete(this);window.__ytLog.push(['destroy',this.id])}
    }};
  ` })
}

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`centred CTA, Learn hub, compact library and dedicated Listen route at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    const hero = await page.locator('[data-home-hero]').boundingBox()
    if (width >= 900) expect(hero!.height).toBeLessThanOrEqual(540)
    else expect(hero!.height).toBeGreaterThanOrEqual(520)
    const cta = page.locator('#download-app')
    const field = cta.getByLabel('Email address'), action = cta.getByRole('button', { name: 'Email me once the app launches', exact: true })
    await expect(field).toBeVisible(); await expect(action).toBeVisible()
    const bounds = await Promise.all([cta.boundingBox(), field.boundingBox(), action.boundingBox()])
    for (const box of bounds.slice(1)) { expect(box!.x).toBeGreaterThanOrEqual(bounds[0]!.x); expect(box!.x + box!.width).toBeLessThanOrEqual(bounds[0]!.x + bounds[0]!.width) }
    expect(Math.abs(bounds[1]!.x + bounds[1]!.width / 2 - bounds[2]!.x - bounds[2]!.width / 2)).toBeLessThan(2)
    expect(bounds[2]!.y).toBeGreaterThan(bounds[1]!.y)
    await noOverflow(page)
    await cta.screenshot({ path: `test-results/polish-cta-${width}.png` })
    await page.goto('/learn')
    await expect(page.getByRole('heading', { name: 'Learn', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Word Search.*Find Arabic/ })).toBeVisible()
    expect(await page.locator('main a').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('Memory'), expect.stringContaining('Grammar'), expect.stringContaining('Word Search')]))
    expect(await page.locator('main a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(['/memory', '/grammar', '/word-search'])
    await page.goto('/books')
    const read = page.getByRole('region', { name: 'Book library', exact: true }).getByRole('img').first()
    const readBox = await read.boundingBox()
    if (width < 900) {
      const controls = await Promise.all(['Read', 'Listen', 'Filters'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()))
      expect(Math.max(...controls.map(item => item!.y)) - Math.min(...controls.map(item => item!.y))).toBeLessThan(10)
    }
    await page.getByRole('button', { name: 'Listen', exact: true }).click()
    const library = page.getByRole('region', { name: 'Audiobook library' })
    const listenBox = await library.getByRole('img').first().boundingBox()
    expect(Math.abs(readBox!.width - listenBox!.width)).toBeLessThan(1)
    expect(Math.abs(readBox!.height - listenBox!.height)).toBeLessThan(1)
    await expect(page.getByRole('region', { name: 'Audiobook player' })).toHaveCount(0)
    await library.getByRole('link').first().click()
    await expect(page).toHaveURL(/\/listen\/test-book$/)
    await expect(page.getByRole('region', { name: 'Audiobook player' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Read This Chapter' })).toHaveAttribute('href', '/books/test-book/chapter-1?lang=ar')
    await noOverflow(page)
    await page.screenshot({ path: `test-results/polish-listen-${width}.png`, fullPage: true })
  })
}

for (const kind of ['free', 'premium', 'admin', 'reviewer'] as const) {
  test(`mobile Learn navigation and authorised tools for ${kind}`, async ({ page, context }) => {
    await signIn(context, kind); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/books')
    if (kind === 'premium' || kind === 'admin') await expect(page.getByRole('img', { name: 'AWM Plus member' })).toBeVisible()
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Site navigation' })
    if (kind === 'admin' || kind === 'reviewer') await expect(drawer.getByRole('button', { name: 'Reviewer', exact: true })).toBeVisible()
    const items = drawer.locator('.mobile-list-btn')
    const labels = await items.allTextContents()
    for (const label of ['My Profile', 'Home', 'Explore', 'Watch', 'Read', 'Learn', 'Give Feedback', 'Support Us']) expect(labels).toContain(label)
    for (const label of ['Memory', 'Grammar', 'Word Search']) {
      if (kind === 'admin' || kind === 'reviewer') expect(labels).toContain(label)
      else expect(labels).not.toContain(label)
    }
    expect(labels.includes('Admin')).toBe(kind === 'admin')
    expect(labels.includes('Reviewer')).toBe(kind === 'admin' || kind === 'reviewer')
    await drawer.getByRole('button', { name: 'Learn', exact: true }).click()
    await expect(page).toHaveURL(/\/learn$/)
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
    const floating = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(floating.getByRole('button', { name: 'Learn', exact: true })).toBeVisible()
    await expect(floating.getByRole('button', { name: 'Memory', exact: true })).toHaveCount(0)
  })
}

for (const width of [390, 1440]) {
  test(`Grammar catalogue, footer and correct-only auto-advance at ${width}`, async ({ page, context }) => {
    await signIn(context, 'free'); await page.setViewportSize({ width, height: 1000 }); await page.goto('/grammar')
    const nahw = page.getByRole('region', { name: 'Naḥw' }), sarf = page.getByRole('region', { name: 'Ṣarf' })
    await expect(nahw.getByRole('button', { name: 'Word Type', exact: true })).toBeVisible()
    expect(await nahw.getByRole('button').allTextContents()).toEqual(['Word Type', 'Sentence Role', 'Case Endings', 'Revise Naḥw Rules'])
    expect(await sarf.getByRole('button').allTextContents()).toEqual(['Root Types', 'Context Ṣarf', 'Weak Verbs', 'Word Patterns', 'Revise the Ten Forms'])
    if (width >= 900) { const footer = await page.locator('footer').boundingBox(); expect(footer!.y + footer!.height).toBeGreaterThanOrEqual(999) }
    await noOverflow(page)
    await page.screenshot({ path: `test-results/polish-grammar-${width}.png`, fullPage: true })
    await nahw.getByRole('button', { name: 'Sentence Role', exact: true }).click()
    const words = page.getByRole('button', { name: /^Select / })
    await words.nth(1).click(); await page.getByRole('button', { name: 'Check Answer' }).click()
    await expect(page.getByRole('status')).toContainText('Try again')
    await expect(page.getByText('1 /', { exact: false })).toBeVisible()
    await page.waitForTimeout(1100)
    await expect(page.getByText('1 /', { exact: false })).toBeVisible()
    await words.nth(1).click(); await words.nth(0).click(); await page.getByRole('button', { name: 'Check Answer' }).click()
    await expect(page.getByRole('status')).toContainText('Correct')
    await expect(page.getByText('2 /', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Back to Grammar' }).click()
    await sarf.getByRole('button', { name: 'Root Types', exact: true }).click()
    await page.getByRole('combobox').click()
    for (const name of ['All Root Types', 'Three-Letter Roots', 'Four-Letter Roots']) await expect(page.getByRole('option', { name, exact: true })).toBeVisible()
    await page.getByRole('option', { name: 'Four-Letter Roots', exact: true }).click()
    await expect(page.getByText('Enter its four-letter root.', { exact: true })).toBeVisible()
    await page.getByLabel('Your Arabic answer', { exact: true }).fill('دحرج')
    await page.getByRole('button', { name: 'Check Answer' }).click()
    await expect(page.getByRole('status')).toContainText('Correct')
    await expect(page.getByText('Activity completed', { exact: true })).toBeVisible()
  })
}

for (const width of [390, 1440]) {
  test(`Explore hints and single-player autoplay with muted fallback at ${width}`, async ({ page }) => {
    await youtube(page, true); await page.setViewportSize({ width, height: 1000 }); await page.goto('/explore')
    const hint = page.getByRole('note')
    await expect(hint).toBeVisible()
    if (width >= 900) {
      const button = await page.getByRole('button', { name: 'For You feed' }).boundingBox(), bubble = await hint.boundingBox()
      expect(bubble!.x).toBeGreaterThan(button!.x + button!.width)
      await expect(page.getByRole('button', { name: 'Dismiss navigation hint' })).toBeVisible()
    } else {
      const header = await page.locator('#main-navbar').boundingBox(), switcher = await page.getByRole('button', { name: 'Explore feed' }).boundingBox(), player = await page.locator('[data-explore-player="active"]').boundingBox()
      expect(switcher!.y - header!.y - header!.height).toBeLessThan(12)
      expect(player!.y - header!.y - header!.height).toBeLessThan(70)
    }
    await expect(hint).not.toBeVisible({ timeout: width < 900 ? 3500 : 5000 })
    await page.getByRole('button', { name: 'For You feed' }).click()
    await expect(page.getByText('book', { exact: true }).first()).toBeVisible()
    if (width >= 900) {
      await page.getByRole('button', { name: 'Dismiss navigation hint' }).click()
      await expect(page.getByRole('note')).not.toBeVisible()
    }
    await expect.poll(() => page.evaluate('window.__ytActive.size')).toBe(1)
    await expect(page.getByRole('button', { name: 'Turn sound on', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Turn sound on', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Mute', exact: true })).toBeVisible()
    await page.locator('[lang="ar"]').first().hover()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await page.getByRole('button', { name: 'Next clip', exact: true }).click()
    await expect.poll(() => page.evaluate('window.__ytActive.size')).toBe(1)
    expect(await page.evaluate('window.__ytLog.filter(row => row[0] === "destroy").length')).toBeGreaterThanOrEqual(2)
    await expect(page.getByRole('note')).not.toBeVisible({ timeout: 5000 })
    await noOverflow(page)
    await page.screenshot({ path: `test-results/polish-for-you-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Explore feed' }).click()
    await expect(page.getByRole('note')).not.toBeVisible()
  })
}

test('mobile Watch keeps Script, Vocab, Settings and Memory without Grammar', async ({ page, context }) => {
  await signIn(context, 'free'); await youtube(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/cartoons/test-show/clip-0')
  await expect(page.getByRole('tab', { name: 'Script', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Settings', exact: true })).toBeVisible()
  expect(await page.getByRole('tab').allTextContents()).toEqual(['Script', 'Vocab', 'Settings', 'Memory'])
  await page.getByRole('tab', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test.describe('desktop pointer interaction', () => {
  test.use({ hasTouch: false })
  test('book glow leaves the card in place and For You autoplays with sound when allowed', async ({ page }) => {
    await youtube(page)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/books')
    const card = page.getByRole('region', { name: 'Book library', exact: true }).getByRole('link').first()
    await expect(card).toBeVisible()
    const before = await card.boundingBox()
    await card.hover()
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none')
    expect(await card.boundingBox()).toEqual(before)
    await page.goto('/explore')
    await page.getByRole('button', { name: 'For You feed' }).click()
    await expect.poll(() => page.evaluate('window.__ytActive.size')).toBe(1)
    await expect(page.getByRole('button', { name: 'Mute', exact: true })).toBeVisible()
  })
})

test('starting audio immediately after opening Listen keeps the dedicated route', async ({ page, context }) => {
  await signIn(context, 'premium')
  await page.goto('/books')
  await page.getByRole('button', { name: 'Listen', exact: true }).click()
  await page.getByRole('region', { name: 'Audiobook library' }).getByRole('link').first().click()
  const player = page.getByRole('region', { name: 'Audiobook player' })
  await player.getByRole('button', { name: 'Play Audio', exact: true }).click()
  await expect.poll(() => player.locator('audio').evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0)
  await expect(page).toHaveURL(/\/listen\/test-book$/)
})
