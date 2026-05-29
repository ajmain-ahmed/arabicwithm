/*
  Simple in-memory rate limiter for Server Actions.
  NOT suitable for multi-instance deployments (use Redis for that).
  Sufficient for single-instance Vercel deployments.
*/

type LimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, LimitEntry>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  cleanup()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}
