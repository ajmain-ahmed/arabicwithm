import type Stripe from 'stripe'
import { MAX_SUPPORT_PENCE } from '@/app/lib/supportAmount'

export const SUPPORT_METADATA = {
  type: 'support',
  source: 'arabic_with_m',
} as const

export function buildSupportCheckoutParams(
  amountPence: number,
  userId: string | null,
  origin: string,
): Stripe.Checkout.SessionCreateParams {
  if (!Number.isSafeInteger(amountPence) || amountPence <= 0 || amountPence > MAX_SUPPORT_PENCE) {
    throw new Error('Enter a valid support amount.')
  }

  const metadata: Record<string, string> = { ...SUPPORT_METADATA }
  if (userId) metadata.user_id = userId

  return {
    mode: 'payment',
    client_reference_id: userId ?? undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'gbp',
        unit_amount: amountPence,
        product_data: {
          name: 'Support Arabic with M',
          description: 'A one-time contribution supporting Arabic learning resources.',
        },
      },
    }],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}/support?support=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/support?support=cancelled`,
  }
}
