// Server-side premium entitlement resolution, shared by server actions that
// have already verified the caller's identity. Never import from a client
// component: this queries the database with the service client.

import { accountHasPremium } from '@/app/lib/accountPremium'
import { isMissingDatabaseFeature } from '@/app/lib/databaseErrors'
import { serviceClient } from '@/app/lib/supabase'

export interface PremiumStatusData {
  premium: boolean
  signedIn: boolean
  manageable: boolean
  admin: boolean
  /* Stripe subscription lifecycle (signed-in non-admins with a billing
     account; false/null otherwise). cancelAtPeriodEnd means the user
     cancelled and access continues until periodEnd. paymentIssue means the
     last renewal failed: access continues until periodEnd while Stripe
     retries, and the user should update their payment method. */
  cancelAtPeriodEnd: boolean
  periodEnd: string | null
  paymentIssue: boolean
}

/* Resolve premium status for an already server-verified user. `admin` must
   come from getAuthenticatedAccess(), never from client input. */
export async function premiumStatusForUser(userId: string, admin: boolean): Promise<PremiumStatusData> {
  if (admin) return { premium: await accountHasPremium(userId), signedIn: true, manageable: false, admin: true, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false }
  const [premium, { data, error }] = await Promise.all([
    accountHasPremium(userId),
    serviceClient.from('subscriptions').select('status, current_period_end, cancel_at_period_end, customer_id').eq('user_id', userId).maybeSingle(),
  ])
  if (isMissingDatabaseFeature(error)) return { premium, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false }
  if (error) throw new Error('Unable to verify AWM+ access.')
  const paymentIssue = premium && ['past_due', 'unpaid'].includes(String(data?.status ?? ''))
  return { premium, signedIn: true, manageable: Boolean(data?.customer_id), admin: false, cancelAtPeriodEnd: Boolean(data?.cancel_at_period_end), periodEnd: data?.current_period_end ?? null, paymentIssue }
}
