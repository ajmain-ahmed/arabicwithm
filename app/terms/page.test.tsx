import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import TermsOfServicePage from './page'

it('covers current billing, account deletion and media terms without naming vendors', () => {
  const html = renderToStaticMarkup(<TermsOfServicePage />)
  expect(html).toContain('support@arabicwithm.com')
  expect(html).toContain('renew automatically until cancelled')
  expect(html).toContain('Account deletion does not by itself stop future subscription payments')
  expect(html).toContain('One-time support contributions are not subscriptions')
  expect(html).toContain('statutory consumer rights')
  expect(html).not.toContain('hello@arabicwithm.com')
  expect(html).not.toMatch(/Supabase|Stripe|Vercel|Google|YouTube|Cloudflare|Resend|Upstash/)
})
