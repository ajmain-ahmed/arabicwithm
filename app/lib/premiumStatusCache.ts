import { fetchPremiumStatus, type PremiumStatus } from '@/app/actions/premium'

/* Shared client snapshot of the server premium status so AWM+ surfaces can
   render instantly and re-verify in the background instead of blocking every
   opening on a round trip. Entries expire quickly; server actions remain the
   source of truth and checkout/management flows still hit the server. */

const TTL_MS = 60_000

let cached: { key: string; status: PremiumStatus; at: number } | null = null
let inflight: Promise<PremiumStatus> | null = null

export function readPremiumStatus(key: string): PremiumStatus | null {
  return cached && cached.key === key && Date.now() - cached.at < TTL_MS ? cached.status : null
}

function request(key: string, force: boolean): Promise<PremiumStatus> {
  if (!force) {
    const fresh = readPremiumStatus(key)
    if (fresh) return Promise.resolve(fresh)
    if (inflight) return inflight
  }
  const promise = fetchPremiumStatus()
    .then(status => {
      /* A newer forced request may have replaced us; only the latest write. */
      if (inflight === promise) cached = { key, status, at: Date.now() }
      return status
    })
    .finally(() => {
      if (inflight === promise) inflight = null
    })
  inflight = promise
  return promise
}

/** Resolves immediately from a fresh snapshot when one exists for this identity. */
export function getPremiumStatus(key: string): Promise<PremiumStatus> {
  return request(key, false)
}

/** Always re-verifies against the server; retries and entitlement changes use this. */
export function refreshPremiumStatus(key: string): Promise<PremiumStatus> {
  return request(key, true)
}

if (typeof window !== 'undefined') {
  window.addEventListener('account-access-changed', () => {
    cached = null
    inflight = null
  })
}

/* Module state survives component mounts within a session; tests reset it. */
export function resetPremiumStatusCache(): void {
  cached = null
  inflight = null
}
