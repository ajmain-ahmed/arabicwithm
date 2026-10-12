import { describe, expect, it } from 'vitest'
import { GUEST_MEMORY_KEY, readGuestMemoryUsage, writeGuestMemoryUsage } from './guestMemory'

function memoryStorage(initial: string | null = null) {
  let value = initial
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next }, value: () => value }
}

describe('guest Memory allowance', () => {
  it('persists and caps the daily count', () => {
    const storage = memoryStorage()
    writeGuestMemoryUsage(storage, 31, new Date('2026-09-09T12:00:00Z'))
    expect(JSON.parse(storage.value() ?? '{}')).toEqual({ date: '2026-09-09', used: 30 })
    expect(readGuestMemoryUsage(storage, new Date('2026-09-09T15:00:00Z')).used).toBe(30)
  })

  it('resets on the Europe/London date boundary and ignores malformed data', () => {
    const previous = JSON.stringify({ date: '2026-09-09', used: 22 })
    expect(readGuestMemoryUsage(memoryStorage(previous), new Date('2026-09-09T23:01:00Z'))).toEqual({ date: '2026-09-10', used: 0 })
    expect(readGuestMemoryUsage(memoryStorage('{bad'), new Date('2026-09-09T12:00:00Z')).used).toBe(0)
    expect(GUEST_MEMORY_KEY).toContain('guest')
  })
})
