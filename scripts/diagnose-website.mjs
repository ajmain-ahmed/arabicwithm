import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

// Read-only smoke audit against a running website and its real backend.
const baseURL = process.env.AWM_DIAGNOSTIC_URL ?? 'http://127.0.0.1:3037'
const output = 'docs/validation/website-troubleshooting'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const results = []
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const routes = ['/', '/explore', '/cartoons', '/books', '/search', '/grammar', '/memory', '/word-search', '/practice', '/vocabulary', '/feedback', '/support', '/profile', '/reset-password', '/admin']
    for (const path of routes) {
      const page = await context.newPage()
      const result = { path, width, errors: [], failedRequests: [], status: null }
      page.on('pageerror', error => result.errors.push(error.message))
      page.on('requestfailed', request => {
        // Next cancels speculative prefetches when navigation changes.
        if (request.failure()?.errorText === 'net::ERR_ABORTED') return
        result.failedRequests.push({ url: request.url().split('?')[0], error: request.failure()?.errorText })
      })
      const start = Date.now()
      try {
        const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        result.status = response?.status()
        await page.waitForTimeout(path === '/explore' ? 8000 : 1000)
        result.milliseconds = Date.now() - start
        result.title = await page.title()
        result.text = (await page.locator('main').first().innerText()).slice(0, 350)
        result.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
        result.frames = await page.locator('iframe').evaluateAll(elements => elements.map(el => ({ src: el.src, width: el.clientWidth, height: el.clientHeight, allow: el.allow })))
        result.playback = []
        for (const frame of page.frames().filter(frame => frame.url().startsWith('https://www.youtube.com/embed/'))) {
          try {
            result.playback.push(await frame.evaluate(() => {
              const video = document.querySelector('video')
              return video ? { paused: video.paused, currentTime: video.currentTime, muted: video.muted, readyState: video.readyState } : { unavailable: true }
            }))
          } catch { result.playback.push({ unavailable: true }) }
        }
        if (path === '/cartoons' || path === '/books' || /^\/books\/[^/]+$/.test(path)) {
          const links = await page.locator('main a[href]').evaluateAll(elements => elements.map(el => el.getAttribute('href')))
          const patterns = path === '/cartoons' ? [/^\/cartoons\/[^/]+$/, /^\/cartoons\/[^/]+\/[^/?#]+$/] : path === '/books' ? [/^\/books\/[^/]+$/] : [/^\/books\/[^/]+\/[^/?#]+$/]
          for (const pattern of patterns) {
            const href = links.find(href => href && pattern.test(href))
            if (href && !routes.includes(href)) routes.push(href)
          }
        }
        if (path === '/' || path === '/explore') await page.screenshot({ path: `${output}/${path === '/' ? 'home' : 'explore'}-${width}.png`, fullPage: true })
      } catch (error) { result.errors.push(error.message) }
      results.push(result)
      console.log(JSON.stringify(result))
      await page.close()
    }
    await context.close()
  }
} finally {
  await browser.close()
  writeFileSync(`${output}/live-audit.json`, JSON.stringify(results, null, 2))
}
