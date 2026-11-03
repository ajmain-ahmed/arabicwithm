'use server'

import { fetchPremiumStatus } from '@/app/actions/premium'
import { resolveEntitlements, resolveBookEntitlements, type Entitlements } from '@/app/lib/entitlements'
import { serviceClient } from '@/app/lib/supabase'
import { getAuthenticatedAccess } from '@/app/actions/auth'

export async function fetchEntitlements(bookId?: string): Promise<Entitlements> {
  const [status, access] = await Promise.all([fetchPremiumStatus(), getAuthenticatedAccess()])
  const entitlements = resolveEntitlements(status.signedIn, status.premium, access?.role)
  if (!bookId) return entitlements
  const { data: book, error } = await serviceClient.from('books').select('*').eq('id', bookId).maybeSingle()
  if (error) throw new Error('Unable to verify book access.')
  return resolveBookEntitlements(entitlements, book)
}

export async function requireEntitlement(feature: 'readBooks' | 'downloadBooks' | 'audiobooks', bookId?: string): Promise<Entitlements> {
  const entitlements = await fetchEntitlements(bookId)
  const allowed = feature === 'readBooks'
    ? entitlements.canReadBooks
    : feature === 'downloadBooks'
      ? entitlements.canDownloadBooks
      : entitlements.canUseAudiobooks
  if (!allowed) throw new Error(entitlements.signedIn ? 'AWM+ is required for this feature.' : 'Sign in to continue.')
  return entitlements
}
