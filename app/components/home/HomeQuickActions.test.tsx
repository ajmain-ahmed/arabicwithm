import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const home = vi.hoisted(() => ({ isAdmin: false, loading: false, user: { id: 'user-id', user_metadata: {} } as { id: string; user_metadata: Record<string, unknown> } | null }))
vi.mock('@/app/AuthContext',()=>({useAuth:()=>({user:home.user,session:null,loading:home.loading})}))
vi.mock('@/app/components/ThemeProvider',()=>({useColorMode:()=>({mode:'light',toggleColorMode:vi.fn()})}))
vi.mock('@/app/lib/useAccountAccess',()=>({useAccountAccess:()=>({isAdmin:home.isAdmin})}))
// Navigation tests exercise destinations rather than decorative icon rendering.
vi.mock('@mui/icons-material', () => {
  const Icon = () => <svg aria-hidden="true" />
  return { DiamondOutlined: Icon, AccessTimeRounded: Icon, AdminPanelSettings: Icon, DarkModeOutlined: Icon, LightModeOutlined: Icon, MenuOutlined: Icon, Person: Icon, BookOutlined: Icon, EmailSharp: Icon, ExploreOutlined: Icon, HomeOutlined: Icon, LogoutSharp: Icon, Movie: Icon, PsychologyOutlined: Icon, RateReviewOutlined: Icon, VolunteerActivismRounded: Icon, AccountCircleOutlined: Icon, Close: Icon, Home: Icon, MenuBook: Icon, Menu: Icon, ArrowForward: Icon, AutoStories: Icon, CalendarMonthRounded: Icon, CheckCircleRounded: Icon, Headphones: Icon, LocalFireDepartmentRounded: Icon, MilitaryTechRounded: Icon, SettingsOutlined: Icon, GridOnRounded: Icon, BookmarkRounded: Icon, AccountTreeOutlined: Icon, SearchOutlined: Icon, OndemandVideo: Icon, QrCodeScanner: Icon, Apple: Icon, PlayArrow: Icon }
})
vi.mock('next/link',()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
vi.mock('@/app/actions/activity',()=>({fetchLearningActivity:vi.fn()}))
vi.mock('@/app/actions/premium',()=>({fetchPremiumStatus:vi.fn()}))
vi.mock('@/app/components/PremiumPrompt',()=>({default:()=>null}))
vi.mock('@/app/components/CheckoutFeedback',()=>({default:()=>null}))
import HomeQuickActions from './HomeQuickActions'
import HomeDashboard, { QuickLinks } from './HomeDashboard'
it('keeps the public homepage visible during session recovery', () => {
  const previousUser = home.user
  home.user = null
  home.loading = true
  try {
    const html = renderToStaticMarkup(<HomeDashboard books={[]} featuredBook={null} featuredEpisode={null} chaptersByBook={{}} newShows={[]} newEpisodes={[]}/>)
    expect(html).toContain('Learn Arabic through cartoons and books')
    expect(html).toContain('Start Watching')
    expect(html).toContain('Start Reading')
  } finally {
    home.user = previousUser
    home.loading = false
  }
})
function links(html:string){const host=document.createElement('div');host.innerHTML=html;return Array.from(host.querySelectorAll('a'))}
describe('website Home shortcuts',()=>{
  it('offers Word Search for guests and signed-in users without a duplicate Admin card',()=>{
    for(const userId of [undefined,'user-id']){
      const actions=links(renderToStaticMarkup(<QuickLinks userId={userId}/>))
      expect(actions.filter(link=>link.getAttribute('href')==='/word-search')).toHaveLength(1)
      expect(actions.filter(link=>link.getAttribute('href')==='/grammar')).toHaveLength(1)
      expect(actions.filter(link=>link.getAttribute('href')==='/search')).toHaveLength(1)
      expect(actions.some(link=>link.getAttribute('href')?.startsWith('/admin'))).toBe(false)
      expect(actions.every(link=>link.className===actions[0].className)).toBe(true)
    }
  })
  it('places Admin once under Quick Actions and never in the learning shortcuts',()=>{
    for (const isAdmin of [false, true]) {
      const quick = links(renderToStaticMarkup(<QuickLinks userId="admin-user" isAdmin={isAdmin}/>))
      expect(quick.filter(link=>link.getAttribute('href')==='/admin/users')).toHaveLength(isAdmin ? 1 : 0)
      const learning = links(renderToStaticMarkup(<HomeQuickActions bookmarkHref="/books/book/chapter" bookmarkLabel="Continue reading"/>))
      expect(learning.map(link=>link.getAttribute('href'))).toEqual(['/books/book/chapter','/profile'])
      expect(learning.every(link=>link.className===learning[0].className)).toBe(true)
    }
    expect(links(renderToStaticMarkup(<QuickLinks isAdmin/>)).some(link=>link.getAttribute('href')==='/admin/users')).toBe(false)
  })
})

it('does not render Quick Actions or an Admin entry on the homepage',()=>{
  for(const isAdmin of [true,false]){
    home.isAdmin=isAdmin
    const host=document.createElement('div')
    host.innerHTML=renderToStaticMarkup(<HomeDashboard books={[]} featuredBook={null} featuredEpisode={null} chaptersByBook={{}} newShows={[]} newEpisodes={[]}/>)
    expect(host.querySelectorAll('nav[aria-label="Quick Actions"]')).toHaveLength(0)
    expect(host.querySelectorAll('a[href="/admin/users"]')).toHaveLength(0)
  }
})
