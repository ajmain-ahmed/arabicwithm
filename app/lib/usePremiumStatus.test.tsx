import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { PremiumStatus } from '@/app/actions/premium'
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@/app/actions/premium', () => ({ fetchPremiumStatus: mocks.fetch }))
import { usePremiumStatus } from './usePremiumStatus'
import { resetPremiumStatusCache, refreshPremiumStatus, readPremiumStatus } from './premiumStatusCache'
const free: PremiumStatus = { premium: false, admin: false, signedIn: true, manageable: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false, startedAt: null }
const member = { ...free, premium: true }
let host: HTMLDivElement, root: Root
function Surfaces({ userId }: { userId?: string }) {
  return <>{['navbar', 'footer', 'card'].map(name => <Surface key={name} userId={userId} name={name} />)}</>
}
function Surface({ userId, name }: { userId?: string; name: string }) {
  const status = usePremiumStatus(userId)
  return <span data-surface={name}>{status ? status.premium || status.admin ? 'active' : 'free' : 'unknown'}</span>
}
async function render(userId?: string) { await act(async () => root.render(<Surfaces userId={userId} />)) }
function states() { return [...host.querySelectorAll('span')].map(el => el.textContent) }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  resetPremiumStatusCache(); mocks.fetch.mockReset(); mocks.fetch.mockResolvedValue(free)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); resetPremiumStatusCache() })
it('shares a single initial request and a single expiry refresh across all surfaces', async () => {
  mocks.fetch.mockResolvedValue({ ...member, cancelAtPeriodEnd: true })
  await render('member'); expect(states()).toEqual(['active', 'active', 'active']); expect(mocks.fetch).toHaveBeenCalledOnce()
  mocks.fetch.mockResolvedValue(free)
  await act(async () => window.dispatchEvent(new Event('account-access-changed')))
  expect(states()).toEqual(['free', 'free', 'free']); expect(mocks.fetch).toHaveBeenCalledTimes(2)
})
it('does not fetch for guests and clears branding immediately on signout', async () => {
  await render(); expect(mocks.fetch).not.toHaveBeenCalled()
  mocks.fetch.mockResolvedValue(member); await render('member'); expect(states()).toEqual(['active', 'active', 'active'])
  await render(); expect(states()).toEqual(['unknown', 'unknown', 'unknown'])
})
it('never lets a late result from the previous account replace the current snapshot', async () => {
  let finish!: (status: PremiumStatus) => void
  mocks.fetch.mockImplementationOnce(() => new Promise<PremiumStatus>(resolve => { finish = resolve }))
  await render('old'); await render('new'); expect(states()).toEqual(['free', 'free', 'free'])
  await act(async () => finish(member)); expect(states()).toEqual(['free', 'free', 'free']); expect(readPremiumStatus('old')).toBeNull()
})
it('removes stale active branding consistently when verification fails and recovers on focus', async () => {
  mocks.fetch.mockResolvedValue(member); await render('member')
  mocks.fetch.mockRejectedValue(new Error('unavailable'))
  await act(async () => { await refreshPremiumStatus('member').catch(() => {}) })
  expect(states()).toEqual(['unknown', 'unknown', 'unknown'])
  mocks.fetch.mockResolvedValue(member)
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(states()).toEqual(['active', 'active', 'active'])
})
it('ignores an invalidated in-flight response after reset', async () => {
  let finish!: (status: PremiumStatus) => void
  mocks.fetch.mockImplementationOnce(() => new Promise<PremiumStatus>(resolve => { finish = resolve }))
  await render('member'); await act(async () => resetPremiumStatusCache())
  await act(async () => finish(member)); expect(states()).toEqual(['unknown', 'unknown', 'unknown'])
})
