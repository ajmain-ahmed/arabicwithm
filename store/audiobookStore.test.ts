import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@/app/actions/audiobooks', () => ({ saveAudioProgress: mocks.save }))
import { useAudiobookStore } from './audiobookStore'

const playback = { sourceType: 'supabase_storage' as const, url: 'https://example.test/signed', expiresIn: 900, positionSeconds: 12, timings: null }

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  useAudiobookStore.setState({ session: null, playbackCache: {}, progressOutbox: {} })
  mocks.save.mockResolvedValue(undefined)
})

it('reuses unexpired playback with the latest session position', () => {
  const store = useAudiobookStore.getState()
  store.cachePlayback('user', 'chapter', 'ar', playback, Date.now() + 10000)
  store.recordProgress('user', 'chapter', 'ar', 42, false)
  expect(useAudiobookStore.getState().readCachedPlayback('user', 'chapter', 'ar')?.playback.positionSeconds).toBe(42)
  expect(useAudiobookStore.getState().readCachedPlayback('other', 'chapter', 'ar')).toBeNull()
})

it('expires cached signed URLs without persisting them', () => {
  useAudiobookStore.getState().cachePlayback('user', 'chapter', 'ar', playback, Date.now() - 1)
  expect(useAudiobookStore.getState().readCachedPlayback('user', 'chapter', 'ar')).toBeNull()
  expect(window.localStorage.getItem('awm-audiobook-progress-v1') ?? '').not.toContain('example.test')
})

it('keeps failed progress in the outbox and removes it only after a successful flush', async () => {
  const updatedAt = useAudiobookStore.getState().recordProgress('user', 'chapter', 'en', 24, false)
  expect(JSON.parse(window.localStorage.getItem('awm-audiobook-progress-v1') ?? '{}').state.progressOutbox).toHaveProperty('user:chapter:en')
  mocks.save.mockRejectedValueOnce(new Error('offline'))
  await useAudiobookStore.getState().flushProgressOutbox()
  expect(Object.keys(useAudiobookStore.getState().progressOutbox)).toHaveLength(1)
  await useAudiobookStore.getState().flushProgressOutbox()
  expect(useAudiobookStore.getState().progressOutbox).toEqual({})
  useAudiobookStore.getState().recordProgress('user', 'chapter', 'en', 48, false)
  useAudiobookStore.getState().markProgressSynced('user', 'chapter', 'en', updatedAt)
  expect(Object.keys(useAudiobookStore.getState().progressOutbox)).toHaveLength(1)
})
