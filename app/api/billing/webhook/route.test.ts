// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Regression: Stripe's newer cancellation flows set cancel_at without the
   legacy cancel_at_period_end flag. The webhook must treat either signal as
   "scheduled to cancel" or portal cancellations silently never surface. */
const mocks = vi.hoisted(() => {
  const single = vi.fn()
  const upsert = vi.fn()
  const query = { select: vi.fn(), eq: vi.fn(), single, upsert }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return {
    single,
    upsert,
    query,
    rpc: vi.fn(),
    retrieve: vi.fn(),
    constructEvent: vi.fn(),
  }
})

vi.mock('@/app/lib/billing', () => ({
  stripeClient: vi.fn(() => ({
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.retrieve },
  })),
  premiumPriceId: vi.fn(() => 'price_test'),
}))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: vi.fn(() => mocks.query), rpc: mocks.rpc } }))

import { POST } from './route'

function event(subscription: Record<string, unknown>) {
  return { type: 'customer.subscription.updated', created: 123, data: { object: subscription } }
}
const baseSub = {
  id: 'sub_x', status: 'active', customer: 'cus_x', cancel_at_period_end: false, cancel_at: null, created: 1_700_000_000,
  items: { data: [{ price: { id: 'price_test' }, current_period_end: 1_800_000_000 }] },
}

describe('billing webhook cancellation signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
    mocks.single.mockResolvedValue({ data: { user_id: 'uid_x' }, error: null })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.rpc.mockResolvedValue({ error: null })
  })

  async function post(subscription: Record<string, unknown>) {
    mocks.constructEvent.mockReturnValue(event(subscription))
    mocks.retrieve.mockResolvedValue(subscription)
    return POST(new Request('https://x/api/billing/webhook', { method: 'POST', headers: { 'stripe-signature': 'sig' } }))
  }

  it('maps the legacy flag to a scheduled cancellation and carries the subscription start', async () => {
    const res = await post({ ...baseSub, cancel_at_period_end: true })
    expect(res.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('apply_subscription_event', expect.objectContaining({ p_cancel_at_period_end: true, p_started_at: new Date(1_700_000_000 * 1000).toISOString() }))
  })

  it('maps a bare cancel_at timestamp (modern portal behavior) to a scheduled cancellation', async () => {
    const res = await post({ ...baseSub, cancel_at: 1_800_000_000 })
    expect(res.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('apply_subscription_event', expect.objectContaining({ p_cancel_at_period_end: true, p_period_end: new Date(1_800_000_000 * 1000).toISOString() }))
  })

  it('maps a healthy renewing subscription to no scheduled cancellation', async () => {
    const res = await post(baseSub)
    expect(res.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('apply_subscription_event', expect.objectContaining({ p_cancel_at_period_end: false }))
  })
})

describe('billing webhook customer mapping reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
    mocks.single.mockResolvedValue({ data: { user_id: 'uid_x' }, error: null })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.rpc.mockResolvedValue({ error: null })
  })

  async function postEvent(payload: Record<string, unknown>) {
    mocks.constructEvent.mockReturnValue(payload)
    return POST(new Request('https://x/api/billing/webhook', { method: 'POST', headers: { 'stripe-signature': 'sig' } }))
  }

  it('reconciles the mapping from a completed subscription checkout', async () => {
    const res = await postEvent({ type: 'checkout.session.completed', created: 123, data: { object: { mode: 'subscription', client_reference_id: 'uid_new', customer: 'cus_new' } } })
    expect(res.status).toBe(200)
    expect(mocks.upsert).toHaveBeenCalledWith({ user_id: 'uid_new', customer_id: 'cus_new' }, { onConflict: 'user_id', ignoreDuplicates: true })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('ignores completed support (one-time payment) checkouts', async () => {
    const res = await postEvent({ type: 'checkout.session.completed', created: 123, data: { object: { mode: 'payment', client_reference_id: 'uid_new', customer: 'cus_new' } } })
    expect(res.status).toBe(200)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('falls back to subscription metadata when the customer is unmapped', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mocks.retrieve.mockResolvedValue({ ...baseSub, metadata: { user_id: 'uid_meta' } })
    const res = await postEvent(event({ ...baseSub, metadata: { user_id: 'uid_meta' } }))
    expect(res.status).toBe(200)
    expect(mocks.upsert).toHaveBeenCalledWith({ user_id: 'uid_meta', customer_id: 'cus_x' }, { onConflict: 'user_id', ignoreDuplicates: true })
    expect(mocks.rpc).toHaveBeenCalledWith('apply_subscription_event', expect.objectContaining({ p_user_id: 'uid_meta' }))
  })

  it('still fails when the customer is unmapped and no metadata user exists', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mocks.retrieve.mockResolvedValue(baseSub)
    const res = await postEvent(event(baseSub))
    expect(res.status).toBe(500)
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})

describe('billing webhook dispute and refund signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
  })

  async function postEvent(payload: Record<string, unknown>) {
    mocks.constructEvent.mockReturnValue(payload)
    return POST(new Request('https://x/api/billing/webhook', { method: 'POST', headers: { 'stripe-signature': 'sig' } }))
  }

  it('acknowledges a dispute loudly without touching subscription state', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await postEvent({ type: 'charge.dispute.created', created: 123, data: { object: { id: 'dp_x', amount: 499, reason: 'fraudulent' } } })
    expect(res.status).toBe(200)
    expect(errorSpy.mock.calls[0]?.join(' ')).toContain('charge.dispute.created')
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
