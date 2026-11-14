import { test, expect, type BrowserContext } from '@playwright/test'
async function signIn(context: BrowserContext, role = 'admin') {
  const id =
    role === 'admin'
      ? '44444444-4444-4444-8444-444444444444'
      : role === 'editor'
        ? '33333333-3333-4333-8333-333333333333'
        : '11111111-1111-4111-8111-111111111111'
  const expires = Math.floor(Date.now() / 1000) + 3600,
    encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url'),
    user = {
      id,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${role}@fixture.example`,
      app_metadata: { provider: 'email' },
      user_metadata: {},
    }
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  await context.addCookies([
    {
      name: 'sb-localhost-auth-token',
      value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`,
      domain: '127.0.0.1',
      path: '/',
      sameSite: 'Lax',
    },
  ])
}
for (const width of [320, 390, 430, 768, 1024, 1440])
  test(`Grammar Notes review and provenance fit ${width}px`, async ({ page, context }) => {
    await signIn(context)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/admin/grammar-notes')
    await expect(page.getByRole('heading', { name: 'Grammar Notes', exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'A governing adjective', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(/Configure the server-side analysis provider to enable/),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Inspect / Edit' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('mark:visible')).toHaveText('جَمِيلٌ لَوْنُهَا')
    await expect(dialog.getByText('Test Book → First Chapter', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Open source' })).toHaveAttribute(
      'href',
      '/admin/books/preview/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    )
    await expect(dialog.getByText(/Example B2/).filter({ visible: true })).toBeVisible()
    await expect(dialog.getByLabel('Rule CEFR')).toContainText('C1')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/grammar-note-review-${width}.png`, fullPage: true })
    await dialog.locator('details summary').click()
    await expect(dialog.locator('article')).toBeVisible()
    await expect(dialog.locator('article')).toContainText('subject (فَاعِلٌ)')
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  })
test('Admin can filter, edit, approve, reject, merge, scan and retry', async ({
  page,
  context,
}) => {
  await signIn(context)
  await page.goto('/admin/grammar-notes')
  await page.getByLabel('CEFR', { exact: true }).click()
  await page.getByRole('option', { name: 'C2', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'A governing adjective', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Inspect / Edit' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Highlighted source structure').fill('زَيْدًا')
  await dialog
    .getByLabel('Example explanation', { exact: true })
    .fill('The verb governs this direct object.')
  await dialog.getByRole('button', { name: 'Save example', exact: true }).click()
  await expect(dialog.locator('mark:visible')).toHaveText('زَيْدًا')
  await dialog.getByRole('button', { name: 'Reject example', exact: true }).click()
  await expect(dialog.getByText('Example review rejected', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Approve example', exact: true }).click()
  await expect(dialog.getByText('Example review approved', { exact: true })).toBeVisible()
  await dialog
    .getByLabel('Learner explanation')
    .fill(
      'A fronted noun is resumed by a pronoun on the verb. Trace the pronoun to see how الِاشْتِغَالُ links the two parts.',
    )
  await dialog.getByLabel('Mechanics', { exact: true }).fill('The verb governs its direct object.')
  await dialog.getByLabel('Recognition tip').fill('Trace the attached pronoun.')
  await dialog.getByLabel('Transformations (one per line)').fill('قَرَأَ → الْكِتَابَ')
  await dialog
    .getByLabel('Related rule IDs (comma separated)')
    .fill('12345678-1234-4123-8123-123456789001')
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByLabel('Status', { exact: true }).click()
  await page.getByRole('option', { name: 'Approved', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: /A fronted noun.*resumed by a pronoun/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Inspect / Edit' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Reject', exact: true }).click()
  await page.getByLabel('Status', { exact: true }).click()
  await page.getByRole('option', { name: 'Rejected', exact: true }).click()
  await page.getByRole('button', { name: 'Inspect / Edit' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Merge into rule ID').fill('12345678-1234-4123-8123-123456789001')
  await dialog.getByRole('button', { name: 'Merge into this rule', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Scan New / Unprocessed Content', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText('Checked 4 sources')
  await page.getByRole('button', { name: 'Scan Existing Content', exact: true }).click()
  await expect(page.getByRole('alert').first()).toContainText('Queued 8 analyser jobs')
  await page.getByRole('button', { name: 'Retry enrichment', exact: true }).click()
  await expect(page.getByText(/First Chapter · chapter · grammar · queued/)).toBeVisible()
})
for (const role of ['guest', 'user', 'editor'])
  test(`${role} cannot access Grammar Notes`, async ({ page, context }) => {
    if (role !== 'guest') await signIn(context, role)
    await page.goto('/admin/grammar-notes')
    await expect(page).not.toHaveURL(/\/admin\/grammar-notes/)
    await expect(
      page.getByRole('button', { name: 'Scan Existing Content', exact: true }),
    ).toHaveCount(0)
  })

test('existing manual Phrase edits persist through the canonical writer', async ({
  page,
  context,
}) => {
  await signIn(context)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/admin/phrases')
  const row = page.locator('tbody tr').first()
  await expect(row).toContainText('In fact')
  await row.getByRole('button').click()
  await row.getByRole('textbox').nth(2).fill('Indeed, in fact')
  await row.getByRole('textbox').nth(2).blur()
  await page.getByRole('heading', { name: 'Phrases', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('tbody tr').first()).toContainText('Indeed, in fact')
  await expect(page.locator('tbody tr').first()).toContainText('Curated note')
})
