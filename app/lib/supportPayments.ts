import 'server-only'

import { stripeClient, siteUrl } from '@/app/lib/billing'
import { buildSupportCheckoutParams, SUPPORT_METADATA } from '@/app/lib/supportCheckout'

export type SupportCheckoutStatus = 'paid' | 'pending' | 'invalid'

export async function createSupportCheckout(amountPence: number, userId: string | null): Promise<string> {
  const session = await stripeClient().checkout.sessions.create(
    buildSupportCheckoutParams(amountPence, userId, siteUrl()),
  )

  if (!session.url) throw new Error('Stripe did not return a checkout link.')
  return session.url
}

export async function verifySupportCheckout(sessionId: string): Promise<SupportCheckoutStatus> {
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return 'invalid'

  try {
    const session = await stripeClient().checkout.sessions.retrieve(sessionId)
    if (
      session.mode !== 'payment'
      || session.currency !== 'gbp'
      || session.metadata?.type !== SUPPORT_METADATA.type
      || session.metadata?.source !== SUPPORT_METADATA.source
    ) return 'invalid'

    return session.payment_status === 'paid' ? 'paid' : 'pending'
  } catch (error) {
    console.error('[support] Unable to verify Stripe Checkout session', { sessionId, error })
    return 'invalid'
  }
}
