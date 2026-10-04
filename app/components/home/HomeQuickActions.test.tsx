import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('next/link',()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
vi.mock('@/app/actions/activity',()=>({fetchLearningActivity:vi.fn()}))
vi.mock('@/app/actions/premium',()=>({fetchPremiumStatus:vi.fn()}))
vi.mock('@/app/components/PremiumPrompt',()=>({default:()=>null}))
vi.mock('@/app/components/CheckoutFeedback',()=>({default:()=>null}))
import HomeQuickActions from './HomeQuickActions'
import { QuickLinks } from './HomeDashboard'
function links(html:string){const host=document.createElement('div');host.innerHTML=html;return Array.from(host.querySelectorAll('a'))}
describe('website Home shortcuts',()=>{
  it('offers Word Search for guests and signed-in users without a duplicate Admin card',()=>{
    for(const userId of [undefined,'user-id']){
      const actions=links(renderToStaticMarkup(<QuickLinks userId={userId}/>))
      expect(actions.some(link=>link.getAttribute('href')==='/word-search')).toBe(true)
      expect(actions.some(link=>link.getAttribute('href')?.startsWith('/admin'))).toBe(false)
      expect(actions.every(link=>link.className===actions[0].className)).toBe(true)
    }
  })
  it('keeps the admin-only shortcut beside Bookmark with equal sibling styling',()=>{
    const actions=links(renderToStaticMarkup(<HomeQuickActions bookmarkHref="/books/book/chapter" bookmarkLabel="Continue reading" isAdmin/>))
    expect(actions.map(link=>link.getAttribute('href'))).toEqual(['/books/book/chapter','/admin/users','/profile'])
    expect(actions.every(link=>link.className===actions[0].className)).toBe(true)
    expect(links(renderToStaticMarkup(<HomeQuickActions bookmarkHref="/books" bookmarkLabel="Read"/>)).some(link=>link.getAttribute('href')==='/admin/users')).toBe(false)
  })
})
