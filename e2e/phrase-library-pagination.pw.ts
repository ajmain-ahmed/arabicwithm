import { test, expect } from '@playwright/test'
for (const width of [390, 1440]) test(`Phrase Library paginates, searches and edits 2501 rows at ${width}px`, async ({ page, context }, info) => {
  const expires = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const user = { id: '44444444-4444-4444-8444-444444444444', aud: 'authenticated', role: 'authenticated', email: 'admin@fixture.example', app_metadata: { provider: 'email' }, user_metadata: {} }
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/admin/phrases')
  await expect(page.getByText('2,501 phrases', { exact: true })).toBeVisible()
  await expect(page.getByText('Reusable expression number 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Reusable expression number 51', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Go to next page' }).click()
  await expect(page.getByText('Reusable expression number 51', { exact: true })).toBeVisible()
  await expect(page.getByText('Reusable expression number 1', { exact: true })).toHaveCount(0)
  const original = `Unique ${info.project.name} ${width} expression`
  await page.getByLabel('Search phrases').fill(original)
  await expect(page.getByText('1 phrase', { exact: true })).toBeVisible()
  await expect(page.getByText(original, { exact: true })).toBeVisible()
  if (width < 900) await page.getByText(original, { exact: true }).click()
  else await page.getByRole('button', { name: 'View phrase details' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Word glosses', { exact: true })).toBeVisible()
  await expect(dialog.getByText('ʿalā l-fawr', { exact: true })).toBeVisible()
  await expect(dialog.getByText('B1', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Edit phrase', exact: true }).click()
  const meaning = `Updated fixture ${info.project.name} ${width}`
  await dialog.locator('input').nth(2).fill(meaning)
  await dialog.locator('input').nth(2).press('Tab')
  await dialog.getByRole('button', { name: 'Finish editing phrase' }).click()
  await expect(dialog.getByText(meaning, { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByLabel('Search phrases').fill(meaning)
  await expect(page.getByText(meaning, { exact: true })).toBeVisible()
  await page.reload()
  await page.getByLabel('Search phrases').fill('على')
  await expect(page.getByText('2,501 phrases', { exact: true })).toBeVisible()
  await page.screenshot({ path: `test-results/phrase-library-${info.project.name}-${width}.png` })
})
