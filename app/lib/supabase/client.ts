import { createBrowserClient } from '@supabase/ssr'

type SupabaseClient = ReturnType<typeof createBrowserClient>

let cachedClient: SupabaseClient | null = null

function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    )
  }
  return createBrowserClient(url, key)
}

function getClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient()
  }
  return cachedClient
}

/**
 * Lazy proxy for the browser Supabase client. It only creates the real client
 * when a property is accessed, so missing public env vars do not crash the
 * build during static prerendering.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
