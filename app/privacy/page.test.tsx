import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import PrivacyPolicyPage from './page'

it('describes current data practices without infrastructure vendors or the old contact address', () => {
  const html = renderToStaticMarkup(<PrivacyPolicyPage />)
  expect(html).toContain('support@arabicwithm.com')
  expect(html).toContain('Public profiles and sharing')
  expect(html).toContain('Payment information')
  expect(html).toContain('International processing')
  expect(html).toContain('Your rights and choices')
  expect(html).not.toContain('hello@arabicwithm.com')
  expect(html).not.toMatch(/Supabase|Stripe|Vercel|Google|YouTube|Cloudflare|Resend|Upstash/)
})
