import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const home = vi.hoisted(() => ({
  user: null as { id: string; user_metadata: Record<string, unknown> } | null,
  statsRendered: false,
}))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: home.user, session: null, loading: false }) }))
vi.mock('@/app/components/ThemeProvider', () => ({ useColorMode: () => ({ mode: 'light', toggleColorMode: vi.fn() }) }))
vi.mock('@/app/actions/activity', () => ({ fetchLearningActivity: vi.fn() }))
vi.mock('@/app/components/PremiumPrompt', () => ({ default: () => null }))
vi.mock('./LearningStats', () => ({
  default: () => {
    home.statsRendered = true
    return null
  },
}))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))

import HomeDashboard from './HomeDashboard'
vi.mock('./HomeProfileHeader',()=>({default:()=> <header data-home-profile>Account profile header</header>}))

describe('homepage hero', () => {
  it('replaces the signed-in greeting with the shared account profile header',()=>{
    home.user={id:'user-id',user_metadata:{full_name:'Test User'}}
    const html=renderToStaticMarkup(<HomeDashboard books={[]} featuredBook={null} featuredEpisode={null} chaptersByBook={{}} newShows={[]} newEpisodes={[]}/> )
    expect(html).toContain('data-home-profile')
    expect(html).not.toContain('data-home-hero')
    expect(html).not.toContain('Good morning')
    expect(html).not.toContain('Start Watching')
  })

  it('keeps the public heading and hides stats for guests', () => {
    home.user = null
    home.statsRendered = false
    const html = renderToStaticMarkup(<HomeDashboard books={[]} featuredBook={null} featuredEpisode={null} chaptersByBook={{}} newShows={[]} newEpisodes={[]} />)
    expect(html).toContain('Learn Arabic through cartoons and books')
    expect(html).toContain('Start Watching')
    expect(html).toContain('Start Reading')
    expect(home.statsRendered).toBe(false)
  })
})
