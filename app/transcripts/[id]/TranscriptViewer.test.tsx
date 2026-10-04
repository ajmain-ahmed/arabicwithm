import React,{act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import type {TranscriptRow} from '@/app/actions/transcripts'
const mocks=vi.hoisted(()=>({player:vi.fn(),seek:vi.fn(),load:vi.fn(),download:vi.fn()}))
vi.mock('@/app/lib/useYouTubePlayer',()=>({default:mocks.player}))
vi.mock('@/app/actions/transcripts',()=>({loadPublicTranscript:mocks.load,loadAdminTranscript:mocks.load,downloadAdminTranscriptJson:mocks.download}))
vi.mock('next/link',()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
import TranscriptViewer from './TranscriptViewer'
let host:HTMLDivElement,root:Root
const video={id:'11111111-1111-4111-8111-111111111111',youtube_id:'Dgj9fQYbCZY',title:'Stored video',channel:'Channel',translation_status:'ready'} as TranscriptRow
const segments=[{id:99,position:16,original_text:'Stored source',english_text:'Stored English',start_seconds:300.18,end_seconds:305}]
beforeEach(()=>{vi.resetAllMocks();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.player.mockReturnValue({wrapRef:{current:null},seekTo:mocks.seek,isReady:true,errorCode:null,retry:vi.fn()});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
it('returns an admin-opened transcript to the admin transcript list',async()=>{await act(async()=>root.render(<TranscriptViewer video={video} initialSegments={segments} start={0} origin="admin"/>));expect(host.querySelector('a')?.getAttribute('href')).toBe('/admin/transcripts');expect(host.textContent).toContain('Back to Transcripts')})
it('retains Explore return context',async()=>{await act(async()=>root.render(<TranscriptViewer video={video} initialSegments={segments} start={0} origin="explore"/>));expect(host.querySelector('a')?.getAttribute('href')).toBe('/explore')})
it('uses the existing player with the exact deep-link time and seeks to stored segment time',async()=>{await act(async()=>root.render(<TranscriptViewer video={video} initialSegments={segments} start={300.18}/>));expect(mocks.player.mock.calls[0][0]).toBe(video.youtube_id);expect(mocks.player.mock.calls[0][2]).toBe(300.18);expect(mocks.player.mock.calls[0][3]).toEqual({autoplay:false});expect(host.textContent).toContain('Stored English');await act(async()=>{Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='05:00')!.click()});expect(mocks.seek).toHaveBeenCalledWith(300.18)})
it('loads earlier canonical segments and preserves the initial search context',async()=>{mocks.load.mockResolvedValue({video,segments:[{...segments[0],id:98,position:15,original_text:'Earlier source'},segments[0]]});await act(async()=>root.render(<TranscriptViewer video={video} initialSegments={segments} start={300.18}/>));await act(async()=>{Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Load earlier transcript')!.click()});expect(mocks.load).toHaveBeenCalledWith(video.id,-1);expect(host.textContent).toContain('Earlier source');expect(host.textContent?.match(/Stored source/g)).toHaveLength(1)})

it('offers the complete server-side JSON download only in the admin view',async()=>{
  await act(async()=>root.render(<TranscriptViewer video={video} initialSegments={segments} start={0}/>))
  expect(host.textContent).not.toContain('Download JSON')
  await act(async()=>root.render(<TranscriptViewer video={video} initialSegments={segments} start={0} origin="admin"/>))
  const create=vi.fn().mockReturnValue('blob:test')
  vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:create,revokeObjectURL:vi.fn()}))
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
  mocks.download.mockResolvedValue({filename:'Stored_video_transcript.json',json:'{"content":[]}'})
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Download JSON')!.click())
  expect(mocks.download).toHaveBeenCalledExactlyOnceWith(video.id)
  expect(create.mock.calls[0][0].type).toBe('application/json;charset=utf-8')
  expect(click).toHaveBeenCalledOnce()
  click.mockRestore()
})
it('shows download failures and permits retry',async()=>{
  mocks.download.mockRejectedValue(new Error('Unable to download the complete transcript.'))
  await act(async()=>root.render(<TranscriptViewer video={video} initialSegments={segments} start={0} origin="admin"/>))
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Download JSON')!.click())
  expect(host.textContent).toContain('Unable to download the complete transcript.')
  expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Download JSON')?.disabled).toBe(false)
})
