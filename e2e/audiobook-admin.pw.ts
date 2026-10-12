import { test, expect, type Page, type BrowserContext } from '@playwright/test'

async function admin(context: BrowserContext) {
  const id = '44444444-4444-4444-8444-444444444444', expires = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', exp: expires, role: 'authenticated' })}.fixture-signature`
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'admin@fixture.example', app_metadata: { provider: 'email' }, user_metadata: {} }
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: `base64-${encode({ access_token, refresh_token: 'fixture-refresh', expires_at: expires, expires_in: 3600, token_type: 'bearer', user })}`, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }])
}

async function open(page: Page) {
  await page.goto('/admin/books')
  const book = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Test Book', exact: true }) })
  await book.getByRole('button').first().click()
  const chapter = page.getByRole('row', { name: '1 First Chapter chapter-1', exact: true })
  await chapter.getByRole('button').click()
  await page.getByRole('tab', { name: 'Audiobook', exact: true }).click()
  await expect(page.getByLabel('Arabic Audio path or URL')).toBeVisible()
}

async function plays(page: Page, language: string) {
  await page.getByRole('button', { name: `Preview ${language} audio`, exact: true }).click()
  const audio = page.locator('fieldset').filter({ has: page.getByText(`${language} Audiobook`, { exact: true }) }).locator('audio')
  await expect(audio).toBeVisible()
  await audio.evaluate(async (element: HTMLAudioElement) => { await element.play() })
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0)
}

test.beforeEach(async ({ context }) => { await admin(context) })

test('both languages: relative/full paths persist after reopening and refresh, with playable private audio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  for (const [language, path] of [['Arabic', 'audiobooks/fixture/ar/chapter.wav'], ['English', 'https://localhost:4310/storage/v1/object/sign/audiobooks/fixture/en/chapter.wav?token=discard-me'], ['Arabic', 'https://localhost:4310/storage/v1/object/sign/audiobooks/fixture/ar/chapter.wav?token=discard-me'], ['English', 'fixture/en/chapter.wav']]) {
    await page.getByLabel(`${language} Audio path or URL`).fill(path)
    await page.getByRole('button', { name: `Save ${language} audio`, exact: true }).click()
    await expect(page.locator('fieldset').filter({ has: page.getByText(`${language} Audiobook`, { exact: true }) }).getByRole('status')).toHaveText('Audio saved')
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await open(page)
  await expect(page.getByLabel('Arabic Audio path or URL')).toHaveValue('audiobooks/fixture/ar/chapter.wav')
  await expect(page.getByLabel('English Audio path or URL')).toHaveValue('audiobooks/fixture/en/chapter.wav')
  await plays(page, 'Arabic'); await plays(page, 'English')
})

test('direct uploads save automatically; failure/retry preserves inputs and the other language', async ({ page, request, context }) => {
  await open(page)
  const english = await page.getByLabel('English Audio path or URL').inputValue()
  const bytes = Buffer.alloc(2 * 1024 * 1024)
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40)
  let failed = true
  await page.route('**/storage/v1/object/upload/sign/**', async route => {
    if (route.request().method() !== 'PUT') return route.continue()
    if (failed) { failed = false; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated storage failure' }) }) }
    await route.continue()
  })
  await page.getByLabel('Arabic Audio file').setInputFiles({ name: 'chapter.wav', mimeType: 'audio/wav', buffer: bytes })
  await expect(page.getByRole('button', { name: 'Retry Arabic audio' })).toBeVisible()
  await expect(page.getByLabel('English Audio path or URL')).toHaveValue(english)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 20, downloadThroughput: 10 * 1024 * 1024, uploadThroughput: 256 * 1024 })
  await page.getByRole('button', { name: 'Retry Arabic audio' }).click()
  await expect.poll(async () => Number(await page.getByRole('progressbar', { name: 'Arabic audio upload progress' }).getAttribute('aria-valuenow'))).toBeGreaterThan(0)
  await expect(page.getByLabel('Arabic Audio path or URL')).toHaveValue(/audiobooks\/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\/ar\/.+\.wav/)
  await expect(page.getByRole('group', { name: 'Arabic Audiobook', exact: true }).getByRole('status')).toHaveText('Audio saved')
  await expect(page.getByRole('progressbar', { name: 'Arabic audio upload progress' })).toHaveAttribute('aria-valuenow', '100')
  const arabic = await page.getByLabel('Arabic Audio path or URL').inputValue()
  await page.getByLabel('English Audio file').setInputFiles({ name: 'chapter.wav', mimeType: 'audio/wav', buffer: bytes })
  await expect.poll(async () => Number(await page.getByRole('progressbar', { name: 'English audio upload progress' }).getAttribute('aria-valuenow'))).toBeGreaterThan(0)
  await expect(page.getByRole('group', { name: 'English Audiobook', exact: true }).getByRole('status')).toHaveText('Audio saved')
  await expect(page.getByRole('progressbar', { name: 'English audio upload progress' })).toHaveAttribute('aria-valuenow', '100')
  await expect(page.getByLabel('Arabic Audio path or URL')).toHaveValue(arabic)
  const savedEnglish = await page.getByLabel('English Audio path or URL').inputValue()
  await plays(page, 'Arabic'); await plays(page, 'English')
  await request.post('https://localhost:4310/fixture/audio-save-failure', { data: { fail: true } })
  await page.getByLabel('Arabic Audio path or URL').fill('audiobooks/fixture/ar/chapter.wav')
  await page.getByRole('button', { name: 'Save Arabic audio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry Arabic audio' })).toBeVisible()
  await expect(page.getByLabel('Arabic Audio path or URL')).toHaveValue('audiobooks/fixture/ar/chapter.wav')
  await request.post('https://localhost:4310/fixture/audio-save-failure', { data: { fail: false } })
  await page.getByRole('button', { name: 'Retry Arabic audio' }).click()
  await expect(page.getByRole('group', { name: 'Arabic Audiobook', exact: true }).getByRole('status')).toHaveText('Audio saved')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await open(page)
  await expect(page.getByLabel('English Audio path or URL')).toHaveValue(savedEnglish)
  await plays(page, 'Arabic'); await plays(page, 'English')
})
