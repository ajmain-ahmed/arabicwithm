import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ clips: vi.fn(), transcript: vi.fn().mockResolvedValue([]), mute: vi.fn(), pause:vi.fn(), playSound:vi.fn(), time:null as null|((time:number)=>void), end:null as null|(()=>void), active: new Set<string>(), mobile:false }))
vi.mock('@mui/material',async original=>({...await original<typeof import('@mui/material')>(),useMediaQuery:()=>mocks.mobile}))
vi.mock('@/app/actions/forYou', () => ({ fetchForYouClips: mocks.clips, fetchForYouTranscript: mocks.transcript }))
vi.mock('@/app/lib/useYouTubePlayer', async () => {
 const { useEffect } = await import('react')
 return { default: function useMockYouTubePlayer(source: string,onTime:(time:number)=>void,_start:number,options:{onEnded:()=>void}) {
  mocks.time=onTime;mocks.end=options.onEnded
  useEffect(() => { mocks.active.add(source); return () => { mocks.active.delete(source) } }, [source])
  return { wrapRef: { current: null }, isReady: true, isPlaying:true, isMuted: false, autoplayBlocked: false, mute: mocks.mute, seekTo: vi.fn(),pauseVideo:mocks.pause,playWithSound:mocks.playSound }
 } }
})
import ForYouFeed from './ForYouFeed'
import { useForYouCache } from '@/store/forYouStore'
import {AdvanceContext,MeterContext} from './ForYouMeterContext'
import type { ForYouClip } from '@/app/lib/forYou'

const clip = (id: number): ForYouClip => ({ video: { id: `video-${id}`, youtube_id: `abcdefgh${String(id).padStart(3,'0')}`, title: 'Clip', channel: null }, clip_start_ms: 0, clip_end_ms: 1000, segments: [{ id, position: 0, start_seconds: 0, end_seconds: 1, original_text: `Arabic ${id}`, english_text: `English ${id}`, tokens: [{ arabic: `Arabic ${id}`, english: `Word ${id}` }] }] })
beforeEach(() => {
 Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
 useForYouCache.setState({ clips: [], index: 0, excluded: [],seenSources:[],seed:'',sessionId:'' })
 localStorage.clear()
 mocks.mobile=false
 mocks.clips.mockReset().mockResolvedValue([])
 mocks.active.clear()
})
async function mounted(run: (host: HTMLDivElement, root: ReturnType<typeof createRoot>) => Promise<void>, initialClips?: ForYouClip[]) {
 const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host)
 try { await act(async () => root.render(<ForYouFeed initialClips={initialClips} />)); await run(host, root) }
 finally { await act(async () => root.unmount()); host.remove(); localStorage.clear() }
}
async function click(host: ParentNode, label: string) {
 const button = host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
 expect(button).toBeTruthy()
 await act(async () => button.click())
}
const source = (host: ParentNode) => host.querySelector('[data-for-you-source]')?.getAttribute('data-for-you-source')
it('continues beyond an entirely blocked cached batch instead of leaving an empty feed', async () => {
 localStorage.setItem('awm-for-you-unplayable-v1', JSON.stringify([clip(42).video.youtube_id]))
 mocks.clips.mockResolvedValueOnce([clip(42)]).mockResolvedValueOnce([clip(43)])
 await mounted(async host => {
  expect(mocks.clips).toHaveBeenCalledTimes(2)
  expect(mocks.clips.mock.calls[1][1]).toEqual([42])
  expect(source(host)).toBe(clip(43).video.youtube_id)
 })
})
it('prefetches the next five at clip four without changing playback, including when navigating backwards during loading', async () => {
 let resolve!: (clips: ForYouClip[]) => void
 mocks.clips.mockReturnValueOnce(new Promise<ForYouClip[]>(done => { resolve = done }))
 await mounted(async host => {
  for (let i = 0; i < 3; i++) await click(host, 'Next video')
  expect(mocks.clips).toHaveBeenCalledTimes(1)
  expect(mocks.clips.mock.calls[0][1]).toEqual([1,2,3,4,5])
  expect(source(host)).toBe(clip(4).video.youtube_id)
  await click(host, 'Previous video')
  await act(async () => resolve([6,7,8,9,10].map(clip)))
  expect(source(host)).toBe(clip(3).video.youtube_id)
  expect(useForYouCache.getState().clips).toHaveLength(10)
  for (let i = 0; i < 3; i++) await click(host, 'Next video')
  expect(source(host)).toBe(clip(6).video.youtube_id)
  await click(host, 'Previous video')
  expect(source(host)).toBe(clip(5).video.youtube_id)
  expect(host.querySelectorAll('[data-for-you-source]')).toHaveLength(1)
  expect([...mocks.active]).toEqual([clip(5).video.youtube_id])
  expect(host.querySelector('[data-feed-transcript]')?.textContent).toContain('English 5')
  expect(host.querySelector('[data-feed-transcript]')?.textContent).not.toContain('English 6')
 }, [1,2,3,4,5].map(clip))
 expect(mocks.active.size).toBe(0)
})
it('changes Arabic and English sizes independently, keeps bounds, and retains preferences across clips and remounts', async () => {
 await mounted(async (host, root) => {
  const size = (lang: string) => host.querySelector(`[lang="${lang}"]`)!.className
  const arabic = size('ar'), english = size('en')
  await click(host, 'Settings')
  await click(document, 'Increase Arabic text size')
  expect(size('ar')).not.toBe(arabic)
  expect(size('en')).toBe(english)
  const largeArabic = size('ar')
  await click(document, 'Increase English text size')
  expect(size('en')).not.toBe(english)
  expect(size('ar')).toBe(largeArabic)
  await click(document, 'Increase Arabic text size')
  expect(document.querySelector<HTMLButtonElement>('[aria-label="Increase Arabic text size"]')!.disabled).toBe(true)
  const saved = localStorage.getItem('awm-for-you-settings')
  await act(async () => (Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Done')!).click())
  await click(host, 'Next video')
  expect(localStorage.getItem('awm-for-you-settings')).toBe(saved)
  const sizes = [size('ar'), size('en')]
  await act(async () => root.render(<></>))
  await act(async () => root.render(<ForYouFeed />))
  expect([size('ar'), size('en')]).toEqual(sizes)
 }, [1,2,3,4,5].map(clip))
})

it('retains mobile history within a visit and refreshes the seed when a fresh visit clears the session',async()=>{
 mocks.mobile=true
 mocks.clips.mockResolvedValueOnce([1,2,3,4,5].map(clip)).mockResolvedValueOnce([6,7,8,9,10].map(clip))
 await mounted(async(host,root)=>{
  expect(new Set(useForYouCache.getState().clips.map(item=>item.video.id)).size).toBe(5)
  const firstSeed=mocks.clips.mock.calls[0][0]
  expect(firstSeed).not.toMatch(/^hour-/)
  await act(async()=>root.render(<></>))
  await act(async()=>root.render(<ForYouFeed/>))
  expect(mocks.clips).toHaveBeenCalledTimes(1)
  await act(async()=>root.render(<></>))
  useForYouCache.setState({clips:[],index:0,excluded:[],seenSources:[],seed:'',sessionId:'new-visit'})
  await act(async()=>root.render(<ForYouFeed/>))
  expect(mocks.clips.mock.calls[1][0]).not.toBe(firstSeed)
  expect(useForYouCache.getState().clips.every(item=>Number(item.video.id.split('-')[1])>=6)).toBe(true)
 })
})

it('advances once on the short boundary, swaps the transcript, and Previous returns to that completed item',async()=>{
 await mounted(async host=>{
  const time=mocks.time!,end=mocks.end!
  await act(async()=>{time(1);time(1.1);end();end()})
  expect(source(host)).toBe(clip(2).video.youtube_id)
  expect(mocks.pause).toHaveBeenCalled()
  expect(host.querySelector('[data-feed-transcript]')?.textContent).toContain('English 2')
  expect(host.querySelectorAll('[data-for-you-source]')).toHaveLength(1)
  await click(host,'Previous video');expect(source(host)).toBe(clip(1).video.youtube_id)
 },[1,2,3,4,5].map(clip))
})

it('ignores the short boundary in Full mode and keeps the same sequence through settings',async()=>{
 await mounted(async host=>{
  const full=host.querySelector<HTMLButtonElement>('[value="full"]')!
  await act(async()=>full.click())
  await act(async()=>{mocks.time!(2);mocks.end!()})
  expect(source(host)).toBe(clip(1).video.youtube_id)
  await click(host,'Settings');expect(source(host)).toBe(clip(1).video.youtube_id)
 },[1,2,3,4,5].map(clip))
})

it('charges the boundary sample before auto-next and cannot advance past an exhausted allowance',async()=>{
 await mounted(async(host,root)=>{
  let blocked=false
  await act(async()=>root.render(<AdvanceContext.Provider value={()=>!blocked}><MeterContext.Provider value={sample=>{if(sample.time>=1)blocked=true}}><ForYouFeed initialClips={[1,2,3,4,5].map(clip)}/></MeterContext.Provider></AdvanceContext.Provider>))
  await act(async()=>{mocks.time!(1);mocks.end!()})
  expect(blocked).toBe(true);expect(source(host)).toBe(clip(1).video.youtube_id)
  await click(host,'Next video');expect(source(host)).toBe(clip(1).video.youtube_id)
 })
})
