import 'server-only'
import Stripe from 'stripe'
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('AWM+ billing is not configured yet.')
  if (key.startsWith('sk_live_') && process.env.STRIPE_LIVE_ENABLED !== 'true') throw new Error('Live billing is disabled.')
  return new Stripe(key)
}
export function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url) throw new Error('Site URL is not configured.')
  return new URL(url).origin
}
