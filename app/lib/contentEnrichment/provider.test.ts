// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { analysisProviderConfigured, requestGrammar } from './provider'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('reports missing configuration without making a model request', async () => {
  vi.stubEnv('CONTENT_ANALYSIS_URL', '')
  vi.stubEnv('CONTENT_ANALYSIS_TOKEN', '')
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(analysisProviderConfigured()).toBe(false)
  expect(await requestGrammar([], 'request')).toBeNull()
  expect(fetch).not.toHaveBeenCalled()
})

it('requires HTTPS before sending the server credential', async () => {
  vi.stubEnv('CONTENT_ANALYSIS_URL', 'http://provider.example/analyse')
  vi.stubEnv('CONTENT_ANALYSIS_TOKEN', 'test-only-token')
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  await expect(requestGrammar([], 'request')).rejects.toThrow('configuration_invalid')
  expect(fetch).not.toHaveBeenCalled()
})

it('sends bounded authenticated requests with an idempotency key and prevents redirects', async () => {
  vi.stubEnv('CONTENT_ANALYSIS_URL', 'https://provider.example/analyse')
  vi.stubEnv('CONTENT_ANALYSIS_TOKEN', 'test-only-token')
  const fetch = vi.fn().mockResolvedValue(new Response('{"notes":[]}'))
  vi.stubGlobal('fetch', fetch)
  expect(await requestGrammar([], 'source-hash')).toEqual({ notes: [] })
  const options = fetch.mock.calls[0][1] as RequestInit
  expect(options.redirect).toBe('error')
  expect(options.signal).toBeInstanceOf(AbortSignal)
  expect(options.headers).toMatchObject({
    Authorization: 'Bearer test-only-token',
    'Idempotency-Key': 'source-hash',
  })
  expect(JSON.parse(String(options.body))).toMatchObject({
    task: 'awm-grammar-v1',
    requestId: 'source-hash',
    units: [],
  })
})

it('rejects provider errors and oversized output before analysis persistence', async () => {
  vi.stubEnv('CONTENT_ANALYSIS_URL', 'https://provider.example/analyse')
  vi.stubEnv('CONTENT_ANALYSIS_TOKEN', 'test-only-token')
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(new Response('x'.repeat(200001)))
  vi.stubGlobal('fetch', fetch)
  await expect(requestGrammar([], 'request')).rejects.toThrow('provider_unavailable')
  await expect(requestGrammar([], 'request')).rejects.toThrow('response_too_large')
})
