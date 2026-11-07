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
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))

import HomeDashboard from './HomeDashboard'

function daypart(date: Date) {
  const hour = date.getHours()
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
}

describe('homepage hero', () => {
  it('shows a time-based greeting for signed-in users', () => {
    home.user = { id: 'user-id', user_metadata: { full_name: 'Test User' } }
    home.statsRendered = false
    const html = renderToStaticMarkup(<HomeDashboard books={[]} newShows={[]} newEpisodes={[]} />)
    expect(html).toContain(`Good ${daypart(new Date())}, Test!`)
    expect(html).not.toContain('Learn Arabic through cartoons and books')
    expect(html).not.toContain('Start Watching')
    expect(html).not.toContain('Start Reading')
    expect(home.statsRendered).toBe(false)
    expect(html).not.toContain('ArabicwithM on the go!')
  })

  it('keeps the public heading and hides stats for guests', () => {
    home.user = null
    home.statsRendered = false
    const html = renderToStaticMarkup(<HomeDashboard books={[]} newShows={[]} newEpisodes={[]} />)
    expect(html).toContain('Learn Arabic through cartoons and books')
    expect(html).toContain('Start Watching')
    expect(html).toContain('Start Reading')
    expect(html).not.toContain('ArabicwithM on the go!')
    expect(html).not.toContain('id="download-app"')
    expect(html).not.toContain('Remind Me')
    expect(home.statsRendered).toBe(false)
  })

  it('shows the Featured banner to guests when featured content exists', () => {
    home.user = null
    const html = renderToStaticMarkup(<HomeDashboard books={[]} newShows={[]} newEpisodes={[]} featured={{ show: { id: 'dbz', slug: 'dbz', title: 'DBZ', cover: '/cover.webp', level: 'B1', episodeCount: 3 }, episodeCount: 3 }} />)
    expect(html).toContain('data-featured-hero')
    expect(html).not.toContain('data-home-hero')
    expect(html).not.toContain('Learn Arabic through cartoons and books')
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
