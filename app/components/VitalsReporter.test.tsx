import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

const callbacks: ((metric: object) => void)[] = []
vi.mock('web-vitals', () => ({
  onCLS: (callback: (metric: object) => void) => callbacks.push(callback),
  onINP: (callback: (metric: object) => void) => callbacks.push(callback),
  onLCP: (callback: (metric: object) => void) => callbacks.push(callback),
}))
import VitalsReporter from './VitalsReporter'

it('publishes non-identifying Core Web Vitals to the GTM queue', async () => {
  const host = document.createElement('div')
  const root = createRoot(host)
  await act(async () => root.render(<VitalsReporter />))
  expect(callbacks).toHaveLength(3)
  await act(async () => callbacks[0]({ name: 'LCP', value: 1234, rating: 'good', id: 'metric-id' }))
  const dataLayer = (window as unknown as { dataLayer: Record<string, unknown>[] }).dataLayer
  expect(dataLayer).toContainEqual(expect.objectContaining({ event: 'web-vitals', metric_name: 'LCP', metric_value: 1234, page_path: '/' }))
  expect(JSON.stringify(dataLayer)).not.toContain('user')
  await act(async () => root.unmount())
})
