/** Shared product policy. Entitlements themselves are always read on the server. */
export const PREMIUM = { monthlyPence: 399, currency: 'gbp', label: '£3.99/month' } as const
export const PREMIUM_BENEFITS = [
  { id: 'offline-books', label: 'Offline books', appOnly: false },
  { id: 'audiobooks', label: 'Audiobooks', appOnly: false },
  { id: 'memory', label: 'Unlimited Memory Practice', appOnly: false },
  { id: 'flashcards', label: 'Unlimited flashcards', appOnly: true },
] as const
export const MEMORY = { dailyFreeCards: 30, dailyFreeSessions: 1, sessionCards: 50, xpPerCard: 1, timeZone: 'Europe/London' } as const

export type AccessTier = 'guest' | 'free' | 'premium'
export interface Entitlements {
  tier: AccessTier
  signedIn: boolean
  premium: boolean
  canBrowseBooks: true
  canWatchVideos: true
  canReadBooks: boolean
  canDownloadBooks: boolean
  canUseAudiobooks: boolean
  memoryDailyLimit: number | null
}

export function resolveEntitlements(signedIn: boolean, premium: boolean): Entitlements {
  const paid = signedIn && premium
  return {
    tier: paid ? 'premium' : signedIn ? 'free' : 'guest',
    signedIn,
    premium: paid,
    canBrowseBooks: true,
    canWatchVideos: true,
    canReadBooks: signedIn,
    canDownloadBooks: paid,
    canUseAudiobooks: paid,
    memoryDailyLimit: paid ? null : MEMORY.dailyFreeSessions,
  }
}

export function canAccessBookChapter(signedIn: boolean, chapter: number): boolean {
  return signedIn && Number.isInteger(chapter) && chapter >= 1
}
export function hasPremium(subscription: { status: string; current_period_end: string } | null, now = new Date()): boolean {
  return Boolean(subscription && ['active', 'trialing'].includes(subscription.status) && Date.parse(subscription.current_period_end) > now.getTime())
}
export function hasPremiumAccess(admin: boolean, subscription: { status: string; current_period_end: string } | null, now = new Date()): boolean {
  return admin || hasPremium(subscription, now)
}
export function getRemainingFreeMemoryCards(completed: number): number { return Math.max(0, MEMORY.dailyFreeCards - completed) }
export function platformDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MEMORY.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
