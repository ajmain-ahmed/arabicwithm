import 'server-only'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { serviceClient } from '@/app/lib/supabase'
import { rateLimit, type RateLimitResult } from '@/app/lib/rateLimit'

const resultSchema = z.object({ ok: z.boolean(), retryAfterSeconds: z.number().int().positive() })

export async function durableRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const keyHash = createHash('sha256').update(key).digest('hex')
  try {
    const { data, error } = await serviceClient.rpc('website_rate_limit' as never, {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_ms: windowMs,
    } as never).abortSignal(AbortSignal.timeout(3000))
    if (error) throw error
    return resultSchema.parse(data)
  } catch (error) {
    console.error('[rate-limit] Durable limiter unavailable; using the local limiter', { code: (error as { code?: string })?.code })
    return rateLimit(key, limit, windowMs)
  }
}
