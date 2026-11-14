import { platformDate } from '@/app/lib/entitlements'
import { seededShuffled } from '@/app/lib/explore'

/** London calendar days, independent of server/browser timezone and DST length. */
export function homeCalendarDay(now = new Date()): number {
  return Math.floor(Date.parse(`${platformDate(now)}T00:00:00Z`) / 86_400_000)
}

export function dailyHomeOrder<T extends { id: string }>(items: readonly T[], section: 'shows' | 'books', now = new Date()): T[] {
  const ordered = [...items].sort((left, right) => left.id.localeCompare(right.id, 'en'))
  if (ordered.length < 2) return ordered
  // Rotate the lead item fairly, then shuffle the remaining cards independently.
  const cycle = seededShuffled(ordered, `homepage-${section}-lead-cycle`)
  const day = homeCalendarDay(now)
  const first = cycle[((day % cycle.length) + cycle.length) % cycle.length]
  return [first, ...seededShuffled(ordered.filter(item => item.id !== first.id), `homepage-${section}-${platformDate(now)}`)]
}
