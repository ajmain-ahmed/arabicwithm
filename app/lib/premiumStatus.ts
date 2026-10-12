// Server-side premium entitlement resolution, shared by server actions that
// have already verified the caller's identity. Never import from a client
// component: this queries subscriptions with the service client.

import { isMissingDatabaseFeature } from '@/app/lib/databaseErrors'
import { hasPremiumAccess } from '@/app/lib/entitlements'
import { serviceClient } from '@/app/lib/supabase'

export interface PremiumStatusData {
  premium: boolean
  signedIn: boolean
  manageable: boolean
  admin: boolean
}

/* Resolve premium status for an already server-verified user. `admin` must
   come from getAuthenticatedAccess(), never from client input. */
export async function premiumStatusForUser(userId: string, admin: boolean): Promise<PremiumStatusData> {
  if (admin) return { premium: true, signedIn: true, manageable: false, admin: true }
  const { data, error } = await serviceClient.from('subscriptions').select('status, current_period_end, customer_id').eq('user_id', userId).maybeSingle()
  if (isMissingDatabaseFeature(error)) return { premium: false, signedIn: true, manageable: false, admin: false }
  if (error) throw new Error('Unable to verify AWM+ access.')
  return { premium: hasPremiumAccess(false, data), signedIn: true, manageable: Boolean(data?.customer_id), admin: false }
}
