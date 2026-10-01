import { describe, expect, it } from 'vitest'
import { buildSupportCheckoutParams } from './supportCheckout'

describe('buildSupportCheckoutParams', () => {
  it('creates a one-time GBP checkout with support metadata', () => {
    const params = buildSupportCheckoutParams(2000, 'user-123', 'https://arabicwithm.example')

    expect(params).toMatchObject({
      mode: 'payment',
      client_reference_id: 'user-123',
      metadata: { type: 'support', source: 'arabic_with_m', user_id: 'user-123' },
      payment_intent_data: {
        metadata: { type: 'support', source: 'arabic_with_m', user_id: 'user-123' },
      },
      success_url: 'https://arabicwithm.example/support?support=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://arabicwithm.example/support?support=cancelled',
    })
    expect(params.line_items).toEqual([expect.objectContaining({
      quantity: 1,
      price_data: expect.objectContaining({ currency: 'gbp', unit_amount: 2000 }),
    })])
  })

  it('supports anonymous contributions without inventing a user reference', () => {
    const params = buildSupportCheckoutParams(500, null, 'https://arabicwithm.example')
    expect(params.client_reference_id).toBeUndefined()
    expect(params.metadata).toEqual({ type: 'support', source: 'arabic_with_m' })
  })

  it('rejects invalid pence values before contacting Stripe', () => {
    expect(() => buildSupportCheckoutParams(0, null, 'https://arabicwithm.example')).toThrow('valid support amount')
    expect(() => buildSupportCheckoutParams(10.5, null, 'https://arabicwithm.example')).toThrow('valid support amount')
  })
})
