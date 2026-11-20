// Production-build browser measurements. Run against the isolated fixture or a public URL.
import { chromium, webkit, request } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const baseURL = process.env.AWM_PERF_URL ?? 'http://127.0.0.1:3077'
const label = process.env.AWM_PERF_LABEL ?? 'after'
const results = []
if (baseURL === 'http://127.0.0.1:3077') {
  const api = await request.newContext({ ignoreHTTPSErrors: true })
  const rules = process.env.AWM_PERF_SLOW_SPOTLIGHT === '1'
    ? [{ path: '/rest/v1/rpc/home_for_you_spotlight', delay: 2500, remaining: -1 }] : []
  await api.post('https://localhost:4377/fixture/reliability', { data: { reset: true, rules } })
  await api.dispose()
}
for (const [name, engine, options] of [
  ['webkit', webkit, {}],
  ['chrome', chromium, { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }],
]) {
  const browser = await engine.launch(options)
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true })
    const page = await context.newPage()
    // Keep third party availability outside this first-party startup comparison.
    await page.route(/googletagmanager|youtube\.com|ytimg\.com/, route => route.abort())
    await page.addInitScript(() => {
      window.__startup = { commits: [], lcp: null, longTasks: [] }
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, inject: () => 1,
        onCommitFiberRoot: () => window.__startup.commits.push(performance.now()), onCommitFiberUnmount() {} }
      for (const type of ['largest-contentful-paint', 'longtask']) {
        if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
        new PerformanceObserver(list => { for (const entry of list.getEntries()) {
          if (type === 'largest-contentful-paint') window.__startup.lcp = entry.startTime
          else window.__startup.longTasks.push({ start: entry.startTime, duration: entry.duration })
        } }).observe({ type, buffered: true })
      }
    })
    const cdp = name === 'chrome' ? await context.newCDPSession(page) : null
    await cdp?.send('Performance.enable')
    // Waiting for DOMContentLoaded would hide the benefit of streamed HTML:
    // an unrelated Suspense boundary can keep the document stream open.
    await page.goto(baseURL, { waitUntil: 'commit' })
    await page.locator('[data-featured-hero], [data-home-hero]').first().waitFor()
    const shellVisible = await page.evaluate(() => performance.now())
    await page.locator('[data-featured-carousel], [data-home-hero]').first().waitFor()
    const contentVisible = await page.evaluate(() => performance.now())
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const menu = page.getByRole('button', { name: 'Open menu', exact: true })
    await menu.click()
    await page.locator('.MuiDrawer-paper').waitFor({ timeout: 5000 })
    const usable = await page.evaluate(() => performance.now())
    await page.waitForTimeout(1000)
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource').map(r => ({
        url: r.name, type: r.initiatorType, start: r.startTime, duration: r.duration,
        bytes: r.transferSize, decodedBytes: r.decodedBodySize, blocking: r.renderBlockingStatus,
      }))
      return { ttfb: nav.responseStart - nav.startTime,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        ...window.__startup, domContentLoaded: nav.domContentLoadedEventEnd,
        hydrated: performance.getEntriesByName('awm-hydrated')[0]?.startTime ?? null,
        jsBytes: resources.filter(r => r.type === 'script').reduce((n, r) => n + r.bytes, 0),
        jsDecodedBytes: resources.filter(r => r.type === 'script').reduce((n, r) => n + r.decodedBytes, 0),
        imageBytes: resources.filter(r => r.type === 'img').reduce((n, r) => n + r.bytes, 0),
        blockingRequests: 'renderBlockingStatus' in performance.getEntriesByType('resource')[0]
          ? resources.filter(r => r.blocking === 'blocking').length : null,
        // Modulepreloads and image preloads are `link`/`other` in some engines.
        totalJsTransferBytes: resources.filter(r => /\.m?js(?:\?|$)/.test(r.url)).reduce((n, r) => n + r.bytes, 0),
        totalImageTransferBytes: resources.filter(r => /\.(?:avif|webp|png|jpe?g|svg)(?:\?|$)/.test(r.url)).reduce((n, r) => n + r.bytes, 0),
        featuredImage: (() => { const img = document.querySelector('[data-featured-hero] img'); return img ? { src: img.currentSrc, complete: img.complete, width: img.naturalWidth } : null })(),
        fontPreloads: [...document.querySelectorAll('link[as="font"]')].map(link => ({ href: link.href, type: link.type, crossOrigin: link.crossOrigin })),
        resources,
        legacy: !!document.querySelector('[data-home-hero]'),
      }
    })
    const cpu = cdp ? Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m => ['ScriptDuration', 'TaskDuration'].includes(m.name)).map(m => [m.name, m.value * 1000])) : null
    results.push({ name, run, shellVisible, contentVisible, usable, cpu, ...metrics })
    await context.close()
  }
  await browser.close()
}
await mkdir('docs/validation/home-startup', { recursive: true })
await writeFile(`docs/validation/home-startup/${label}.json`, JSON.stringify({ baseURL, label, results }, null, 2))
console.log(JSON.stringify(results.map(({ name, run, ttfb, fcp, lcp, contentVisible, usable, cpu, jsBytes, imageBytes, legacy }) => ({ name, run, ttfb, fcp, lcp, contentVisible, usable, cpu, jsBytes, imageBytes, legacy })), null, 2))
