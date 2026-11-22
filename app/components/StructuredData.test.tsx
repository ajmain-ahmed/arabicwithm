import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import StructuredData from './StructuredData'

it('renders JSON-LD without allowing content to close the script element', () => {
  const html = renderToStaticMarkup(<StructuredData data={{ '@context': 'https://schema.org', name: '</script><script>alert(1)</script>' }} />)
  expect(html).toContain('application/ld+json')
  expect(html).toContain('\\u003c/script>')
  expect(html).not.toContain('</script><script>alert(1)</script>')
})
