export const EXPLORE_AUDIO_STORAGE_KEY = 'awm-explore-sound-enabled-v1'
export const EXPLORE_AUDIO_EVENT = 'awm-explore-sound-preference-change'
export const EXPLORE_READING_DURATION_MS = 10_000

let inMemorySoundPreference: boolean | null = null

export interface ExploreDefinitionEntry {
  arabic: string
  plain?: string
  headword?: string
  lemma?: string
  entry_type?: 'word' | 'phrase'
}

export function parseExploreSoundPreference(value: string | null): boolean {
  return value !== 'muted'
}

export function getExploreSoundPreference(): boolean {
  if (typeof window === 'undefined') return inMemorySoundPreference ?? true
  try {
    const preference = parseExploreSoundPreference(window.localStorage.getItem(EXPLORE_AUDIO_STORAGE_KEY))
    inMemorySoundPreference = preference
    return preference
  } catch {
    return inMemorySoundPreference ?? true
  }
}

export function setExploreSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return
  inMemorySoundPreference = enabled
  try {
    window.localStorage.setItem(EXPLORE_AUDIO_STORAGE_KEY, enabled ? 'sound' : 'muted')
  } catch {
    // The current Explore session still keeps the preference in React state.
  }
  window.dispatchEvent(new CustomEvent(EXPLORE_AUDIO_EVENT, { detail: enabled }))
}

export function subscribeToExploreSoundPreference(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handleStorage = (event: StorageEvent) => {
    if (event.key === EXPLORE_AUDIO_STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(EXPLORE_AUDIO_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(EXPLORE_AUDIO_EVENT, onChange)
  }
}

export function definitionCacheKey(context: string, entry: ExploreDefinitionEntry): string {
  const identity = entry.headword ?? entry.lemma ?? entry.plain ?? entry.arabic
  return `${context}|${entry.entry_type ?? 'word'}|${identity.normalize('NFC')}`
}

export function nextExploreIndex(currentIndex: number, itemCount: number): number | null {
  if (itemCount <= 1 || currentIndex < 0 || currentIndex >= itemCount) return null
  return (currentIndex + 1) % itemCount
}
