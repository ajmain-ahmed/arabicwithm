export const WORD_TAP_SEEK_STORAGE_KEY = 'awm-watch-word-tap-seek-v1'
export const WORD_TAP_SEEK_CHANGE_EVENT = 'awm-watch-word-tap-seek-change'

let inMemoryWordTapSeek = false

export function parseWordTapSeekPreference(value: string | null): boolean {
  return value === 'true'
}

export function getWordTapSeekPreference(): boolean {
  if (typeof window === 'undefined') return inMemoryWordTapSeek
  try {
    const preference = parseWordTapSeekPreference(window.localStorage.getItem(WORD_TAP_SEEK_STORAGE_KEY))
    inMemoryWordTapSeek = preference
    return preference
  } catch {
    return inMemoryWordTapSeek
  }
}

export function setWordTapSeekPreference(enabled: boolean): void {
  inMemoryWordTapSeek = enabled
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WORD_TAP_SEEK_STORAGE_KEY, String(enabled))
  } catch {
    // The preference still applies for the current session when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(WORD_TAP_SEEK_CHANGE_EVENT, { detail: enabled }))
}

export function subscribeToWordTapSeekPreference(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handleStorage = (event: StorageEvent) => {
    if (event.key === WORD_TAP_SEEK_STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(WORD_TAP_SEEK_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(WORD_TAP_SEEK_CHANGE_EVENT, onChange)
  }
}
