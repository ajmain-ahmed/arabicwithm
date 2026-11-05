// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Regression: Stripe's newer cancellation flows set cancel_at without the
   legacy cancel_at_period_end flag. The webhook must treat either signal as
   "scheduled to cancel" or portal cancellations silently never surface. */
const mocks = vi.hoisted(() => {
  const single = vi.fn()
  const query = { select: vi.fn(), eq: vi.fn(), single }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return {
    single,
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
  id: 'sub_x', status: 'active', customer: 'cus_x', cancel_at_period_end: false, cancel_at: null,
  items: { data: [{ price: { id: 'price_test' }, current_period_end: 1_800_000_000 }] },
}

describe('billing webhook cancellation signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
    mocks.single.mockResolvedValue({ data: { user_id: 'uid_x' }, error: null })
    mocks.rpc.mockResolvedValue({ error: null })
  })

  async function post(subscription: Record<string, unknown>) {
    mocks.constructEvent.mockReturnValue(event(subscription))
    mocks.retrieve.mockResolvedValue(subscription)
    return POST(new Request('https://x/api/billing/webhook', { method: 'POST', headers: { 'stripe-signature': 'sig' } }))
  }

  it('maps the legacy flag to a scheduled cancellation', async () => {
    const res = await post({ ...baseSub, cancel_at_period_end: true })
    expect(res.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('apply_subscription_event', expect.objectContaining({ p_cancel_at_period_end: true }))
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
