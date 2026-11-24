// @vitest-environment node
// Opt-in, read-only verification of the real data path. This does not certify browser sign-in.
import { expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@/app/actions/auth', () => ({ guardAdmin: vi.fn() }))
import { fetchPhrasePageForAdmin } from './admin'

it.skipIf(process.env.AWM_VERIFY_PHRASE_CORPUS !== '1')('reads real canonical pages and unvocalised Arabic search without writes', async () => {
  process.loadEnvFile('.env.local')
  const pages = []
  let total = 0
  for (let page = 0; page < 3; page++) {
    const result = await fetchPhrasePageForAdmin({ page })
    total = result.total
    expect(result.phrases.length).toBeLessThanOrEqual(50)
    pages.push(...result.phrases)
  }
  expect(total).toBe(130)
  expect(pages).toHaveLength(total)
  expect(new Set(pages.map(row => row.id)).size).toBe(total)
  expect(pages.filter(row => row.word_glosses?.length)).toHaveLength(118)
  const arabic = await fetchPhrasePageForAdmin({ search: 'على' })
  expect(arabic.total).toBeGreaterThan(0)
  expect(arabic.phrases.some(row => row.id === 1)).toBe(true)
  const english = await fetchPhrasePageForAdmin({ search: 'immediately' })
  expect(english.phrases.some(row => row.id === 1)).toBe(true)
}, 60000)
