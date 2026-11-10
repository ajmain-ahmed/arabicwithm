// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/app/lib/durableRateLimit', () => ({ durableRateLimit: async () => ({ ok: true, retryAfterSeconds: 1 }) }))
import { verifyTurnstileToken } from './turnstile'

const SECRET = 'turnstile-test-secret'
const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('TURNSTILE_SECRET_KEY', SECRET)
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('passes through without calling siteverify when Turnstile is not configured', async () => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', '')
  expect((await verifyTurnstileToken('token')).ok).toBe(true)
  expect(fetchMock).not.toHaveBeenCalled()
})
it('logs loudly when the site key is set without the secret', async () => {
  vi.stubEnv('TURNSTILE_SECRET_KEY', '')
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '0x4AAAAAAFycuUYXTMOrDyE9')
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect((await verifyTurnstileToken('token')).ok).toBe(true)
  expect(error).toHaveBeenCalledWith(expect.stringContaining('TURNSTILE_SECRET_KEY is missing'))
  error.mockRestore()
})
it('posts the secret and token to siteverify and accepts a successful verdict', async () => {
  expect((await verifyTurnstileToken('valid-token')).ok).toBe(true)
  expect(fetchMock).toHaveBeenCalledOnce()
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
  expect(init.method).toBe('POST')
  const body = JSON.parse(String(init.body))
  expect(body).toMatchObject({ secret: SECRET, response: 'valid-token' })
  /* siteverify's token parameter is named `response`; a `token` key is
     silently ignored by Cloudflare (missing-input-response). */
  expect(body).not.toHaveProperty('token')
})
it('rejects failed verdicts, bad token shapes, and unreachable siteverify', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }) })
  expect((await verifyTurnstileToken('spent-token')).ok).toBe(false)
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  expect((await verifyTurnstileToken('')).ok).toBe(false)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fetchMock.mockRejectedValue(new Error('network down'))
  expect((await verifyTurnstileToken('valid-token')).ok).toBe(false)
})
