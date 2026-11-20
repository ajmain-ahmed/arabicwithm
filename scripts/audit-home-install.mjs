import { chromium, request } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const results = []
const browser = await chromium.launch({ channel: 'chrome' })
const api = await request.newContext({ ignoreHTTPSErrors: true })
for (const url of ['http://127.0.0.1:3077', 'https://www.arabicwithm.com']) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.route(/googletagmanager|youtube\.com|ytimg\.com/, route => route.abort())
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-featured-hero] img, [data-home-hero] img').first().waitFor({ timeout: 15000 }).catch(() => {})
  const head = await page.evaluate(async () => ({
    manifest: document.querySelector('link[rel="manifest"]')?.href,
    appleCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
    themeColor: document.querySelector('meta[name="theme-color"]')?.content,
    appleIcon: document.querySelector('link[rel="apple-touch-icon"]')?.href,
    fonts: [...document.querySelectorAll('link[as="font"]')].map(link => ({ url: link.href, type: link.type, crossOrigin: link.crossOrigin })),
    image: document.querySelector('[data-featured-hero] img')?.currentSrc,
    serviceWorkers: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).map(row => ({ scope: row.scope, script: row.active?.scriptURL })) : [],
    // A fresh profile cannot reveal registrations in a user's existing installation.
    profile: 'fresh browser context',
  }))
  const manifestResponse = await api.get(head.manifest)
  const manifest = await manifestResponse.json()
  const assets = []
  for (const asset of [...head.fonts.map(row => row.url), head.appleIcon, head.image, ...manifest.icons.map(icon => new URL(icon.src, url).href)].filter(Boolean)) {
    const result = await api.get(asset)
    assets.push({ url: asset, status: result.status(), type: result.headers()['content-type'], cache: result.headers()['cache-control'], bytes: (await result.body()).length })
  }
  results.push({ url, status: response.status(), cache: response.headers()['cache-control'], cloudflareCache: response.headers()['cf-cache-status'], age: response.headers().age, ...head, manifest, manifestCache: manifestResponse.headers()['cache-control'], assets })
  if (url.startsWith('http:')) {
    await page.screenshot({ path: 'docs/validation/home-startup/home-mobile.png', fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: 'docs/validation/home-startup/home-desktop.png', fullPage: true })
  }
  await context.close()
}
await browser.close()
await api.dispose()
await mkdir('docs/validation/home-startup', { recursive: true })
await writeFile('docs/validation/home-startup/install-assets.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results.map(({ url, cache, cloudflareCache, fonts, appleCapable, serviceWorkers, assets }) => ({ url, cache, cloudflareCache, fontPreloads: fonts.length, appleCapable, serviceWorkers, assets })), null, 2))
