'use server'
import type Stripe from 'stripe'
import { getAuthenticatedAccess, getAuthenticatedUserId } from '@/app/actions/auth'
import { rateLimit } from '@/app/lib/rateLimit'
import { serviceClient } from '@/app/lib/supabase'
import { premiumStatusForUser, type PremiumStatusData } from '@/app/lib/premiumStatus'
import { hasPremium, PREMIUM } from '@/app/lib/entitlements'
import { stripeClient, siteUrl, premiumPriceId } from '@/app/lib/billing'

export type PremiumStatus = PremiumStatusData

type StripeClient = ReturnType<typeof stripeClient>

/* Stripe replays idempotent creates for 24h, which can hand back a customer
   that was deleted from the dashboard after the key was first used. Verify the
   mapped or replayed customer still exists before relying on it, and fall back
   to a fresh customer when it does not. */
async function ensureStripeCustomer(stripe: StripeClient, userId: string, existingId: string | null): Promise<string> {
  if (existingId) {
    try {
      await stripe.customers.retrieve(existingId)
      return existingId
    } catch (error) {
      if ((error as { code?: string }).code !== 'resource_missing') throw error
    }
  }
  let customerId = (await stripe.customers.create({ metadata: { user_id: userId } }, { idempotencyKey: `awm-customer-${userId}` })).id
  try {
    await stripe.customers.retrieve(customerId)
  } catch (error) {
    if ((error as { code?: string }).code !== 'resource_missing') throw error
    customerId = (await stripe.customers.create({ metadata: { user_id: userId } })).id
  }
  return customerId
}

export async function fetchPremiumStatus(): Promise<PremiumStatus> {
  const access = await getAuthenticatedAccess()
  if (!access) return { premium: false, signedIn: false, manageable: false, admin: false }
  return premiumStatusForUser(access.userId, access.admin)
}
export async function startPremiumCheckout(): Promise<string> {
  const access = await getAuthenticatedAccess()
  if (!access) throw new Error('Sign in to get AWM+.')
  if (access.admin) throw new Error('AWM+ is already included with administrator access.')
  const userId = access.userId
  const limited = rateLimit(`checkout:${userId}`, 5, 10 * 60 * 1000)
  if (!limited.ok) throw new Error('Too many checkout attempts. Please try again later.')
  const stripe = stripeClient()
  const priceId = premiumPriceId()
  const price = await stripe.prices.retrieve(priceId)
  if (!price.active || price.currency !== PREMIUM.currency || price.unit_amount !== PREMIUM.monthlyPence || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new Error('AWM+ price configuration is invalid.')
  const { data: account, error } = await serviceClient.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Unable to verify subscription.')
  if (hasPremium(account)) return managePremium()
  let customer = await ensureStripeCustomer(stripe, userId, account?.customer_id ?? null)
  let { error: saveError } = await serviceClient.from('subscriptions').upsert({ user_id: userId, customer_id: customer }, { onConflict: 'user_id' })
  if (saveError) throw new Error('Unable to prepare billing account.')
  let existing: Stripe.Subscription[]
  let open: Stripe.Checkout.Session[]
  try {
    existing = (await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })).data
    open = (await stripe.checkout.sessions.list({ customer, status: 'open', limit: 10 })).data
  } catch (error) {
    /* subscriptions.list tolerates a deleted customer (empty result) but
       checkout.sessions.list validates it and 404s; if the customer was
       removed mid-flow, remap once to a fresh customer and retry. */
    if ((error as { code?: string }).code !== 'resource_missing') throw error
    customer = (await stripe.customers.create({ metadata: { user_id: userId } })).id
    ;({ error: saveError } = await serviceClient.from('subscriptions').upsert({ user_id: userId, customer_id: customer }, { onConflict: 'user_id' }))
    if (saveError) throw new Error('Unable to prepare billing account.')
    existing = (await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })).data
    open = (await stripe.checkout.sessions.list({ customer, status: 'open', limit: 10 })).data
  }
  if (existing.some(s => ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(s.status))) return managePremium()
  if (open[0]?.url) return open[0].url
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
