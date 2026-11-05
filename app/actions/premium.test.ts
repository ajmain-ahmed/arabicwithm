// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle,
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return {
    access: vi.fn(),
    premium:vi.fn(),
    from: vi.fn(() => query),
    maybeSingle,
    update: vi.fn(),
  }
})

vi.mock('@/app/actions/auth', () => ({
  getAuthenticatedAccess: mocks.access,
  getAuthenticatedUserId: vi.fn(),
}))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: mocks.from } }))
vi.mock('@/app/lib/accountPremium',()=>({accountHasPremium:mocks.premium}))
vi.mock('@/app/lib/billing', () => ({ stripeClient: vi.fn(() => ({ subscriptions: { update: mocks.update } })), siteUrl: vi.fn(), premiumPriceId: vi.fn() }))

import { fetchPremiumStatus, setPremiumRenewal } from './premium'

describe('fetchPremiumStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.premium.mockResolvedValue(false)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('keeps signed-out users restricted', async () => {
    mocks.access.mockResolvedValue(null)
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: false, signedIn: false, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('grants admins premium without querying a subscription', async () => {
    mocks.access.mockResolvedValue({ userId: 'admin-id', admin: true })
    mocks.premium.mockResolvedValue(true)
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: false, admin: true, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('keeps a normal free user restricted', async () => {
    mocks.access.mockResolvedValue({ userId: 'free-id', admin: false })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: false, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false })
  })

  it('keeps active subscribers premium', async () => {
    mocks.access.mockResolvedValue({ userId: 'premium-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'active', current_period_end: '2999-01-01T00:00:00.000Z', customer_id: 'customer-id' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: false, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: false })
  })

  it('surfaces a failed renewal as a payment issue while access continues', async () => {
    mocks.access.mockResolvedValue({ userId: 'pastdue-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'past_due', current_period_end: '2999-01-01T00:00:00.000Z', customer_id: 'customer-id' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: false, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: true })
  })

  it('surfaces a scheduled cancellation with its end date', async () => {
    mocks.access.mockResolvedValue({ userId: 'cancel-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'active', current_period_end: '2999-01-01T00:00:00.000Z', cancel_at_period_end: true, customer_id: 'customer-id' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: true, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: false })
  })
})

it('uses canonical manual access even when no paid subscription exists',async()=>{
 mocks.access.mockResolvedValue({userId:'manual-id',admin:false});mocks.premium.mockResolvedValue(true)
 mocks.maybeSingle.mockResolvedValue({data:null,error:null})
 await expect(fetchPremiumStatus()).resolves.toMatchObject({premium:true,manageable:false})
 expect(mocks.premium).toHaveBeenCalledWith('manual-id')
})

describe('setPremiumRenewal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.access.mockResolvedValue({ userId: 'member-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({ data: { customer_id: 'cus-x', subscription_id: 'sub-x' }, error: null })
    mocks.update.mockResolvedValue({})
  })

  it('turns auto-renew off via cancel_at_period_end=true', async () => {
    const status = await setPremiumRenewal(false)
    expect(mocks.update).toHaveBeenCalledWith('sub-x', { cancel_at_period_end: true })
    expect(status).toMatchObject({ premium: true, cancelAtPeriodEnd: false, paymentIssue: false })
  })

  it('turns auto-renew back on via cancel_at_period_end=false', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { customer_id: 'cus-x', subscription_id: 'sub-x', status: 'active', cancel_at_period_end: true, current_period_end: '2999-01-01T00:00:00.000Z' }, error: null })
    const status = await setPremiumRenewal(true)
    expect(mocks.update).toHaveBeenCalledWith('sub-x', { cancel_at_period_end: false })
    expect(status).toMatchObject({ premium: true, cancelAtPeriodEnd: true })
  })

  it('rejects when no billing account exists', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(setPremiumRenewal(false)).rejects.toThrow('No billing account found')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('maps a vanished subscription to a friendly error', async () => {
    mocks.update.mockRejectedValue(Object.assign(new Error('No such subscription'), { code: 'resource_missing' }))
    await expect(setPremiumRenewal(false)).rejects.toThrow('no longer active')
  })

  it('blocks admins, who have no Stripe subscription', async () => {
    mocks.access.mockResolvedValue({ userId: 'admin-id', admin: true })
    await expect(setPremiumRenewal(false)).rejects.toThrow('administrator access')
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
