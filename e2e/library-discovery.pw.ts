import { expect, test } from '@playwright/test'

test('mobile library renders one responsive catalogue and omits search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/books')
  const library = page.getByRole('region', { name: 'All Books', exact: true })
  await expect(library).toBeVisible()
  await expect(library.locator('a')).toHaveCount(6)
  await expect(page.locator('[data-mobile-read-sections]')).toHaveCount(0)
  await expect(library.locator('img').first()).toHaveAttribute('srcset', /(?:-640\.webp|w=640) 640w/)

  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toHaveCount(0)

  await page.goto('/explore')
  await expect(page.getByRole('heading', { name: 'Explore Arabic', exact: true })).toHaveCount(1)
})

test('desktop navigation omits unified search', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Search ArabicWithM', exact: true })).toHaveCount(0)
})
