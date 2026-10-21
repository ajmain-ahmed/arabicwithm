import { test, expect } from '@playwright/test'

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`compact app CTA and paired official badges at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    const section = page.locator('#download-app')
    await expect(section.getByLabel('Email address')).toBeVisible()
    await expect(section.getByRole('checkbox')).toHaveCount(0)
    await expect(section.getByRole('button', { name: 'Email me once the app launches', exact: true })).toBeEnabled()
    const apple = section.getByRole('img', { name: 'Download on the App Store', exact: true })
    const google = section.getByRole('img', { name: 'Get it on Google Play', exact: true })
    const art = await Promise.all([apple, google].map(image => image.evaluate(async (element: HTMLImageElement) => {
      await element.decode()
      const canvas = document.createElement('canvas'); canvas.width = element.naturalWidth; canvas.height = element.naturalHeight
      const context = canvas.getContext('2d')!; context.drawImage(element, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      let top = canvas.height, bottom = 0
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4 + 3] > 200) { top = Math.min(top, y); bottom = Math.max(bottom, y + 1) }
      const box = element.getBoundingClientRect(), wrapper = element.parentElement!.getBoundingClientRect()
      return { height: (bottom - top) / canvas.height * box.height, centre: box.y + (top + bottom) / 2 / canvas.height * box.height, wrapper: { x: wrapper.x, y: wrapper.y, width: wrapper.width, height: wrapper.height } }
    })))
    expect(Math.abs(art[0].height - art[1].height)).toBeLessThan(1)
    expect(art[0].wrapper.width).toBe(art[1].wrapper.width)
    expect(art[0].wrapper.height).toBe(art[1].wrapper.height)
    if (width >= 390) expect(Math.abs(art[0].centre - art[1].centre)).toBeLessThan(1)
    const box = await section.boundingBox()
    expect(box!.height).toBeLessThan(width < 900 ? 650 : 500)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await section.screenshot({ path: `test-results/cleanup-app-${width}.png` })
  })
}

for (const width of [390, 1440]) {
  test(`transcript settings remain functional in the responsive control group at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/explore')
    await page.getByRole('button', { name: 'For You feed', exact: true }).click()
    await expect(page.getByText('book', { exact: true }).first()).toBeVisible()
    const settings = page.getByRole('button', { name: 'Transcript settings', exact: true })
    const bounds = await settings.boundingBox()
    expect(bounds!.width).toBe(bounds!.height)
    if (width >= 900) {
      const controls = await Promise.all(['Explore feed', 'For You feed'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()))
      for (const control of controls) expect(Math.abs(control!.y + control!.height / 2 - bounds!.y - bounds!.height / 2)).toBeLessThan(1)
      expect(bounds!.x).toBeGreaterThan(controls[1]!.x + controls[1]!.width)
    }
    await settings.click()
    const dialog = page.getByRole('dialog')
    const switches = dialog.getByRole('switch')
    await expect(switches).toHaveCount(3)
    for (const control of await switches.all()) await expect(control).toBeChecked()
    await dialog.getByLabel('Inline word meanings').uncheck()
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(page.getByText('book', { exact: true })).toHaveCount(0)
    await settings.click()
    await expect(dialog.getByLabel('Inline word meanings')).not.toBeChecked()
    await dialog.getByLabel('Inline word meanings').check()
    await dialog.getByLabel('Tashkīl').uncheck()
    await dialog.getByLabel('English sentence').uncheck()
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(page.getByText('book', { exact: true }).first()).toBeVisible()
    await expect(page.locator('[lang="ar"]').first()).toHaveText('كتاب')
    await expect(page.getByText('A book.', { exact: true })).toHaveCount(0)
    await page.screenshot({ path: `test-results/cleanup-settings-${width}.png`, fullPage: true })
  })
}

test.describe('fine pointer book hover', () => {
  test.use({ hasTouch: false })
  test('gentle shadow pulse, stable grid and static reduced-motion glow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/books')
    const card = page.getByRole('region', { name: 'Book library', exact: true }).getByRole('link').first()
    const before = await card.boundingBox()
    await card.hover()
    const style = await card.evaluate(element => { const s = getComputedStyle(element); return { animation: s.animationName, duration: s.animationDuration, shadow: s.boxShadow } })
    expect(style.animation).toBe('awm-book-breathe'); expect(style.duration).toBe('2s')
    expect(style.shadow).not.toBe('none')
    await page.waitForTimeout(1100)
    expect(await card.boundingBox()).toEqual(before)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
    expect(await card.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none')
    await page.getByRole('button', { name: 'Listen', exact: true }).click()
    const listen = page.getByRole('region', { name: 'Audiobook library' }).getByRole('link').first()
    await listen.hover()
    expect(await listen.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(() => listen.evaluate(element => getComputedStyle(element).animationName)).toBe('awm-book-breathe')
  })
})

test('touch book cards stay still', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/books')
  const card = page.getByRole('region', { name: 'Book library', exact: true }).getByRole('link').first()
  await card.hover()
  expect(await card.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
})
