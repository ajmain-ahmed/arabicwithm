'use server'
import { isMissingDatabaseFeature } from '@/app/lib/databaseErrors'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'
import { hasPremium, PREMIUM } from '@/app/lib/entitlements'
import { stripeClient, siteUrl } from '@/app/lib/billing'

export async function fetchPremiumStatus() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { premium: false, signedIn: false, manageable: false }
  const { data, error } = await serviceClient.from('subscriptions').select('status, current_period_end, customer_id').eq('user_id', userId).maybeSingle()
  if (isMissingDatabaseFeature(error)) return { premium: false, signedIn: true, manageable: false }
  if (error) throw new Error('Unable to verify AWM+ access.')
  return { premium: hasPremium(data), signedIn: true, manageable: Boolean(data?.customer_id) }
}
export async function startPremiumCheckout(): Promise<string> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to get AWM+.')
  const stripe = stripeClient()
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID
  if (!priceId) throw new Error('AWM+ billing is not configured yet.')
  const price = await stripe.prices.retrieve(priceId)
  if (!price.active || price.currency !== PREMIUM.currency || price.unit_amount !== PREMIUM.monthlyPence || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new Error('AWM+ price configuration is invalid.')
  const { data: account, error } = await serviceClient.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Unable to verify subscription.')
  if (hasPremium(account)) return managePremium()
  const customer = account?.customer_id ?? (await stripe.customers.create({ metadata: { user_id: userId } }, { idempotencyKey: `awm-customer-${userId}` })).id
  const { error: saveError } = await serviceClient.from('subscriptions').upsert({ user_id: userId, customer_id: customer }, { onConflict: 'user_id' })
  if (saveError) throw new Error('Unable to prepare billing account.')
  const existing = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })
  if (existing.data.some(s => ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(s.status))) return managePremium()
  const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 10 })
  if (open.data[0]?.url) return open.data[0].url
  const session = await stripe.checkout.sessions.create({ customer, mode: 'subscription', line_items: [{ price: priceId, quantity: 1 }], client_reference_id: userId, subscription_data: { metadata: { user_id: userId } }, success_url: `${siteUrl()}/?checkout=success`, cancel_url: `${siteUrl()}/?checkout=cancelled` }, { idempotencyKey: `awm-checkout-${userId}-${Math.floor(Date.now() / 1800000)}` })
  if (!session.url) throw new Error('Unable to start checkout.')
  return session.url
}
export async function managePremium(): Promise<string> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to manage AWM+.')
  const { data, error } = await serviceClient.from('subscriptions').select('customer_id').eq('user_id', userId).single()
  if (error || !data.customer_id) throw new Error('No billing account found.')
  return (await stripeClient().billingPortal.sessions.create({ customer: data.customer_id, return_url: `${siteUrl()}/` })).url
}
