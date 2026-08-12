// app/lib/supabase.ts

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type Database } from "./supabase/database.types"

type ServiceClient = ReturnType<typeof createServiceClient<Database>>

let cachedClient: ServiceClient | null = null

function createClient(): ServiceClient {
  const serviceUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceUrl || !serviceKey) {
    throw new Error("Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY")
  }
  return createServiceClient<Database>(serviceUrl, serviceKey)
}

export function getServiceClient(): ServiceClient {
  if (!cachedClient) {
    cachedClient = createClient()
  }
  return cachedClient
}

export function hasServiceClientConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
}

/**
 * Backwards-compatible lazy proxy. It only creates the real Supabase client
 * when a property is accessed, so missing env vars do not crash the process
 * at module evaluation (which happens during `next build`).
 */
export const serviceClient = new Proxy({} as ServiceClient, {
  get(_target, prop, receiver) {
    const client = getServiceClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
})
