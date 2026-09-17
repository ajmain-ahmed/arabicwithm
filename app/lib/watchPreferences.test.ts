import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getWordTapSeekPreference,
  parseWordTapSeekPreference,
  setWordTapSeekPreference,
  subscribeToWordTapSeekPreference,
  WORD_TAP_SEEK_STORAGE_KEY,
} from './watchPreferences'

describe('word-tap video seeking preference', () => {
  beforeEach(() => window.localStorage.clear())

  it('defaults to off and only enables an explicit saved true value', () => {
    expect(parseWordTapSeekPreference(null)).toBe(false)
    expect(parseWordTapSeekPreference('false')).toBe(false)
    expect(parseWordTapSeekPreference('true')).toBe(true)
    expect(getWordTapSeekPreference()).toBe(false)
  })

  it('persists across reads and notifies active settings consumers', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToWordTapSeekPreference(onChange)

    setWordTapSeekPreference(true)
    expect(window.localStorage.getItem(WORD_TAP_SEEK_STORAGE_KEY)).toBe('true')
    expect(getWordTapSeekPreference()).toBe(true)
    expect(onChange).toHaveBeenCalledOnce()

    unsubscribe()
  })
})
