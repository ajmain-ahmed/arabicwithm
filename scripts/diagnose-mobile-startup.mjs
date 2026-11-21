// Read-only production startup probe. No credentials, synthetic auth, or application-error filters.
import { webkit, chromium, devices } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const base = process.env.AWM_STARTUP_URL ?? 'https://arabicwithm.com'
const label = process.env.AWM_STARTUP_LABEL ?? 'before'
const widths = (process.env.AWM_STARTUP_WIDTHS ?? '390').split(',').map(Number)
const modes = (process.env.AWM_STARTUP_MODES ?? 'tab').split(',')
const engine = process.env.AWM_STARTUP_BROWSER ?? 'webkit'
const scenario = process.env.AWM_STARTUP_SCENARIO ?? 'normal'
const dir = 'docs/validation/iphone-startup'
await mkdir(dir, { recursive: true })
const browser = await (engine === 'webkit' ? webkit : chromium).launch(engine === 'chrome' ? { channel: 'chrome' } : {})
const results = []
try {
  for (const width of widths) for (const mode of modes) {
    const context = await browser.newContext({ ...devices['iPhone 13'], browserName: undefined,
      viewport: { width, height: 844 }, serviceWorkers: 'allow', ignoreHTTPSErrors: false })
    if (mode === 'standalone') await context.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { get: () => true })
      const original = matchMedia.bind(window)
      window.matchMedia = query => {
        const result = original(query)
        return query === '(display-mode: standalone)' ? new Proxy(result, { get(target, key) {
          if (key === 'matches') return true
          const value = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        } }) : result
      }
    })
    const page = await context.newPage()
    let staleInjected = false
    if (scenario === 'stale-entry' || scenario === 'slow') await context.route('**/*', async route => {
      if (scenario === 'slow') await new Promise(resolve => setTimeout(resolve, 250))
      if (scenario === 'stale-entry' && !staleInjected && route.request().resourceType() === 'script' && route.request().url().includes('/_next/static/chunks/')) {
        staleInjected = true
        return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Injected obsolete build chunk' })
      }
      return route.continue()
    })
    const errors = [], failed = [], responses = [], requests = [], stages = []
    page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ console: message.text() }) })
    page.on('request', request => requests.push({ url: request.url(), method: request.method(), type: request.resourceType() }))
    page.on('requestfailed', request => failed.push({ url: request.url(), reason: request.failure()?.errorText }))
    page.on('response', response => responses.push({ url: response.url(), status: response.status(),
      contentType: response.headers()['content-type'], cache: response.headers()['cache-control'], cfCache: response.headers()['cf-cache-status'] }))
    await page.addInitScript(() => {
      window.__awmStartup = { commits: [], longTasks: [], errors: [], milestones: [] }
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, inject: () => 1,
        onCommitFiberRoot: () => window.__awmStartup.commits.push(performance.now()), onCommitFiberUnmount() {} }
      window.addEventListener('error', event => window.__awmStartup.errors.push({ time: performance.now(), message: event.message, source: event.filename }), true)
      window.addEventListener('awm-hydrated', () => window.__awmStartup.milestones.push({ name: 'hydrated-event', time: performance.now() }))
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list => {
        window.__awmStartup.longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })))
      }).observe({ type: 'longtask', buffered: true })
    })
    const started = Date.now()
    let navigationError = null, interactive = null
    try {
      await page.goto(base, { waitUntil: 'commit', timeout: 30000 })
      stages.push({ name: 'HTML commit', elapsed: Date.now() - started })
      await page.locator('[data-featured-hero]:visible').first().waitFor({ timeout: 25000 })
      stages.push({ name: 'Featured shell visible', elapsed: Date.now() - started })
      await page.locator('[data-featured-carousel]:visible').first().waitFor({ timeout: 25000 })
      stages.push({ name: 'Featured content visible', elapsed: Date.now() - started })
      await page.getByRole('button', { name: 'Open menu', exact: true }).click({ timeout: 15000 })
      await page.locator('.MuiDrawer-paper:visible').waitFor({ timeout: 15000 })
      interactive = await page.evaluate(() => performance.now())
      stages.push({ name: 'Menu interactive', elapsed: Date.now() - started })
      await page.keyboard.press('Escape')
    } catch (error) { navigationError = error.message }
    await page.waitForTimeout(1500)
    const metrics = await page.evaluate(async () => {
      const nav = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource').map(entry => ({ url: entry.name, type: entry.initiatorType,
        start: entry.startTime, duration: entry.duration, bytes: entry.transferSize, decodedBytes: entry.decodedBodySize }))
      return { url: location.href, readyState: document.readyState,
        title: document.title, body: document.body.innerText.slice(0, 1000),
        ttfb: nav?.responseStart, htmlEnd: nav?.responseEnd, domContentLoaded: nav?.domContentLoadedEventEnd,
        firstPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        hydration: performance.getEntriesByName('awm-hydrated')[0]?.startTime ?? null,
        hydrated: document.documentElement.dataset.awmHydrated, ...window.__awmStartup,
        resources, serviceWorker: navigator.serviceWorker ? {
          controller: navigator.serviceWorker.controller?.scriptURL ?? null,
          registrations: (await navigator.serviceWorker.getRegistrations()).map(reg => ({ scope: reg.scope, active: reg.active?.scriptURL }))
        } : null,
        cacheNames: 'caches' in window ? await caches.keys() : null,
        featured: document.querySelector('[data-featured-carousel]') !== null,
        featuredImages: [...document.querySelectorAll('[data-featured-hero] img')].map(img => ({src: img.currentSrc, fallback: img.dataset.fallback, complete: img.complete, naturalWidth: img.naturalWidth})),
        oldHero: document.querySelector('[data-home-hero]') !== null,
        menuHit: (() => { const el = document.querySelector('button[aria-label="Open menu"]'); if (!el) return null;
          const rect = el.getBoundingClientRect(); const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return { usable: el === top || el.contains(top), top: top?.outerHTML.slice(0, 200) } })(),
        recover: document.querySelector('#awm-startup-recovery')?.textContent ?? null }
    }).catch(error => ({ evaluationError: error.message }))
    await page.screenshot({ path: `${dir}/${label}-${engine}-${width}-${mode}.png`, fullPage: false }).catch(() => {})
    const result = { base, engine, width, mode, scenario, staleInjected, stages, interactive, navigationError, errors, failed, responses, requests, ...metrics }
    if (process.env.AWM_STARTUP_FLOWS === '1' && interactive) {
      result.flows = []
      async function visit(name, path) {
        const response = await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' })
        await page.locator('main:visible').first().waitFor()
        if (response.status() >= 400 || await page.locator('[data-awm-page-error]').count()) throw new Error(`${name} failed: ${response.status()}`)
        result.flows.push({ name, path, landed: new URL(page.url()).pathname, status: response.status() })
      }
      try {
        await visit('Watch', '/cartoons')
        await visit('Shows', '/cartoons?view=shows')
        await page.locator('main a[href^="/cartoons/"]').first().waitFor({ timeout: 15000 })
        const show = await page.locator('main a[href^="/cartoons/"]').evaluateAll(links => links.map(link => link.getAttribute('href')).find(href => new URL(href, location.href).pathname.split('/').filter(Boolean).length === 2))
        if (!show) throw new Error('No Show link found')
        await visit('Show', show)
        await page.locator('main a[href^="/cartoons/"]').first().waitFor({ timeout: 15000 })
        const episode = await page.locator('main a[href^="/cartoons/"]').evaluateAll(links => links.map(link => link.getAttribute('href')).find(href => new URL(href, location.href).pathname.split('/').filter(Boolean).length === 3))
        if (!episode) throw new Error('No Episode link found')
        await visit('Episode', episode)
        await visit('Explore', '/explore')
        await visit('Read', '/books')
        await page.locator('main a[href^="/books/"]').first().waitFor({ timeout: 15000 })
        const book = await page.locator('main a[href^="/books/"]').first().getAttribute('href')
        if (!book) throw new Error('No Book link found')
        await visit('Book', book)
        await visit('Learn', '/learn')
        await visit('Grammar', '/grammar')
        await page.getByRole('heading', { name: 'Naḥw', exact: true }).waitFor()
        await page.getByRole('heading', { name: 'Ṣarf', exact: true }).waitFor()
        if (await page.getByRole('link', { name: 'Grammar in Context', exact: true }).count()) throw new Error('Retired Grammar link returned')
        await visit('Profile (signed-out redirect)', '/profile')
        await visit('Library', '/books')
        await visit('Home warm reload', '/')
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.getByRole('button', { name: 'Open menu', exact: true }).click()
        await page.locator('.MuiDrawer-paper:visible').waitFor()
        result.warmReload = 'PASS'
      } catch (error) { result.flowError = error.message }
    }
    results.push(result)
    await writeFile(`${dir}/${label}-${engine}.json`, JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ engine, width, mode, stages, interactive, navigationError, errors, failed,
      ttfb: metrics.ttfb, htmlEnd: metrics.htmlEnd, hydration: metrics.hydration,
      serviceWorker: metrics.serviceWorker, cacheNames: metrics.cacheNames,
      slowest: metrics.resources?.toSorted((a, b) => b.duration - a.duration).slice(0, 4),
      largest: metrics.resources?.toSorted((a, b) => b.decodedBytes - a.decodedBytes).slice(0, 3) }))
    await context.close()
  }
} finally { await browser.close() }
