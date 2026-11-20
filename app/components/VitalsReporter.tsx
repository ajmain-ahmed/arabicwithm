'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

export default function VitalsReporter() {
  useEffect(() => {
    performance.mark('awm-hydrated')
    document.documentElement.dataset.awmHydrated = 'true'
    window.dispatchEvent(new Event('awm-hydrated'))
    const report = (metric: Metric) => {
      const target = window as Window & { dataLayer?: Record<string, unknown>[] }
      target.dataLayer ??= []
      target.dataLayer.push({
        event: 'web-vitals',
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        metric_id: metric.id,
        page_path: window.location.pathname,
      })
    }
    onCLS(report)
    onINP(report)
    onLCP(report)
  }, [])
  return null
}
