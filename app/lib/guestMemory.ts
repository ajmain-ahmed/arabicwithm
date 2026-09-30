import { MEMORY, platformDate } from '@/app/lib/entitlements'

export const GUEST_MEMORY_KEY = 'awm-memory-guest-usage-v1'

export interface GuestMemoryUsage { date: string; used: number }

export function readGuestMemoryUsage(storage: Pick<Storage, 'getItem'>, now = new Date()): GuestMemoryUsage {
  const today = platformDate(now)
  try {
    const parsed = JSON.parse(storage.getItem(GUEST_MEMORY_KEY) ?? 'null') as Partial<GuestMemoryUsage> | null
    if (parsed?.date !== today || !Number.isInteger(parsed.used) || Number(parsed.used) < 0) return { date: today, used: 0 }
    return { date: today, used: Math.min(Number(parsed.used), MEMORY.dailyFreeCards) }
  } catch {
    return { date: today, used: 0 }
  }
}

export function writeGuestMemoryUsage(storage: Pick<Storage, 'setItem'>, used: number, now = new Date()): GuestMemoryUsage {
  const usage = { date: platformDate(now), used: Math.max(0, Math.min(Math.trunc(used), MEMORY.dailyFreeCards)) }
  try { storage.setItem(GUEST_MEMORY_KEY, JSON.stringify(usage)) } catch { /* in-memory enforcement still applies */ }
  return usage
}
