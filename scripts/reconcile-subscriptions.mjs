/* Reconciles subscription state from Stripe into the subscriptions table.
   Stripe is the source of truth: every Stripe subscription is synced through
   the same apply_subscription_event RPC the webhook uses, and rows missing
   for a known customer are recreated from the customer's user_id metadata.
   Rows whose Stripe customer has vanished are reported for manual review.
   Run: node --env-file=.env.local scripts/reconcile-subscriptions.mjs */
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_PREMIUM_PRICE_ID']
const missing = required.filter((name) => !process.env[name])
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`)
  console.error('Run: node --env-file=.env.local scripts/reconcile-subscriptions.mjs')
  process.exit(1)
}
if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) console.warn('Warning: reconciling with a LIVE Stripe key.')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
const priceId = process.env.STRIPE_PREMIUM_PRICE_ID
const now = Math.floor(Date.now() / 1000)

let synced = 0
let created = 0
let failed = 0
const unmatched = []
const seenCustomers = new Set()

for await (const subscription of stripe.subscriptions.list({ status: 'all', expand: ['data.customer'], limit: 100 })) {
  const customer = subscription.customer
  const customerId = typeof customer === 'string' ? customer : customer.id
  seenCustomers.add(customerId)
  const { data: account } = await db.from('subscriptions').select('user_id').eq('customer_id', customerId).maybeSingle()
  let userId = account?.user_id ?? null
  if (!userId) {
    userId = typeof customer === 'object' ? customer?.metadata?.user_id ?? null : null
    if (!userId) { unmatched.push(customerId); continue }
    const { error } = await db.from('subscriptions').upsert({ user_id: userId, customer_id: customerId }, { onConflict: 'user_id' })
    if (error) { console.error(`Unable to create row for ${customerId}: ${error.message}`); failed += 1; continue }
    created += 1
  }
  const item = subscription.items.data.find((entry) => entry.price.id === priceId)
  const { error } = await db.rpc('apply_subscription_event', {
    p_user_id: userId,
    p_event_created: now,
    p_subscription_id: subscription.id,
    p_status: item ? subscription.status : 'expired',
    p_period_end: new Date((item?.current_period_end ?? 0) * 1000).toISOString(),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
  })
  if (error) { console.error(`Unable to sync ${subscription.id}: ${error.message}`); failed += 1; continue }
  synced += 1
}

const { data: rows } = await db.from('subscriptions').select('customer_id, subscription_id, status').not('subscription_id', 'is', null)
const stale = (rows ?? []).filter((row) => !seenCustomers.has(row.customer_id))

console.log(`Synced ${synced} subscription(s), created ${created} missing row(s), failed ${failed}.`)
if (unmatched.length) console.log(`Skipped ${unmatched.length} subscription(s) with no mapped user: ${unmatched.join(', ')}`)
if (stale.length) console.log(`Review ${stale.length} row(s) whose Stripe subscription was not listed: ${stale.map((row) => `${row.customer_id} (${row.status})`).join(', ')}`)
process.exitCode = failed ? 1 : 0
