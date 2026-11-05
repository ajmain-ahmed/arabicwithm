/* End-to-end Stripe test for AWM+ billing.
   Flow: sign in -> AWM+ dialog -> Stripe Checkout (test card) -> webhook via
   `stripe listen` -> premium active -> billing portal opens -> cancel via
   Stripe API -> webhook -> premium revoked.

   Requires: dev server on :3000, `stripe listen --forward-to localhost:3000/api/billing/webhook`,
   and STRIPE_WEBHOOK_SECRET matching the listen session in .env.local.

   Usage:
     STRIPE_TEST_EMAIL=... STRIPE_TEST_PASSWORD=... node --env-file=.env.local scripts/test-stripe-checkout.mjs
*/
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { createRequire } from 'node:module'

/* Reuse @supabase/ssr's own cookie chunker so oversized session cookies are
   stored exactly the way createBrowserClient writes them (base64url chunks of
   <=3180 encoded chars named key.0, key.1, ...). */
const require = createRequire(import.meta.url)
const { createChunks } = require('@supabase/ssr/dist/main/utils/chunker.js')
const { stringToBase64URL } = require('@supabase/ssr/dist/main/utils/base64url.js')

const email = process.env.STRIPE_TEST_EMAIL
const password = process.env.STRIPE_TEST_PASSWORD
const baseUrl = process.env.AWM_BASE_URL ?? 'http://localhost:3000'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!email || !password) throw new Error('Set STRIPE_TEST_EMAIL and STRIPE_TEST_PASSWORD.')

const step = (msg) => console.log(`\n=== ${msg} ===`)
const fail = (msg) => { throw new Error(msg) }

const STRIPE_TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY
if (!STRIPE_TEST_SECRET_KEY) throw new Error('Set STRIPE_TEST_SECRET_KEY to the Stripe test secret key.')

/* ── 1. Sign in through the Supabase Auth API (same call AuthDialog makes
   after Turnstile) so we can install a real session cookie. ── */
step('Signing in via Supabase Auth API')
const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({ email, password })
if (signInError || !signIn.session) fail(`Sign-in failed: ${signInError?.message}`)
const userId = signIn.session.user.id
console.log('signed in as', userId)

/* ── 2. Install the session cookie the way @supabase/ssr stores it. ── */
const ref = new URL(supabaseUrl).hostname.split('.')[0]
const storedValue = `base64-${stringToBase64URL(JSON.stringify(signIn.session))}`
const chunks = createChunks(`sb-${ref}-auth-token`, storedValue)

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: baseUrl })
await context.addCookies(chunks.map(({ name, value }) => ({ name, value, url: baseUrl, sameSite: 'Lax' })))
const page = await context.newPage()
page.setDefaultTimeout(60000)

/* ── 3. Open the AWM+ dialog and start checkout. ── */
step('Opening AWM+ dialog on /books')
await page.goto('/books', { waitUntil: 'domcontentloaded' })
const awmButton = page.getByRole('button', { name: 'AWM Plus', exact: true })
await awmButton.waitFor()
await awmButton.click()
const upgradeDialog = page.getByRole('dialog', { name: 'Upgrade to AWM+', exact: true })
await upgradeDialog.waitFor()
console.log('upgrade dialog visible')

step('Clicking "Upgrade to AWM+" -> Stripe Checkout')
await upgradeDialog.getByRole('button', { name: 'Upgrade to AWM+', exact: true }).click()
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 })
console.log('on Stripe Checkout:', page.url().slice(0, 72) + '…')

/* ── 4. Complete checkout with the universal test card. ── */
step('Filling test card 4242…')
await page.waitForLoadState('domcontentloaded')
await page.waitForTimeout(2500)
const emailInput = page.locator('input#email, input[name="email"]').first()
if (await emailInput.isVisible().catch(() => false)) await emailInput.fill(email)
const cardNumberField = page.locator('input[name="cardNumber"]')
if (!(await cardNumberField.isVisible().catch(() => false))) {
  await page.locator('#payment-method-label-card').click({ force: true })
  await cardNumberField.waitFor({ state: 'visible' })
}
/* Card fields render directly in the checkout page (camelCase names). */
await page.locator('input[name="cardNumber"]').fill('4242424242424242')
await page.locator('input[name="cardExpiry"]').fill('12 / 34')
await page.locator('input[name="cardCvc"]').fill('123')
await page.locator('input[name="billingName"]').fill('Stripe Test')
await page.getByRole('button', { name: /Pay and subscribe|Subscribe|Start trial/ }).click()
console.log('submitted checkout')

await page.waitForURL(u => u.searchParams.get('checkout') === 'success' && (u.origin === new URL(baseUrl).origin || u.hostname.endsWith('arabicwithm.com')), { timeout: 60000 })
console.log('redirected back:', page.url())

/* ── 5. Wait for the webhook to mark the subscription active. ── */
step('Waiting for webhook (customer.subscription.created)')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
let row = null
for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 1500))
  const { data } = await db.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  if (data?.status === 'active') { row = data; break }
}
if (!row) fail('Subscription did not become active within 30s — check stripe listen and dev server logs.')
console.log('subscriptions row:', JSON.stringify({ status: row.status, customer_id: row.customer_id, subscription_id: row.subscription_id, current_period_end: row.current_period_end }))

/* ── 6. Confirm the UI now shows AWM+ active. ── */
step('Verifying premium in the UI')
await page.goto('/books', { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: 'AWM Plus', exact: true }).click()
const activeDialog = page.getByRole('dialog', { name: 'AWM Plus', exact: true })
await activeDialog.waitFor()
await activeDialog.getByText(/membership is active|access is active/).waitFor()
console.log('AWM+ membership shown as active')

/* ── 7. Manage AWM+: profile page CTA opens the Stripe billing portal. ── */
step('Opening Manage AWM+ (billing portal)')
await page.goto(`/profile/${userId}?tab=awm`, { waitUntil: 'domcontentloaded' })
const manageButton = page.getByRole('button', { name: 'Manage AWM+', exact: true })
await manageButton.waitFor()
await manageButton.click()
await page.waitForURL(/billing\.stripe\.com/, { timeout: 60000 })
await page.waitForLoadState('domcontentloaded')
console.log('billing portal opened:', page.url().slice(0, 64) + '…')
await page.goto('/books', { waitUntil: 'domcontentloaded' })

/* ── 8. Cancel the subscription via the Stripe API (deterministic) and let
   the subscription.deleted webhook flow back through stripe listen. ── */
step('Cancelling subscription via Stripe API')
const cancelRes = await fetch(`https://api.stripe.com/v1/subscriptions/${row.subscription_id}`, {
  method: 'DELETE',
  headers: { authorization: `Bearer ${STRIPE_TEST_SECRET_KEY}` },
})
if (!cancelRes.ok) fail(`Cancel failed: ${cancelRes.status} ${await cancelRes.text()}`)
console.log('subscription canceled in Stripe')

let revoked = false
for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 1500))
  const { data } = await db.from('subscriptions').select('status').eq('user_id', userId).maybeSingle()
  if (data && data.status !== 'active') { revoked = true; console.log('subscriptions status now:', data.status); break }
}
if (!revoked) fail('Subscription status did not change after cancellation.')

/* ── 9. Confirm the UI reverts to the upgrade prompt. ── */
step('Verifying premium revoked in the UI')
await page.goto('/books', { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: 'AWM Plus', exact: true }).click()
const revertDialog = page.getByRole('dialog', { name: 'Upgrade to AWM+', exact: true })
await revertDialog.waitFor()
console.log('upgrade dialog shown again — premium revoked end-to-end')

step('ALL CHECKS PASSED')
await browser.close()
process.exit(0)
