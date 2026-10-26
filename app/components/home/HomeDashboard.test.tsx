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
vi.mock('@/app/actions/profiles', () => ({ fetchMyDisplayName: vi.fn(() => Promise.resolve(null)) }))
vi.mock('@/app/components/PremiumPrompt', () => ({ default: () => null }))
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
    const html = renderToStaticMarkup(<HomeDashboard books={[]} featuredBook={null} featuredEpisode={null} chaptersByBook={{}} newShows={[]} newEpisodes={[]} />)
    expect(html).toContain(`Good ${daypart(new Date())}, Test!`)
    expect(html).not.toContain('Learn Arabic through cartoons and books')
    expect(html).not.toContain('Start Watching')
    expect(html).not.toContain('Start Reading')
    expect(home.statsRendered).toBe(false)
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
