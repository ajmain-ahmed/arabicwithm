// Retain an actual old production document across the release. No production writes.
import { webkit, devices } from '@playwright/test'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
const dir = 'docs/validation/iphone-startup'
await mkdir(dir, { recursive: true })
const browser = await webkit.launch()
const context = await browser.newContext(devices['iPhone 13'])
await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }))
const page = await context.newPage(), failures = []
page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }))
const result = { started: new Date().toISOString(), qualification: 'Retained Windows WebKit document with standalone flag; not a physical installed iPhone app.' }
try {
  await page.goto('https://arabicwithm.com/', { waitUntil: 'domcontentloaded' })
  await page.locator('html[data-awm-hydrated="true"]').waitFor()
  result.oldScripts = await page.locator('script[src]').evaluateAll(scripts => scripts.map(script => script.src))
  console.log('Old production document retained; waiting for verified release.')
  const end = Date.now() + 20 * 60 * 1000
  let ready = false
  while (Date.now() < end) {
    try { ready = JSON.parse(await readFile(`${dir}/release-ready.json`, 'utf8')).ready === true } catch {}
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  if (!ready) throw new Error('Release was not verified before the probe deadline')
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.locator('.MuiDrawer-paper:visible').waitFor({ timeout: 10000 })
  result.retainedMenu = 'PASS'
  await page.keyboard.press('Escape')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('html[data-awm-hydrated="true"]').waitFor()
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.locator('.MuiDrawer-paper:visible').waitFor()
  result.existingContextFreshDocument = 'PASS'
  result.currentRecovery = await page.evaluate(() => Boolean(window.__awmRecoveryInstalled))
} catch (error) { result.error = error.message }
finally {
  result.failures = failures; result.finished = new Date().toISOString()
  await writeFile(`${dir}/retained-deployment.json`, JSON.stringify(result, null, 2))
  await browser.close()
  console.log(JSON.stringify(result))
}
