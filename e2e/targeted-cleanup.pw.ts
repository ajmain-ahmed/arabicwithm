import { test, expect } from '@playwright/test'
import {installYouTubeFixture} from './helpers/youtube'
test.beforeEach(async({page})=>{await installYouTubeFixture(page)})


for (const width of [320, 390, 768, 1440, 1920]) {
  test(`restored QR app CTA at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    const section = page.locator('#download-app')
    await expect(section.getByLabel('Email address')).toHaveCount(0)
    await expect(section.getByRole('img', {name:'QR code placeholder'})).toBeVisible()
    await expect(section.getByRole('link', {name:/App Store/})).toBeVisible()
    await expect(section.getByRole('link', {name:/Google Play/})).toBeVisible()
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
    const settings = page.getByRole('button', { name: 'Settings', exact: true })
    const bounds = await settings.boundingBox()
    expect(bounds!.width).toBe(bounds!.height)
    if (width >= 900) {
      const controls = await Promise.all(['Explore feed', 'For You feed'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()))
      for (const control of controls) expect(control!.y).toBeLessThan(bounds!.y)
      expect(Math.abs(bounds!.x-controls[1]!.x)).toBeLessThan(4)
    }
    await settings.click()
    const dialog = page.getByRole('heading',{name:'Settings',exact:true}).locator('..')
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
  test('gentle scale, stable grid and static reduced-motion glow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/books')
    const card = page.getByRole('region', { name: 'Book library', exact: true }).getByRole('link').first()
    const before = await card.evaluate(el=>({width:(el as HTMLElement).offsetWidth,top:(el as HTMLElement).offsetTop}))
    await card.hover()
    const style = await card.evaluate(element => { const s = getComputedStyle(element); return { animation: s.animationName, duration: s.animationDuration, shadow: s.boxShadow } })
    expect(style.animation).toBe('none'); expect(await card.evaluate(el=>getComputedStyle(el).transform)).not.toBe('none')
    expect(style.shadow).not.toBe('none')
    await page.waitForTimeout(1100)
    expect(await card.evaluate(el=>({width:(el as HTMLElement).offsetWidth,top:(el as HTMLElement).offsetTop}))).toEqual(before)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
    expect(await card.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none')
    await page.getByRole('button', { name: 'Listen', exact: true }).click()
    const listen = page.getByRole('region', { name: 'Audiobook library' }).getByRole('link').first()
    await listen.hover()
    expect(await listen.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(() => listen.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
  })
})

test('touch book cards stay still', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/books')
  const card = page.getByRole('region', { name: 'Book library', exact: true }).getByRole('link').first()
  await card.hover()
  expect(await card.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
})
