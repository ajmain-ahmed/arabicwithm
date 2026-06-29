// app/lib/supabase.ts

import { createClient as createServiceClient } from "@supabase/supabase-js"

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
  throw new Error("Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY")
}

export const serviceClient = createServiceClient(serviceUrl, serviceKey)
