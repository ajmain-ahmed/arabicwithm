import type Stripe from 'stripe'
import { stripeClient, premiumPriceId } from '@/app/lib/billing'
import { serviceClient } from '@/app/lib/supabase'
export const runtime = 'nodejs'

/* The customer→user mapping normally lands at checkout start. If that write
   never persisted (checkout succeeded but the upsert failed), subscription
   events would 500 forever and the member would pay without access. The
   events themselves carry the user id (checkout session reference and
   subscription metadata), so reconcile the mapping from them when needed.
   Insert-only: a retried event for a since-replaced customer must never
   clobber the user's current mapping. */
async function ensureCustomerMapping(userId: string, customerId: string): Promise<boolean> {
  const { error } = await serviceClient
    .from('subscriptions')
    .upsert({ user_id: userId, customer_id: customerId }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (error) console.error('[billing] Unable to persist billing customer mapping', { userId, customerId, error })
  return !error
}

async function resolveUserIdForCustomer(customerId: string, metadataUserId?: string | null): Promise<string | null> {
  const { data: account, error } = await serviceClient.from('subscriptions').select('user_id').eq('customer_id', customerId).single()
  if (!error && account) return account.user_id
  if (metadataUserId && await ensureCustomerMapping(metadataUserId, customerId)) return metadataUserId
  return null
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return new Response('Missing webhook configuration', { status: 400 })
  const stripe = stripeClient()
  let event
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET) }
  catch { return new Response('Invalid signature', { status: 400 }) }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      const customer = session.customer
      const customerId = typeof customer === 'string' ? customer : customer?.id ?? null
      if (session.mode === 'subscription' && userId && customerId) await ensureCustomerMapping(userId, customerId)
      return Response.json({ received: true })
    }
    /* Disputes and refunds are signals for a human, not entitlement state: a
       dispute is not a loss and the subscription usually remains active and
       owed, so access is deliberately left alone. Log loudly for alerting
       and review in the Stripe dashboard. */
    if (event.type === 'charge.dispute.created' || event.type === 'charge.refunded') {
      const obj = event.data.object as { id?: string; amount?: number; reason?: string; status?: string }
      console.error('[billing] Review required:', event.type, JSON.stringify({ id: obj.id, amount: obj.amount, reason: obj.reason, status: obj.status }))
      return Response.json({ received: true })
    }
    if (event.type !== 'customer.subscription.created' && event.type !== 'customer.subscription.updated' && event.type !== 'customer.subscription.deleted') return Response.json({ received: true })
    // Retrieve current state so delayed/retried events cannot reinstate stale access.
    const subscription = await stripe.subscriptions.retrieve(event.data.object.id)
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    const userId = await resolveUserIdForCustomer(customerId, subscription.metadata?.user_id ?? null)
    if (!userId) throw new Error('Unknown billing customer')
    const item = subscription.items.data.find(item => item.price.id === premiumPriceId())
    /* Stripe's modern cancellation signal is the cancel_at timestamp; the
       legacy cancel_at_period_end flag is not always set by newer flows
       (e.g. the billing portal's cancel writes cancel_at only). Treat either
       as "scheduled to cancel", and keep cancel_at as the expiration. */
    const cancelScheduled = subscription.cancel_at_period_end || subscription.cancel_at !== null
    const { error: saveError } = await serviceClient.rpc('apply_subscription_event', {
      p_user_id: userId, p_event_created: event.created, p_subscription_id: subscription.id,
      p_status: item ? subscription.status : 'expired', p_period_end: new Date((item?.current_period_end ?? 0) * 1000).toISOString(),
      p_cancel_at_period_end: cancelScheduled, p_started_at: new Date((subscription.created ?? 0) * 1000).toISOString(),
    })
    if (saveError) throw saveError
    return Response.json({ received: true })
  } catch (error) {
    console.error('[billing] Webhook processing failed', { eventType: event.type, error })
    return new Response('Unable to synchronize subscription', { status: 500 })
  }
}
