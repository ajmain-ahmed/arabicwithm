// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const upsert = vi.fn()
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle,
    single: maybeSingle,
    upsert,
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return {
    access: vi.fn(),
    premium: vi.fn(),
    from: vi.fn(() => query),
    maybeSingle,
    upsert,
    update: vi.fn(),
    rateLimit: vi.fn(() => ({ ok: true, retryAfterSeconds: 0 })),
    pricesRetrieve: vi.fn(),
    customersRetrieve: vi.fn(),
    customersCreate: vi.fn(),
    subscriptionsList: vi.fn(),
    sessionsList: vi.fn(),
    sessionsCreate: vi.fn(),
    portalCreate: vi.fn(),
  }
})

vi.mock('@/app/actions/auth', () => ({
  getAuthenticatedAccess: mocks.access,
  getAuthenticatedUserId: vi.fn(() => 'member-id'),
}))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: mocks.from } }))
vi.mock('@/app/lib/accountPremium', () => ({ accountHasPremium: mocks.premium }))
vi.mock('@/app/lib/durableRateLimit', () => ({ durableRateLimit: async () => mocks.rateLimit() }))
vi.mock('@/app/lib/billing', () => ({
  stripeClient: vi.fn(() => ({
    subscriptions: { update: mocks.update, list: mocks.subscriptionsList },
    prices: { retrieve: mocks.pricesRetrieve },
    customers: { retrieve: mocks.customersRetrieve, create: mocks.customersCreate },
    checkout: { sessions: { list: mocks.sessionsList, create: mocks.sessionsCreate } },
    billingPortal: { sessions: { create: mocks.portalCreate } },
  })),
  siteUrl: vi.fn(() => 'https://site.example'),
  premiumPriceId: vi.fn(() => 'price_test'),
}))

import { fetchPremiumStatus, managePremium, setPremiumRenewal, startPremiumCheckout } from './premium'

describe('fetchPremiumStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.premium.mockResolvedValue(false)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('keeps signed-out users restricted', async () => {
    mocks.access.mockResolvedValue(null)
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: false, signedIn: false, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('grants admins premium without querying a subscription', async () => {
    mocks.access.mockResolvedValue({ userId: 'admin-id', admin: true })
    mocks.premium.mockResolvedValue(true)
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: false, admin: true, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('keeps a normal free user restricted', async () => {
    mocks.access.mockResolvedValue({ userId: 'free-id', admin: false })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: false, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null })
  })

  it('keeps active subscribers premium', async () => {
    mocks.access.mockResolvedValue({ userId: 'premium-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'active', current_period_end: '2999-01-01T00:00:00.000Z', customer_id: 'customer-id' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: false, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: false, startedAt: null })
  })

  it('reports member tenure from the subscription start', async () => {
    mocks.access.mockResolvedValue({ userId: 'premium-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'active', current_period_end: '2999-01-01T00:00:00.000Z', customer_id: 'customer-id', started_at: '2026-03-15T00:00:00.000Z' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toMatchObject({ premium: true, manageable: true, startedAt: '2026-03-15T00:00:00.000Z' })
  })

  it('surfaces a failed renewal as a payment issue while access continues', async () => {
    mocks.access.mockResolvedValue({ userId: 'pastdue-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'past_due', current_period_end: '2999-01-01T00:00:00.000Z', customer_id: 'customer-id' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: false, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: true, startedAt: null })
  })

  it('surfaces a scheduled cancellation with its end date', async () => {
    mocks.access.mockResolvedValue({ userId: 'cancel-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'active', current_period_end: '2999-01-01T00:00:00.000Z', cancel_at_period_end: true, customer_id: 'customer-id' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: true, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: false, startedAt: null })
  })
})

it('uses canonical manual access even when no paid subscription exists', async () => {
  mocks.access.mockResolvedValue({ userId: 'manual-id', admin: false }); mocks.premium.mockResolvedValue(true)
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  await expect(fetchPremiumStatus()).resolves.toMatchObject({ premium: true, manageable: false })
  expect(mocks.premium).toHaveBeenCalledWith('manual-id')
})

describe('startPremiumCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfterSeconds: 0 })
    mocks.access.mockResolvedValue({ userId: 'member-id', admin: false })
    mocks.maybeSingle.mockResolvedValue({ data: { customer_id: 'cus-x' }, error: null })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.pricesRetrieve.mockResolvedValue({ active: true, currency: 'gbp', unit_amount: 499, recurring: { interval: 'month', interval_count: 1 } })
    mocks.customersRetrieve.mockResolvedValue({ id: 'cus-x' })
    mocks.customersCreate.mockResolvedValue({ id: 'cus-new' })
    mocks.subscriptionsList.mockResolvedValue({ data: [] })
    mocks.sessionsList.mockResolvedValue({ data: [] })
    mocks.sessionsCreate.mockResolvedValue({ url: 'https://checkout.example/fresh' })
    mocks.portalCreate.mockResolvedValue({ url: 'https://portal.example/manage' })
  })

  it('creates a fresh checkout session for a first-time subscriber', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(startPremiumCheckout()).resolves.toBe('https://checkout.example/fresh')
    expect(mocks.sessionsCreate).toHaveBeenCalledOnce()
    expect(mocks.portalCreate).not.toHaveBeenCalled()
  })

  it('sends members with a live subscription to the billing portal', async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [{ status: 'active' }] })
    await expect(startPremiumCheckout()).resolves.toBe('https://portal.example/manage')
    expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  })

  it('resumes the open checkout session for an abandoned (incomplete) payment instead of the portal', async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [{ status: 'incomplete' }] })
    mocks.sessionsList.mockResolvedValue({ data: [{ url: 'https://checkout.example/open' }] })
    await expect(startPremiumCheckout()).resolves.toBe('https://checkout.example/open')
    expect(mocks.portalCreate).not.toHaveBeenCalled()
    expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  })

  it('creates a fresh checkout session when the abandoned payment has no open session left', async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [{ status: 'incomplete' }] })
    mocks.sessionsList.mockResolvedValue({ data: [] })
    await expect(startPremiumCheckout()).resolves.toBe('https://checkout.example/fresh')
    expect(mocks.portalCreate).not.toHaveBeenCalled()
  })
})

describe('managePremium', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfterSeconds: 0 })
    mocks.maybeSingle.mockResolvedValue({ data: { customer_id: 'cus-x' }, error: null })
    mocks.portalCreate.mockResolvedValue({ url: 'https://portal.example/manage' })
  })

  it('opens a billing portal session for the mapped customer', async () => {
    await expect(managePremium()).resolves.toBe('https://portal.example/manage')
    expect(mocks.portalCreate).toHaveBeenCalledWith({ customer: 'cus-x', return_url: 'https://site.example/profile' })
  })

  it('deep links to the update-payment-method flow on request', async () => {
    await expect(managePremium('payment-method')).resolves.toBe('https://portal.example/manage')
    expect(mocks.portalCreate).toHaveBeenCalledWith({ customer: 'cus-x', return_url: 'https://site.example/profile', flow_data: { type: 'payment_method_update' } })
  })

  it('throttles repeated portal requests', async () => {
    mocks.rateLimit.mockReturnValue({ ok: false, retryAfterSeconds: 42 })
    await expect(managePremium()).rejects.toThrow('Too many attempts')
    expect(mocks.portalCreate).not.toHaveBeenCalled()
  })
})

describe('setPremiumRenewal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfterSeconds: 0 })
    mocks.access.mockResolvedValue({ userId: 'member-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({ data: { customer_id: 'cus-x', subscription_id: 'sub-x' }, error: null })
    mocks.subscriptionsList.mockResolvedValue({ data: [{ id: 'sub-x', status: 'active' }] })
    mocks.update.mockResolvedValue({})
  })

  it('turns auto-renew off via cancel_at_period_end=true', async () => {
    const status = await setPremiumRenewal(false)
    expect(mocks.update).toHaveBeenCalledWith('sub-x', { cancel_at_period_end: true })
    expect(status).toMatchObject({ premium: true, cancelAtPeriodEnd: false, paymentIssue: false })
  })

  it('turns auto-renew back on by clearing BOTH cancellation signals', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { customer_id: 'cus-x', subscription_id: 'sub-x', status: 'active', cancel_at_period_end: true, current_period_end: '2999-01-01T00:00:00.000Z' }, error: null })
    const status = await setPremiumRenewal(true)
    expect(mocks.update).toHaveBeenNthCalledWith(1, 'sub-x', { cancel_at_period_end: false })
    expect(mocks.update).toHaveBeenNthCalledWith(2, 'sub-x', { cancel_at: '' })
    expect(status).toMatchObject({ premium: true, cancelAtPeriodEnd: true })
  })

  it('targets the live Stripe subscription, not a stale row id', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { customer_id: 'cus-x', subscription_id: 'sub-old' }, error: null })
    mocks.subscriptionsList.mockResolvedValue({ data: [{ id: 'sub-old', status: 'canceled' }, { id: 'sub-new', status: 'active' }] })
    await setPremiumRenewal(false)
    expect(mocks.update).toHaveBeenCalledWith('sub-new', { cancel_at_period_end: true })
  })

  it('reports when the customer has no live subscription', async () => {
    mocks.subscriptionsList.mockResolvedValue({ data: [{ id: 'sub-x', status: 'canceled' }] })
    await expect(setPremiumRenewal(false)).rejects.toThrow('no longer active')
    expect(mocks.update).not.toHaveBeenCalled()
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
