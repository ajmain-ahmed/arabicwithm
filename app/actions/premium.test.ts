// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle,
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return {
    access: vi.fn(),
    premium:vi.fn(),
    from: vi.fn(() => query),
    maybeSingle,
  }
})

vi.mock('@/app/actions/auth', () => ({
  getAuthenticatedAccess: mocks.access,
  getAuthenticatedUserId: vi.fn(),
}))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: mocks.from } }))
vi.mock('@/app/lib/accountPremium',()=>({accountHasPremium:mocks.premium}))
vi.mock('@/app/lib/billing', () => ({ stripeClient: vi.fn(), siteUrl: vi.fn() }))

import { fetchPremiumStatus } from './premium'

describe('fetchPremiumStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.premium.mockResolvedValue(false)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('keeps signed-out users restricted', async () => {
    mocks.access.mockResolvedValue(null)
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: false, signedIn: false, manageable: false, admin: false })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('grants admins premium without querying a subscription', async () => {
    mocks.access.mockResolvedValue({ userId: 'admin-id', admin: true })
    mocks.premium.mockResolvedValue(true)
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: false, admin: true })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('keeps a normal free user restricted', async () => {
    mocks.access.mockResolvedValue({ userId: 'free-id', admin: false })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: false, signedIn: true, manageable: false, admin: false })
  })

  it('keeps active subscribers premium', async () => {
    mocks.access.mockResolvedValue({ userId: 'premium-id', admin: false })
    mocks.premium.mockResolvedValue(true)
    mocks.maybeSingle.mockResolvedValue({
      data: { status: 'active', current_period_end: '2999-01-01T00:00:00.000Z', customer_id: 'customer-id' },
      error: null,
    })
    await expect(fetchPremiumStatus()).resolves.toEqual({ premium: true, signedIn: true, manageable: true, admin: false })
  })
})

it('uses canonical manual access even when no paid subscription exists',async()=>{
 mocks.access.mockResolvedValue({userId:'manual-id',admin:false});mocks.premium.mockResolvedValue(true)
 mocks.maybeSingle.mockResolvedValue({data:null,error:null})
 await expect(fetchPremiumStatus()).resolves.toMatchObject({premium:true,manageable:false})
 expect(mocks.premium).toHaveBeenCalledWith('manual-id')
})
