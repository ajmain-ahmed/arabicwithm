import { test, expect } from '@playwright/test'

test('mobile and desktop share server-selected home order across refreshes', async ({ page }) => {
  const orders: Record<string, string[]> = {}
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    for (const section of ['Shows', 'Books', 'Latest Episodes']) {
      const row = page.getByLabel(section, { exact: true })
      await expect(async () => {
        await expect(row).toBeVisible()
        await row.scrollIntoViewIfNeeded()
      }).toPass()
      await expect(row.locator('a').first()).toBeVisible()
      const links = await row.locator('a').evaluateAll(elements => elements.map(element => element.getAttribute('href')!))
      if (orders[section]) expect(links).toEqual(orders[section])
      else orders[section] = links
    }
    await page.reload()
    for (const section of ['Shows', 'Books', 'Latest Episodes']) {
      const row = page.getByLabel(section, { exact: true })
      await expect(async () => {
        await expect(row).toBeVisible()
        await row.scrollIntoViewIfNeeded()
      }).toPass()
      await expect(row.locator('a').first()).toBeVisible()
      expect(await row.locator('a').evaluateAll(elements => elements.map(element => element.getAttribute('href')!))).toEqual(orders[section])
    }
  }
})
