import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { EpisodeMeta } from '@/app/lib/cartoons'
const mocks = vi.hoisted(() => ({ narrow: true }))
vi.mock('@mui/material', async original => ({ ...await original<typeof import('@mui/material')>(), useMediaQuery: () => mocks.narrow }))
vi.mock('@/app/actions/cartoons', () => ({ fetchShowsForEpisodeEdit: vi.fn() }))
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.PropsWithChildren<{ prefetch?: boolean; href: string }>) => <a href={href} aria-label={(props as Record<string, unknown>)['aria-label'] as string}>{children}</a> }))
import { UpNextList } from './EpisodePage'
const videos = Array.from({ length: 12 }, (_, i) => ({ id: String(i), slug: `episode-${i}`, showSlug: 'show', title: `Episode ${i}`, cover: '/cover.jpg' })) as (EpisodeMeta & { showSlug: string })[]
let host: HTMLDivElement, root: Root
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); mocks.narrow = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
it('caps mobile recommendations at nine valid items with canonical episode links', async () => {
 await act(async () => root.render(<UpNextList related={[{ ...videos[0], slug: '' }, ...videos]} />))
 const links = [...host.querySelectorAll('a')]; expect(links).toHaveLength(9)
 expect(links.map(a => a.getAttribute('href'))).toEqual(videos.slice(0,9).map(v => `/cartoons/show/${v.slug}`))
 expect(host.querySelector('[data-mobile-related]')).not.toBeNull()
})
it.each([0, 1, 3, 8])('shows only the %i available recommendations without placeholders', async count => {
 await act(async () => root.render(<UpNextList related={videos.slice(0, count)} />))
 expect(host.querySelectorAll('a')).toHaveLength(count)
 if (!count) expect(host.textContent).toContain('No other episodes')
})
it('preserves all twelve recommendations in the wider playlist', async () => {
 mocks.narrow = false
 await act(async () => root.render(<UpNextList related={videos} />))
 expect(host.querySelectorAll('a')).toHaveLength(12); expect(host.querySelector('[data-mobile-related]')).toBeNull()
})
