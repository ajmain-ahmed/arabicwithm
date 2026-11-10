import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import SiteDialogs from './SiteDialogs'

vi.mock('@/app/support/SupportForm', () => ({ default: () => <div>Support form</div> }))

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.querySelectorAll('[role="presentation"]').forEach(node => node.remove())
})

it('opens Contact Us with every social and support email link', async () => {
  await act(async () => root.render(<SiteDialogs />))
  await act(async () => window.dispatchEvent(new CustomEvent('open-contact-dialog')))
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.textContent).toContain('Contact Us')
  expect(dialog.querySelector('img[src="/homepage/jiraiya.avif"]')).not.toBeNull()
  expect(dialog.querySelector('[aria-label="Close contact options"]')).toBeNull()
  const hrefs = [...dialog.querySelectorAll('a')].map(link => link.getAttribute('href'))
  expect(hrefs).toEqual([
    'https://www.tiktok.com/@arabicwithm',
    'https://www.instagram.com/arabicwithem/',
    'https://www.youtube.com/@arabicwithm',
    'mailto:support@arabicwithm.com',
  ])
})

it('opens Support Us without leaving the current route', async () => {
  await act(async () => root.render(<SiteDialogs />))
  await act(async () => window.dispatchEvent(new CustomEvent('open-support-dialog')))
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Support the Project')
  expect(document.body.textContent).toContain('Support form')
})
