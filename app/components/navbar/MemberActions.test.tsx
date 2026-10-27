import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: null as { id: string; user_metadata: Record<string, unknown> } | null,
  promptOpen: false,
}))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, session: null, loading: false }) }))
vi.mock('@/app/components/PremiumPrompt', () => ({ default: ({ open }: { open: boolean }) => { mocks.promptOpen = open; return open ? <div data-premium-prompt /> : null } }))
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    const Lazy = (props: Record<string, unknown>) => {
      const [Component, setComponent] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null)
      React.useEffect(() => { void loader().then((mod) => setComponent(() => mod.default)) }, [])
      return Component ? <Component {...props} /> : null
    }
    return Lazy
  },
}))

import React from 'react'
import MemberActions from './MemberActions'
import { LEARNING_ACTIVITY_EVENT, localDateKey } from '@/app/lib/activity'

let host: HTMLDivElement, root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.user = { id: 'user-id', user_metadata: { full_name: 'Test User' } }
  mocks.promptOpen = false
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('shows the streak count from user metadata and the AWM+ button', async () => {
  const activeDates = Array.from({ length: 4 }, (_, offset) => {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    return localDateKey(date)
  })
  mocks.user = { id: 'user-id', user_metadata: { learning_activity: { activeDates, daily: activeDates.map(date => ({ date, activeSeconds: 60 })), totalSeconds: 240 } } }
  await act(async () => root.render(<MemberActions />))
  const pill = host.querySelector('[aria-label="4 day streak"]')
  expect(pill?.textContent).toBe('Streak')
  expect([...host.querySelectorAll('button')].some(button => button.textContent === 'AWM+')).toBe(true)
})

it('updates the streak when a learning-activity event arrives', async () => {
  await act(async () => root.render(<MemberActions />))
  expect(host.querySelector('[aria-label="0 day streak"]')?.textContent).toBe('Streak')
  const today = localDateKey(new Date())
  const activity = { activeDates: [today], daily: [{ date: today, activeSeconds: 90 }], totalSeconds: 90 }
  await act(async () => {
    window.dispatchEvent(new CustomEvent(LEARNING_ACTIVITY_EVENT, { detail: { userId: 'user-id', activity } }))
  })
  expect(host.querySelector('[aria-label="1 day streak"]')?.textContent).toBe('Streak')
})

it('opens the premium prompt from the AWM+ button', async () => {
  await act(async () => root.render(<MemberActions />))
  const button = [...host.querySelectorAll('button')].find(item => item.textContent === 'AWM+') as HTMLElement
  await act(async () => button.click())
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)) })
  expect(mocks.promptOpen).toBe(true)
})

it('renders nothing for signed-out visitors', async () => {
  mocks.user = null
  await act(async () => root.render(<MemberActions />))
  expect(host.textContent).toBe('')
})
