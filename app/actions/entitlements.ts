'use server'

import { fetchPremiumStatus } from '@/app/actions/premium'
import { resolveEntitlements, type Entitlements } from '@/app/lib/entitlements'
import { getAuthenticatedAccess } from '@/app/actions/auth'

export async function fetchEntitlements(): Promise<Entitlements> {
  const [status, access] = await Promise.all([fetchPremiumStatus(), getAuthenticatedAccess()])
  return resolveEntitlements(status.signedIn, status.premium, access?.role)
}

export async function requireEntitlement(feature: 'readBooks' | 'downloadBooks' | 'audiobooks'): Promise<Entitlements> {
  const entitlements = await fetchEntitlements()
  const allowed = feature === 'readBooks'
    ? entitlements.canReadBooks
    : feature === 'downloadBooks'
      ? entitlements.canDownloadBooks
      : entitlements.canUseAudiobooks
  if (!allowed) throw new Error(entitlements.signedIn ? 'AWM+ is required for this feature.' : 'Sign in to continue.')
  return entitlements
}
