import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const home = vi.hoisted(() => ({
  user: null as { id: string; user_metadata: Record<string, unknown> } | null,
  statsRendered: false,
}))
vi.mock('@/app/actions/forYou',()=>({fetchHomeForYouSpotlight:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: home.user, session: null, loading: false }) }))
vi.mock('@/app/components/ThemeProvider', () => ({ useColorMode: () => ({ mode: 'light', toggleColorMode: vi.fn() }) }))
vi.mock('@/app/actions/activity', () => ({ fetchLearningActivity: vi.fn() }))
vi.mock('@/app/actions/profiles', () => ({ fetchMyDisplayName: vi.fn(() => Promise.resolve(null)) }))
vi.mock('@/app/components/PremiumPrompt', () => ({ default: () => null }))
vi.mock('@/app/actions/premium', () => ({
  startPremiumCheckout: vi.fn(),
  fetchPremiumStatus: vi.fn(async () => ({ premium: false, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false })),
}))
vi.mock('@/app/lib/premiumStatusCache', () => ({
  readPremiumStatus: () => null,
  getPremiumStatus: () => Promise.resolve({ premium: false, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false }),
  refreshPremiumStatus: () => Promise.resolve({ premium: false, signedIn: true, manageable: false, admin: false, cancelAtPeriodEnd: false, periodEnd: null, paymentIssue: false }),
}))
vi.mock('./LearningStats', () => ({
  default: () => {
    home.statsRendered = true
    return null
  },
}))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean }) => { delete props.prefetch; return <a href={href} {...props}>{children}</a> } }))

import HomeDashboard from './HomeDashboard'

describe('homepage Featured', () => {
  it('does not duplicate the server-streamed Featured section with an empty client shell', () => {
    const html = renderToStaticMarkup(<HomeDashboard books={[]} newShows={[]} newEpisodes={[]} showFeatured={false} />)
    expect(html).not.toContain('data-featured-hero')
    expect(html).not.toContain('data-featured-shell')
  })
  for (const signedIn of [false, true]) it(`keeps Featured during missing data for ${signedIn ? 'members' : 'guests'}`, () => {
    home.user = signedIn ? { id: 'user-id', user_metadata: { full_name: 'Test User' } } : null
    const html = renderToStaticMarkup(<HomeDashboard books={[]} newShows={[]} newEpisodes={[]} />)
    expect(html).toContain('data-featured-hero')
    expect(html).toContain('data-featured-shell')
    expect(html).toContain('Learn Arabic through cartoons and books')
    expect(html).not.toContain('data-home-hero')
    expect(html).not.toContain('/homepage/hero-')
    expect(html).toContain('Browse Shows')
  })

  it('shows the Featured banner to guests when featured content exists', () => {
    home.user = null
    const html = renderToStaticMarkup(<HomeDashboard books={[]} newShows={[]} newEpisodes={[]} featured={{ show: { id: 'dbz', slug: 'dbz', title: 'DBZ', cover: '/cover.webp', level: 'B1', episodeCount: 3 }, episodeCount: 3 }} />)
    expect(html).toContain('data-featured-hero')
    expect(html).not.toContain('data-home-hero')
    expect(html).toContain('<h1')
    expect(html).toContain('Learn Arabic through cartoons and books')
  })
})

for(const signedIn of [false,true])it(`keeps Spotlight between Episodes and Shows for ${signedIn?'members':'guests'} without gating the teaser`,()=>{
 home.user=signedIn?{id:'user-id',user_metadata:{full_name:'Test User'}}:null
 const coverCrop={x:50,y:50,zoom:1}
 const html=renderToStaticMarkup(<HomeDashboard books={[]} newShows={[{id:'show',slug:'show',title:'Test Show',level:'A1',category:null,coverCrop}]} newEpisodes={[{id:'episode',slug:'episode',title:'Test Episode',level:'A1',showSlug:'show',showTitle:'Test Show',coverCrop}]} />)
 const episodes=html.indexOf('>Latest Episodes<'),spotlight=html.indexOf('>For You Spotlight<'),shows=html.indexOf('>Shows<')
 expect(episodes).toBeGreaterThan(-1);expect(spotlight).toBeGreaterThan(episodes);expect(shows).toBeGreaterThan(spotlight)
 expect(html).toContain('data-home-spotlight');expect(html).toContain('>Watch More<span')
 expect(html).not.toContain('id="download-app"')
})
