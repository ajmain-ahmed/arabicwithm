import { AsyncLocalStorage } from 'node:async_hooks'
const deadlines = new AsyncLocalStorage<AbortSignal>()
export function withDataDeadline<T>(milliseconds: number, operation: () => Promise<T>): Promise<T> { return deadlines.run(AbortSignal.timeout(milliseconds), operation) }
/** Bound the entire response body as well as connection establishment. Never
 * retry writes: a timed-out mutation may already have committed. */
export async function boundedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const deadline = AbortSignal.timeout(8000)
  const signal = AbortSignal.any([deadline, ...(init?.signal ? [init.signal] : []), ...(deadlines.getStore() ? [deadlines.getStore()!] : [])])
  const options = { ...init, signal }
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(input, options)
    if (attempt === 0 && method === 'GET' && [502, 503, 504, 522].includes(response.status)) {
      await response.body?.cancel()
      await new Promise(resolve => setTimeout(resolve, 250))
      signal.throwIfAborted()
      continue
    }
    return response
  }
}
