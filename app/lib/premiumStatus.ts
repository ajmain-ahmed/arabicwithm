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
  /* When the current subscription began (subscription.created from Stripe),
     for "member since" display. Null for admins, manual grants, and rows
     written before the column existed. */
  startedAt: string | null
}

/* Resolve premium status for an already server-verified user. `admin` must
   come from getAuthenticatedAccess(), never from client input. */
export async function premiumStatusForUser(userId: string, admin: boolean): Promise<PremiumStatusData> {
  if (admin) return { premium: await accountHasPremium(userId), signedIn: true, manageable: false, admin: true, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null }
  const [premium, { data, error }] = await Promise.all([
    accountHasPremium(userId),
    serviceClient.from('subscriptions').select('status, current_period_end, cancel_at_period_end, customer_id, started_at').eq('user_id', userId).maybeSingle(),
  ])
  if (isMissingDatabaseFeature(error)) return { premium, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null }
  if (error) throw new Error('Unable to verify AWM+ access.')
  const paymentIssue = premium && ['past_due', 'unpaid'].includes(String(data?.status ?? ''))
  return { premium, signedIn: true, manageable: Boolean(data?.customer_id), admin: false, cancelAtPeriodEnd: Boolean(data?.cancel_at_period_end), periodEnd: data?.current_period_end ?? null, paymentIssue, startedAt: data?.started_at ?? null }
}
