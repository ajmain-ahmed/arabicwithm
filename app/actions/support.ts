'use server'

import { headers } from 'next/headers'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { rateLimit } from '@/app/lib/rateLimit'
import { createSupportCheckout } from '@/app/lib/supportPayments'
import { MAX_SUPPORT_PENCE } from '@/app/lib/supportAmount'

export type SupportCheckoutResult = { ok: true; url: string } | { ok: false; error: string }

export async function startSupportCheckout(amountPence: number): Promise<SupportCheckoutResult> {
  if (!Number.isSafeInteger(amountPence) || amountPence <= 0 || amountPence > MAX_SUPPORT_PENCE) {
    return { ok: false, error: 'Enter a valid positive amount with no more than two decimal places.' }
  }

  const userId = await getAuthenticatedUserId()
  const requestHeaders = await headers()
  const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  const identity = userId ?? forwardedFor ?? 'anonymous'
  const limited = rateLimit(`support-checkout:${identity}`, 8, 10 * 60 * 1000)
  if (!limited.ok) return { ok: false, error: `Too many checkout attempts. Try again in ${limited.retryAfterSeconds} seconds.` }

  try {
    return { ok: true, url: await createSupportCheckout(amountPence, userId) }
  } catch (error) {
    console.error('[support] Unable to create Stripe Checkout session', { amountPence, userId, error })
    return { ok: false, error: 'Secure checkout is temporarily unavailable. Please try again later.' }
  }
}
