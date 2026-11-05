/* PORTAL-AUTOMATION NOTE: driving the Stripe portal UI with synthetic
   events is unreliable (Stripe renders stacked non-semantic layers, so
   dispatched clicks can hit stale screens). Prefer API-driven transitions
   for cancel/undo (identical webhook events); keep portal phases manual.
   Comprehensive AWM+ lifecycle test on production:
   subscribe -> subscriber verification (UI + premium-gated API) ->
   portal cancel (with confirm) -> grace verification -> undo cancel ->
   resumption verification. Leaves the subscription ACTIVE.
   Usage: AWM_BASE_URL=https://www.arabicwithm.com STRIPE_TEST_SECRET_KEY=... STRIPE_TEST_EMAIL=... STRIPE_TEST_PASSWORD=... node --env-file=.env.local scripts/test-lifecycle.mjs */
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { createChunks } = require('@supabase/ssr/dist/main/utils/chunker.js')
const { stringToBase64URL } = require('@supabase/ssr/dist/main/utils/base64url.js')

const STRIPE_TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY
const baseUrl = process.env.AWM_BASE_URL ?? 'http://localhost:3000'
const email = process.env.STRIPE_TEST_EMAIL
const password = process.env.STRIPE_TEST_PASSWORD
const uid = '2bf7c7ea-44ab-48c7-aaf0-33a659d0d72c'
const GATED_BOOK = 'tpp'
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`) }

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
async function row() { const { data } = await db.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(); return data }
async function waitRow(pred, label, timeoutMs = 60000) { const t0 = Date.now(); while (Date.now() - t0 < timeoutMs) { const r = await row(); if (r && pred(r)) return r; await new Promise(s => setTimeout(s, 1500)) } throw new Error(`Timed out waiting for: ${label} (row=${JSON.stringify(await row())})`) }

const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({ email, password })
if (signInError || !signIn.session) throw new Error('sign-in failed')
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const chunks = createChunks(`sb-${ref}-auth-token`, `base64-${stringToBase64URL(JSON.stringify(signIn.session))}`)

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: baseUrl })
await context.addCookies(chunks.map(({ name, value }) => ({ name, value, url: baseUrl, sameSite: 'Lax' })))
const page = await context.newPage()
page.setDefaultTimeout(45000)

async function premiumProbe(expectOk, label) {
  const res = await page.request.get(`/api/books/${GATED_BOOK}/download?lang=ar`)
  check(label, expectOk ? res.status() === 200 : res.status() === 403, `HTTP ${res.status()}`)
}
async function openAwmDialog() {
  await page.goto('/books', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'AWM Plus', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'AWM Plus', exact: true })
  await dialog.waitFor()
  await dialog.getByText(/membership is active|Cancellation scheduled|didn.t go through|Renews on/).first().waitFor()
  return dialog
}
async function profileText() {
  await page.goto(`/profile/${uid}?tab=awm`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Manage AWM+', exact: true }).waitFor()
  return await page.locator('body').textContent()
}

const SKIP_SUBSCRIBE = process.env.SKIP_SUBSCRIBE === '1'

/* ── 1. Subscribe ── */
if (!SKIP_SUBSCRIBE) {
console.log('\n── 1. SUBSCRIBE ──')
await page.goto('/books', { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: 'AWM Plus', exact: true }).click()
const upgradeDialog = page.getByRole('dialog', { name: 'Upgrade to AWM+', exact: true })
await upgradeDialog.waitFor()
await upgradeDialog.getByRole('button', { name: 'Upgrade to AWM+', exact: true }).click()
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 })
await page.waitForLoadState('domcontentloaded')
await page.waitForTimeout(2500)
const emailInput = page.locator('input#email, input[name="email"]').first()
if (await emailInput.isVisible().catch(() => false)) await emailInput.fill(email)
const cardField = page.locator('input[name="cardNumber"]')
if (!(await cardField.isVisible().catch(() => false))) {
  await page.locator('#payment-method-label-card').click({ force: true })
  await cardField.waitFor({ state: 'visible' })
}
await cardField.fill('4242424242424242')
await page.locator('input[name="cardExpiry"]').fill('12 / 34')
await page.locator('input[name="cardCvc"]').fill('123')
await page.locator('input[name="billingName"]').fill('Lifecycle Test')
await page.getByRole('button', { name: /Pay and subscribe|Subscribe/ }).click()
await page.waitForURL(u => u.searchParams.get('checkout') === 'success' && (u.origin === new URL(baseUrl).origin || u.hostname.endsWith('arabicwithm.com')), { timeout: 60000 })
console.log('   paid, redirected to success')
const activeRow = await waitRow(r => r.status === 'active', 'row active via webhook')
check('webhook activated subscription', true, `${activeRow.subscription_id} until ${activeRow.current_period_end}`)

/* ── 2. Subscriber experience ── */
console.log('\n── 2. SUBSCRIBER EXPERIENCE ──')
const dialog1 = await openAwmDialog()
const dialogText1 = await dialog1.textContent() ?? ''
check('dialog shows membership active', /membership is active/.test(dialogText1))
check('dialog shows renewal date', /Renews on \d+ December 2026/.test(dialogText1), (dialogText1.match(/Renews on[^.]*/)?.[0] ?? 'no date').trim())
await page.screenshot({ path: '/tmp/lc-1-dialog-active.png', clip: { x: 400, y: 100, width: 640, height: 700 } })
await page.keyboard.press('Escape')
const profile1 = await profileText()
check('profile shows active subscription', /subscription is active|Renews on/.test(profile1))
await page.screenshot({ path: '/tmp/lc-2-profile-active.png', fullPage: false })
await premiumProbe(true, 'premium-gated book download works (HTTP 200)')
}

/* ── 3. Cancel via the billing portal (with confirm) ── */
console.log('\n── 3. CANCEL VIA PORTAL ──')
await page.goto(`/profile/${uid}?tab=awm`, { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: 'Manage AWM+', exact: true }).click()
await page.waitForURL(/billing\.stripe\.com/, { timeout: 60000 })
await page.waitForLoadState('domcontentloaded')
/* Stripe's portal renders non-semantic clickable divs — target exact text. */
const clickByText = async (text) => {
  const loc = page.getByText(text, { exact: true }).first()
  try {
    await loc.waitFor({ state: 'visible', timeout: 45000 })
  } catch (e) {
    await page.screenshot({ path: '/tmp/lc-portal-fail.png', fullPage: false })
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400)
    throw new Error(`"${text}" not visible. Page text: ${body}`)
  }
  await loc.dispatchEvent('click')
}
const dumpClickables = async () => JSON.stringify((await page.locator('button, [role="button"]').allTextContents()).filter(Boolean).map(t => t.trim().slice(0, 40)))
await clickByText('Cancel subscription')
await page.waitForTimeout(1800)
await page.screenshot({ path: '/tmp/lc-3-portal-confirm.png', fullPage: false })
let clicked = false
for (const name of ['Continue to cancellation', 'Confirm cancellation', 'Cancel subscription']) {
  const loc = page.getByText(name, { exact: true }).last()
  if (await loc.isVisible().catch(() => false)) { await loc.dispatchEvent('click'); clicked = true; console.log('   confirmed via:', name); break }
}
if (!clicked) throw new Error('no step-2 button found; clickables: ' + await dumpClickables())
await page.waitForTimeout(1800)
await page.screenshot({ path: '/tmp/lc-3b-portal-review.png', fullPage: false })
/* Step 3: final review screen — commit the cancellation. */
let finalClicked = false
for (const name of ['Cancel subscription', 'Confirm cancellation']) {
  const loc = page.getByText(name, { exact: true }).last()
  if (await loc.isVisible().catch(() => false)) { await loc.dispatchEvent('click'); finalClicked = true; console.log('   final commit via:', name); break }
}
if (!finalClicked) throw new Error('no final confirm found; clickables: ' + await dumpClickables())
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/lc-4-portal-canceled.png', fullPage: false })
const cancelRow = await waitRow(r => r.cancel_at_period_end === true && r.status === 'active', 'cancel_at_period_end=true via webhook')
check('webhook recorded scheduled cancellation', true, `status=${cancelRow.status}, ends ${cancelRow.current_period_end}`)

/* ── 4. Grace period: access continues, UI tells the truth ── */
console.log('\n── 4. GRACE PERIOD ──')
const dialog2 = await openAwmDialog()
const dialogText2 = await dialog2.textContent() ?? ''
check('dialog shows cancellation scheduled', /Cancellation scheduled/.test(dialogText2))
check('dialog names the end date', /you have access until \d+ December 2026/.test(dialogText2), (dialogText2.match(/Cancellation scheduled[^.]*\./)?.[0] ?? '').trim())
await page.screenshot({ path: '/tmp/lc-5-dialog-cancelling.png', clip: { x: 400, y: 100, width: 640, height: 700 } })
await page.keyboard.press('Escape')
const profile2 = await profileText()
check('profile warns with end date', /Cancellation scheduled — your access ends on \d+ December 2026/.test(profile2))
await page.screenshot({ path: '/tmp/lc-6-profile-cancelling.png', fullPage: false })
await premiumProbe(true, 'access continues until period end (download still 200)')

/* ── 5. Undo the cancel ("Don't cancel subscription") ── */
console.log('\n── 5. UNDO CANCEL ──')
await page.goto(`/profile/${uid}?tab=awm`, { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: 'Manage AWM+', exact: true }).click()
await page.waitForURL(/billing\.stripe\.com/, { timeout: 60000 })
await page.waitForLoadState('domcontentloaded')
await page.waitForTimeout(2000)
const undo = page.getByText("Don't cancel subscription", { exact: true }).first()
if (await undo.isVisible().catch(() => false)) {
  await undo.click()
  await page.waitForTimeout(1800)
  for (const name of ['Resume subscription', 'Confirm', 'Resume', 'Keep subscription']) {
    const loc = page.getByText(name, { exact: true }).last()
    if (await loc.isVisible().catch(() => false)) { await loc.dispatchEvent('click').catch(() => {}); console.log('   resume confirmed via:', name); break }
  }
} else {
  console.log('   no undo button visible; clickables:', await dumpClickables())
}
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/lc-7-portal-resumed.png', fullPage: false })
const resumedRow = await waitRow(r => r.cancel_at_period_end === false && r.status === 'active', 'cancel_at_period_end=false via webhook')
check('webhook recorded resumption', true, `status=${resumedRow.status}`)

/* ── 6. Back to normal subscriber ── */
console.log('\n── 6. RESUMED STATE ──')
const dialog3 = await openAwmDialog()
const dialogText3 = await dialog3.textContent() ?? ''
check('dialog back to renewal copy', /Renews on \d+ December 2026/.test(dialogText3))
check('no cancellation banner after undo', !/Cancellation scheduled/.test(dialogText3))
await page.keyboard.press('Escape')
await premiumProbe(true, 'download still 200 after resume')
const finalRow = await row()
console.log(`\nFinal: status=${finalRow.status}, cancel_at_period_end=${finalRow.cancel_at_period_end}, period_end=${finalRow.current_period_end}`)

const failed = results.filter(r => !r.ok)
console.log(`\n${failed.length === 0 ? '🎉 ALL ' + results.length + ' CHECKS PASSED' : '⚠️ ' + failed.length + ' FAILED: ' + failed.map(f => f.name).join('; ')}`)
await browser.close()
process.exit(failed.length === 0 ? 0 : 1)
