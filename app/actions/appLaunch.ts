'use server'

import { headers } from 'next/headers'
import { createHash } from 'node:crypto'
import { getAuthClient } from '@/app/lib/supabase/server'
import { serviceClient } from '@/app/lib/supabase'
import { rateLimit } from '@/app/lib/rateLimit'
import { launchEmail, APP_LAUNCH_CONSENT_VERSION } from '@/app/lib/appLaunch'

export async function appLaunchPreference(): Promise<boolean> {
  const auth = await getAuthClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user?.email) return false
  const { data, error } = await serviceClient.from('email_preferences').select('subscribed').eq('email', user.email.trim().toLowerCase()).eq('purpose', 'app_launch').maybeSingle()
  if (error) throw new Error('Unable to load your notification preference.')
  return data?.subscribed === true
}

export async function setAppLaunchPreference(input: { email?: string; consent: boolean }): Promise<{ ok: boolean; message: string }> {
  const auth = await getAuthClient()
  const { data: { user } } = await auth.auth.getUser()
  const parsed = launchEmail.safeParse(user ? user.email : input.email)
  if (!parsed.success) return { ok: false, message: 'Enter a valid email address.' }
  if (typeof input.consent !== 'boolean' || (!user && !input.consent)) return { ok: false, message: 'Please agree to the app-launch email.' }
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const digest = (value: string) => createHash('sha256').update(value).digest('hex')
  if (!rateLimit(`app-launch-ip:${digest(ip)}`, 20, 3600000).ok || !rateLimit(`app-launch-email:${digest(parsed.data)}`, 5, 3600000).ok) return { ok: false, message: 'Please try again later.' }
  const row = { email: parsed.data, purpose: 'app_launch', subscribed: input.consent, consent_version: APP_LAUNCH_CONSENT_VERSION, consented_at: new Date().toISOString(), user_id: user?.id ?? null }
  // Guests can only opt in. Duplicates never overwrite an account's preference.
  const { error } = await serviceClient.from('email_preferences').upsert(row, { onConflict: 'email,purpose', ignoreDuplicates: !user })
  if (error) return { ok: false, message: 'We couldn’t save your preference. Please try again.' }
  return { ok: true, message: input.consent ? 'You’re on the list. We’ll let you know when the app is ready.' : 'App-launch emails are switched off.' }
}
