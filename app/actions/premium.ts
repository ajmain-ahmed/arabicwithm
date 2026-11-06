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
  if (!access) return { premium: false, signedIn: false, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null }
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
  /* active/trialing/past_due/unpaid all have a live subscription the portal can
     manage (past_due/unpaid mainly need a payment-method update there). An
     incomplete subscription is an abandoned payment the portal cannot resume,
     so it must fall through to the open checkout session or a fresh one. */
  if (existing.some(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))) return managePremium()
  if (open[0]?.url) return open[0].url
  const session = await stripe.checkout.sessions.create({ customer, mode: 'subscription', line_items: [{ price: priceId, quantity: 1 }], client_reference_id: userId, subscription_data: { metadata: { user_id: userId } }, success_url: `${siteUrl()}/?checkout=success`, cancel_url: `${siteUrl()}/?checkout=cancelled` }, { idempotencyKey: `awm-checkout-${userId}-${Math.floor(Date.now() / 1800000)}` })
  if (!session.url) throw new Error('Unable to start checkout.')
  return session.url
}
export async function managePremium(flow?: 'payment-method'): Promise<string> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to manage AWM+.')
  const limited = rateLimit(`manage-billing:${userId}`, 8, 10 * 60 * 1000)
  if (!limited.ok) throw new Error('Too many attempts. Please try again later.')
  const { data, error } = await serviceClient.from('subscriptions').select('customer_id').eq('user_id', userId).single()
  if (error || !data.customer_id) throw new Error('No billing account found.')
  /* flow_data deep links: 'payment-method' lands on the update-card screen
     instead of the generic portal home. */
  return (await stripeClient().billingPortal.sessions.create({
    customer: data.customer_id,
    return_url: `${siteUrl()}/profile`,
    ...(flow === 'payment-method' ? { flow_data: { type: 'payment_method_update' } } : {}),
  })).url
}

/* In-product auto-renew toggle. The Stripe-hosted portal's cancellation flow
   has repeatedly shown users a "canceled" confirmation without the change
   persisting, so renewal control lives here: the same cancel_at_period_end
   update the portal makes, applied directly and verified through our own
   webhook-synced state. The webhook remains the source of truth for the DB. */
export async function setPremiumRenewal(renew: boolean): Promise<PremiumStatus> {
  const access = await getAuthenticatedAccess()
  if (!access) throw new Error('Sign in to manage AWM+.')
  if (access.admin) throw new Error('AWM+ is included with administrator access.')
  const userId = access.userId
  const limited = rateLimit(`renewal:${userId}`, 8, 10 * 60 * 1000)
  if (!limited.ok) throw new Error('Too many attempts. Please try again later.')
  const { data: account, error } = await serviceClient.from('subscriptions').select('customer_id').eq('user_id', userId).maybeSingle()
  if (error || !account?.customer_id) throw new Error('No billing account found.')
  /* Resolve the live subscription from Stripe rather than trusting the row:
     between a re-subscribe checkout and the webhook sync, the row can still
     point at the previous (canceled) subscription. */
  let subscriptionId: string
  try {
    const subs = (await stripeClient().subscriptions.list({ customer: account.customer_id, status: 'all', limit: 100 })).data
    const live = subs.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))
    if (!live) throw new Error('Your subscription is no longer active.')
    subscriptionId = live.id
  } catch (cause) {
    if ((cause as { code?: string }).code === 'resource_missing') throw new Error('Your subscription is no longer active.')
    throw cause
  }
  const stripe = stripeClient()
  try {
    if (renew) {
      /* Resuming must clear BOTH signals: flipping cancel_at_period_end back
         does not clear a cancel_at timestamp written by newer Stripe flows —
         the subscription would still cancel at that time. Stripe rejects both
         params in one update, so clear them sequentially. */
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })
      await stripe.subscriptions.update(subscriptionId, { cancel_at: '' as unknown as number })
    } else {
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    }
  } catch (cause) {
    if ((cause as { code?: string }).code === 'resource_missing') throw new Error('Your subscription is no longer active.')
    throw new Error('Unable to update your subscription. Please try again.')
  }
  return premiumStatusForUser(userId, false)
}
