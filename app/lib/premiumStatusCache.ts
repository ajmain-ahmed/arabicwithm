import { fetchPremiumStatus, type PremiumStatus } from '@/app/actions/premium'

/* Shared client snapshot of the server premium status so AWM+ surfaces can
   render instantly and re-verify in the background instead of blocking every
   opening on a round trip. Entries expire quickly; server actions remain the
   source of truth and checkout/management flows still hit the server. */

const TTL_MS = 60_000

let cached: { key: string; status: PremiumStatus; at: number } | null = null
let inflight: Promise<PremiumStatus> | null = null
let inflightKey: string | null = null
const subscribers = new Map<() => void, string>()
let stopWatching: (() => void) | null = null
function notify() { for (const listener of subscribers.keys()) listener() }
function revalidateSubscribers() {
  for (const key of new Set(subscribers.values())) void refreshPremiumStatus(key).catch(() => {})
}

/** One shared refresh lifecycle for every surface observing the canonical snapshot. */
export function subscribePremiumStatus(key: string, listener: () => void): () => void {
  subscribers.set(listener, key)
  if (!stopWatching) {
    const visible = () => { if (document.visibilityState === 'visible') revalidateSubscribers() }
    window.addEventListener('focus', revalidateSubscribers)
    document.addEventListener('visibilitychange', visible)
    stopWatching = () => {
      window.removeEventListener('focus', revalidateSubscribers)
      document.removeEventListener('visibilitychange', visible)
    }
  }
  void getPremiumStatus(key).catch(() => {})
  return () => {
    subscribers.delete(listener)
    if (!subscribers.size) { stopWatching?.(); stopWatching = null }
  }
}

/* Reads return the latest snapshot for this identity whenever one exists, of
   any age: surfaces render stale-while-revalidate and the background fetch
   swaps in fresh state. The TTL below is only the re-verification horizon
   for getPremiumStatus, never a display cutoff. Server actions remain the
   source of truth for checkout/management decisions. */
export function readPremiumStatus(key: string): PremiumStatus | null {
  return cached && cached.key === key ? cached.status : null
}

function request(key: string, force: boolean): Promise<PremiumStatus> {
  if (!force && inflight && inflightKey === key) return inflight
  if (!force && cached && cached.key === key) {
    if (Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.status)
  }
  const promise = fetchPremiumStatus()
    .then(status => {
      /* A newer forced request may have replaced us; only the latest write. */
      if (inflight === promise) { cached = { key, status, at: Date.now() }; notify() }
      return status
    })
    .catch(error => {
      if (inflight === promise && cached?.key === key) { cached = null; notify() }
      throw error
    })
    .finally(() => {
      if (inflight === promise) { inflight = null; inflightKey = null }
    })
  inflightKey = key
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
    resetPremiumStatusCache()
    revalidateSubscribers()
  })
}

/* Module state survives component mounts within a session; tests reset it. */
export function resetPremiumStatusCache(): void {
  cached = null
  inflight = null
  inflightKey = null
  notify()
}
