/** Shared product policy. Entitlements themselves are always read on the server. */
export const PREMIUM = { monthlyPence: 399, currency: 'gbp', label: '£3.99/month' } as const
export const MEMORY = { dailyFreeCards: 20, sessionCards: 20, xpPerCard: 1, timeZone: 'Europe/London' } as const
export interface BookAccessPolicy { premiumExempt: boolean; freeChapterCount: number; chapterCount: number }
export function canAccessBookChapter(premium: boolean, book: BookAccessPolicy, chapter: number): boolean {
  if (!Number.isInteger(chapter) || chapter < 1) return false
  return premium || book.premiumExempt || book.chapterCount <= book.freeChapterCount || chapter <= book.freeChapterCount
}
export function hasPremium(subscription: { status: string; current_period_end: string } | null, now = new Date()): boolean {
  return Boolean(subscription && subscription.status === 'active' && Date.parse(subscription.current_period_end) > now.getTime())
}
export function getRemainingFreeMemoryCards(completed: number): number { return Math.max(0, MEMORY.dailyFreeCards - completed) }
export function platformDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MEMORY.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
