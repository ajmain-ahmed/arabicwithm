import { stripeClient } from '@/app/lib/billing'
import { serviceClient } from '@/app/lib/supabase'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return new Response('Missing webhook configuration', { status: 400 })
  const stripe = stripeClient()
  let event
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET) }
  catch { return new Response('Invalid signature', { status: 400 }) }
  if (event.type !== 'customer.subscription.created' && event.type !== 'customer.subscription.updated' && event.type !== 'customer.subscription.deleted') return Response.json({ received: true })
  try {
    // Retrieve current state so delayed/retried events cannot reinstate stale access.
    const subscription = await stripe.subscriptions.retrieve(event.data.object.id)
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    const { data: account, error } = await serviceClient.from('subscriptions').select('user_id').eq('customer_id', customerId).single()
    if (error || !account) throw new Error('Unknown billing customer')
    const item = subscription.items.data.find(item => item.price.id === process.env.STRIPE_PREMIUM_PRICE_ID)
    const { error: saveError } = await serviceClient.rpc('apply_subscription_event', {
      p_user_id: account.user_id, p_event_created: event.created, p_subscription_id: subscription.id,
      p_status: item ? subscription.status : 'expired', p_period_end: new Date((item?.current_period_end ?? 0) * 1000).toISOString(),
      p_cancel_at_period_end: subscription.cancel_at_period_end,
    })
    if (saveError) throw saveError
    return Response.json({ received: true })
  } catch { return new Response('Unable to synchronize subscription', { status: 500 }) }
}
