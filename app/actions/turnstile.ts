'use server'

import { headers } from 'next/headers'
import { rateLimit } from '@/app/lib/rateLimit'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/* App-side Cloudflare Turnstile verification, per the existing-widget flow:
   the widget produces a single-use token; our server validates it against
   Cloudflare's siteverify endpoint before any protected action proceeds.

   This must stay the ONLY validation point: widget tokens are single-use, so
   do NOT also enable Supabase Auth → Captcha (it would re-validate the spent
   token and reject real users). Configure TURNSTILE_SECRET_KEY and leave
   Supabase Captcha disabled. */
export async function verifyTurnstileToken(token: string): Promise<{ ok: boolean; codes?: string[] }> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      console.error('[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is set but TURNSTILE_SECRET_KEY is missing; bot verification is disabled.')
    }
    return { ok: true }
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    return { ok: false, codes: ['invalid-input-response'] }
  }
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  if (!rateLimit(`turnstile:${ip ?? 'unknown'}`, 30, 60_000).ok) {
    return { ok: false, codes: ['rate-limited'] }
  }
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      console.error('[turnstile] siteverify HTTP', response.status)
      return { ok: false, codes: [`http-${response.status}`] }
    }
    const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (result.success !== true) {
      console.error('[turnstile] siteverify rejected token:', result['error-codes']?.join(',') ?? 'unknown')
      return { ok: false, codes: result['error-codes'] ?? ['unknown'] }
    }
    return { ok: true }
  } catch (error) {
    console.error('[turnstile] siteverify request failed:', error)
    return { ok: false, codes: ['request-failed'] }
  }
}
