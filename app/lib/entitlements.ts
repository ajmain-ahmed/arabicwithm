/** Shared product policy. Entitlements themselves are always read on the server. */
import { canAccessBookMedia } from '@/supabase/functions/_shared/bookAccess'
export { canAccessBookMedia } from '@/supabase/functions/_shared/bookAccess'
const PREMIUM_MONTHLY_PENCE = 499
const PREMIUM_MONTHLY_PRICE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(PREMIUM_MONTHLY_PENCE / 100)
export const PREMIUM = { monthlyPence: PREMIUM_MONTHLY_PENCE, currency: 'gbp', price: PREMIUM_MONTHLY_PRICE, label: `${PREMIUM_MONTHLY_PRICE}/month` } as const
export const PREMIUM_BENEFITS = [
  { id: 'offline-books', label: 'Offline books' },
  { id: 'audiobooks', label: 'Audiobooks' },
  { id: 'for-you', label: 'Unlimited For You viewing' },
  { id: 'memory', label: 'Unlimited Memory Practice' },
] as const
export const MEMORY = { dailyFreeCards: 30, dailyFreeSessions: 1, sessionCards: 50, xpPerCard: 1, timeZone: 'Europe/London' } as const

export type AccessTier = 'guest' | 'free' | 'premium'
export interface Entitlements {
  tier: AccessTier
  signedIn: boolean
  premium: boolean
  isUser: boolean
  isPremium: boolean
  isEditor: boolean
  isAdmin: boolean
  canEditContent: boolean
  canAdminister: boolean
  canBrowseBooks: true
  canWatchVideos: true
  canReadBooks: boolean
  canDownloadBooks: boolean
  canUseAudiobooks: boolean
  memoryDailyLimit: number | null
  forYouDailyMs: number | null
}

export function resolveEntitlements(signedIn: boolean, premium: boolean, role: 'user' | 'editor' | 'admin' = 'user'): Entitlements {
  const admin = signedIn && role === 'admin'
  const editor = signedIn && (role === 'editor' || admin)
  const paid = signedIn && (premium || admin)
  return {
    tier: paid ? 'premium' : signedIn ? 'free' : 'guest',
    signedIn,
    premium: paid,
    isUser: signedIn,
    isPremium: paid,
    isEditor: editor,
    isAdmin: admin,
    canEditContent: editor,
    canAdminister: admin,
    canBrowseBooks: true,
    canWatchVideos: true,
    canReadBooks: signedIn,
    canDownloadBooks: paid,
    canUseAudiobooks: paid,
    forYouDailyMs: paid ? null : 15 * 60 * 1000,
    memoryDailyLimit: paid ? null : MEMORY.dailyFreeSessions,
  }
}

/** Reading is free for signed-in users by design; AWM+ gates PDF downloads,
 * audiobooks, For You and Memory — not prose. The numbered preview window
 * (books.free_chapter_count) only controls catalogue teasers and Explore. */
export function canAccessBookChapter(signedIn: boolean): boolean {
  return signedIn
}

/** Exemption is scoped to this canonical book, never to the user's global
 * Premium status. Existing signed-in reading rules remain unchanged. */
export function resolveBookEntitlements(access: Entitlements, book: { premium_exempt?: boolean; is_completed?: boolean } | null): Entitlements {
  const released = Boolean(book && book.is_completed !== false)
  const media = canAccessBookMedia(access.signedIn, access.premium, book?.premium_exempt === true, released)
  return { ...access, canReadBooks: access.canReadBooks && released, canDownloadBooks: media, canUseAudiobooks: media }
}
export function hasPremium(subscription: { status: string; current_period_end: string } | null, now = new Date()): boolean {
  /* Grace period: past_due/unpaid subscriptions (failed renewal, Stripe still
     retrying) keep access until the paid period ends. Entitlement stops at
     period end unless the webhook reports recovery (active/trialing). */
  return Boolean(subscription && ['active', 'trialing', 'past_due', 'unpaid'].includes(subscription.status) && Date.parse(subscription.current_period_end) > now.getTime())
}
export function hasPremiumAccess(admin: boolean, subscription: { status: string; current_period_end: string } | null, now = new Date()): boolean {
  return admin || hasPremium(subscription, now)
}
export function getRemainingFreeMemoryCards(completed: number): number { return Math.max(0, MEMORY.dailyFreeCards - completed) }
export function platformDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MEMORY.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
