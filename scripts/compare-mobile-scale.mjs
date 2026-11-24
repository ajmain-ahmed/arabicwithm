import { chromium, firefox, webkit } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const output = 'artifacts/phrase-restore/mobile'
await mkdir(output, { recursive: true })
const results = []
for (const [name, type, options] of [['webkit', webkit, {}], ['chrome', chromium, { channel: 'chrome' }], ['firefox', firefox, {}], ['edge', chromium, { channel: 'msedge' }]]) {
  const browser = await type.launch({ headless: true, ...options })
  try {
    for (const width of [320, 375, 390, 414, 430, 768, 1024, 1440]) {
      const versions = {}
      for (const [version, port] of [['before', 3062], ['after', 3061]]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true, reducedMotion: 'reduce',
          ...(name === 'webkit' && width < 600 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}) })
        const page = await context.newPage()
        await page.goto(`http://127.0.0.1:${port}/`)
        await page.locator('[data-featured-hero]').first().waitFor()
        if (width < 600) await page.getByRole('heading', { name: 'Quick Actions', exact: true }).waitFor()
        await page.evaluate(() => document.fonts.ready)
        versions[version] = await page.evaluate(() => {
          const style = element => {
            if (!element) return null
            const css = getComputedStyle(element), rect = element.getBoundingClientRect()
            return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height,
              font: css.fontFamily, size: css.fontSize, lineHeight: css.lineHeight, padding: css.padding,
              margin: css.margin, gap: css.gap, display: css.display }
          }
          const phrase = document.querySelector('section[aria-labelledby="daily-phrase-title"]')
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            root: getComputedStyle(document.documentElement).fontSize,
            adjust: getComputedStyle(document.documentElement).getPropertyValue('-webkit-text-size-adjust'),
            viewport: document.querySelector('meta[name="viewport"]').content,
            featured: style(document.querySelector('[data-featured-hero]')),
            featuredFrame: style(document.querySelector('[data-featured-hero] > div')),
            quickActions: style(document.querySelector('nav[aria-label="Quick Actions"]')),
            navbar: style(document.querySelector('[data-navbar-mobile]')),
            buttons: [...document.querySelectorAll('[data-featured-hero] button,[data-featured-hero] a.MuiButton-root,nav[aria-label="Quick Actions"] a')].map(style),
            phrase: style(phrase), phraseAlign: phrase ? getComputedStyle(phrase).textAlign : null,
            glossAlign: phrase?.querySelector('[dir="rtl"]:not(p)') ? getComputedStyle(phrase.querySelector('[dir="rtl"]:not(p)')).justifyContent : null }
        })
        if ([375, 390, 414, 430, 1440].includes(width)) {
          await page.evaluate(() => scrollTo(0, 0))
          await page.screenshot({ path: `${output}/${name}-${width}-${version}-top.png` })
          if (width < 600) {
            await page.locator('section[aria-labelledby="daily-phrase-title"]').scrollIntoViewIfNeeded()
            await page.screenshot({ path: `${output}/${name}-${width}-${version}-phrase.png` })
          }
        }
        if (version === 'after' && width < 600) {
          assert.equal(versions[version].phraseAlign, 'center')
          assert.equal(versions[version].glossAlign, 'center')
          const rtl = await page.locator('section[aria-labelledby="daily-phrase-title"] [lang="ar"]').first().getAttribute('dir')
          assert.equal(rtl, 'rtl')
        }
        assert.ok(versions[version].scrollWidth <= width, `${name} ${width} overflow`)
        await context.close()
      }
      // Phrase alignment is intentionally changed; compare the earlier Homepage proportions.
      for (const key of ['root', 'viewport', 'featured', 'featuredFrame', 'quickActions', 'navbar', 'buttons'])
        assert.deepEqual(versions.after[key], versions.before[key], `${name} ${width} ${key}`)
      results.push({ name, width, ...versions, comparison: 'identical layout metrics outside requested Phrase alignment' })
      await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
      console.log(name, width, 'PASS')
    }
  } finally { await browser.close() }
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
