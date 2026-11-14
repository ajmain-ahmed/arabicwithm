import { test, expect } from '@playwright/test'

for (const width of [320, 390, 430, 768, 1024, 1440]) {
  test(`daily Phrase placement and wrapping at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    const card = page.getByRole('region', { name: 'Phrase of the Day', exact: true })
    if (width >= 600) {
      await expect(card).toBeHidden()
      return
    }
    await expect(card).toBeVisible()
    await card.scrollIntoViewIfNeeded()
    await expect(
      card.getByText('We belong to God and to Him we return.', { exact: true }),
    ).toBeVisible()
    const actions = page.getByRole('navigation', { name: 'Quick Actions', exact: true })
    const bounds = await card.boundingBox()
    expect(bounds!.y).toBeGreaterThanOrEqual(
      (await actions.boundingBox())!.y + (await actions.boundingBox())!.height,
    )
    const gloss = card.getByText('belong to God', { exact: true })
    await expect(gloss).toBeVisible()
    const word = gloss.locator('..').locator('[lang="ar"]')
    expect((await gloss.boundingBox())!.y).toBeGreaterThan((await word.boundingBox())!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/daily-phrase-${width}.png`, fullPage: true })
    const arabic = await card.locator('[lang="ar"]').first().textContent()
    await page.reload()
    await expect(card.locator('[lang="ar"]').first()).toHaveText(arabic!)
    await page.setViewportSize({ width: width === 320 ? 430 : 320, height: 1000 })
    await expect(card.locator('[lang="ar"]').first()).toHaveText(arabic!)
  })
}
