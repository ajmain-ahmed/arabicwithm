import { describe, expect, it } from 'vitest'
import { canAccessBookChapter, getRemainingFreeMemoryCards, hasPremium, hasPremiumAccess, platformDate, resolveEntitlements } from './entitlements'
describe('central access policy', () => {
  it('allows every signed-in account to read and blocks guests', () => {
    expect(canAccessBookChapter(false, 1)).toBe(false)
    expect(canAccessBookChapter(true, 1)).toBe(true)
    expect(canAccessBookChapter(true, 30)).toBe(true)
    expect(canAccessBookChapter(true, -1)).toBe(false)
  })
  it('defines one guest, free, and premium entitlement matrix', () => {
    expect(resolveEntitlements(false, false)).toMatchObject({ tier: 'guest', canReadBooks: false, canDownloadBooks: false, canUseAudiobooks: false, memoryDailyLimit: 1 })
    expect(resolveEntitlements(true, false)).toMatchObject({ tier: 'free', canReadBooks: true, canDownloadBooks: false, canUseAudiobooks: false, memoryDailyLimit: 1 })
    expect(resolveEntitlements(true, true)).toMatchObject({ tier: 'premium', canReadBooks: true, canDownloadBooks: true, canUseAudiobooks: true, memoryDailyLimit: null })
  })
  it('uses paid status and expiry, including cancellation at period end', () => {
    const now = new Date('2026-09-09T00:00:00Z')
    expect(hasPremium({ status: 'active', current_period_end: '2026-10-01' }, now)).toBe(true)
    expect(hasPremium({ status: 'trialing', current_period_end: '2026-10-01' }, now)).toBe(true)
    for (const status of ['past_due', 'unpaid', 'incomplete', 'canceled', 'expired']) expect(hasPremium({ status, current_period_end: '2026-10-01' }, now)).toBe(false)
    expect(hasPremium({ status: 'active', current_period_end: '2026-09-08' }, now)).toBe(false)
    expect(hasPremium(null, now)).toBe(false)
  })
  it('grants every admin effective premium access without changing normal subscription rules', () => {
    const now = new Date('2026-09-09T00:00:00Z')
    expect(hasPremiumAccess(true, null, now)).toBe(true)
    expect(hasPremiumAccess(true, { status: 'expired', current_period_end: '2026-09-08' }, now)).toBe(true)
    expect(hasPremiumAccess(false, null, now)).toBe(false)
    expect(hasPremiumAccess(false, { status: 'active', current_period_end: '2026-10-01' }, now)).toBe(true)
  })
  it('shares a daily allowance and London calendar boundaries, including DST', () => {
    expect(getRemainingFreeMemoryCards(8)).toBe(22)
    expect(getRemainingFreeMemoryCards(30)).toBe(0)
    expect(getRemainingFreeMemoryCards(34)).toBe(0)
    expect(platformDate(new Date('2026-09-09T23:01:00Z'))).toBe('2026-09-10')
    expect(platformDate(new Date('2026-12-09T23:01:00Z'))).toBe('2026-12-09')
  })
})

it('resolves independent editorial and Premium capabilities, with Admin inheritance',()=>{
 expect(resolveEntitlements(true,false,'editor')).toMatchObject({isEditor:true,isAdmin:false,isPremium:false,canUseAudiobooks:false})
 expect(resolveEntitlements(true,true,'editor')).toMatchObject({isEditor:true,isAdmin:false,isPremium:true})
 expect(resolveEntitlements(true,true,'user')).toMatchObject({isEditor:false,isAdmin:false,isPremium:true})
 expect(resolveEntitlements(true,false,'admin')).toMatchObject({isEditor:true,isAdmin:true,isPremium:true,memoryDailyLimit:null})
 expect(resolveEntitlements(false,true,'admin')).toMatchObject({isEditor:false,isAdmin:false,isPremium:false})
})
