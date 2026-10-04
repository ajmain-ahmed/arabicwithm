import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({request:vi.fn(),save:vi.fn(),youtube:vi.fn()}))
vi.mock('@/app/actions/audiobooks',()=>({requestChapterAudio:mocks.request,saveAudioProgress:mocks.save}))
vi.mock('@/app/components/PremiumPrompt',()=>({default:()=>null}))
vi.mock('@/app/lib/useYouTubePlayer',()=>({default:mocks.youtube}))
vi.mock('@mui/icons-material',()=>({HeadphonesRounded:()=>null,LockOutlined:()=>null,PlayArrowRounded:()=>null,RefreshRounded:()=>null}))
import ChapterAudioPlayer from './ChapterAudioPlayer'
let root:Root,host:HTMLDivElement
const audio={chapterId:'11111111-1111-4111-8111-111111111111',language:'en' as const,narrator:null,durationSeconds:15}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks();mocks.save.mockResolvedValue(undefined);mocks.request.mockResolvedValue({sourceType:'supabase_storage',url:'https://example.test/private',expiresIn:900,positionSeconds:3});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined);vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks()})
it('does not fetch or autoplay private audio when the reader opens',async()=>{await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter" compact/>));expect(host.textContent).toContain('Audio');expect(mocks.request).not.toHaveBeenCalled();expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();expect(document.querySelector('audio')).toBeNull()})
it('opens the existing player with language-specific private access after clicking Audio',async()=>{await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter" compact/>));await act(async()=>host.querySelector('button')!.click());expect(mocks.request).toHaveBeenCalledWith(audio.chapterId,'en');const element=document.querySelector('audio')!;expect(element.src).toBe('https://example.test/private');expect(element.controls).toBe(true);expect(element.autoplay).toBe(false);Object.defineProperty(element,'duration',{value:15});await act(async()=>element.dispatchEvent(new Event('loadedmetadata')));expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();await act(async()=>element.dispatchEvent(new Event('pause')));expect(mocks.save).toHaveBeenCalledWith(audio.chapterId,3,false,'en')})
it('offers a private URL refresh after playback errors',async()=>{await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter" compact/>));await act(async()=>host.querySelector('button')!.click());await act(async()=>document.querySelector('audio')!.dispatchEvent(new Event('error')));expect(document.body.textContent).toContain('Refresh audio')})
it.each([100,101,150])('explains unavailable/private or disabled YouTube embeds (%s)',async(code)=>{
 mocks.youtube.mockReturnValue({wrapRef:{current:null},errorCode:code,retry:vi.fn()})
 mocks.request.mockResolvedValue({sourceType:'youtube',videoId:'yFeE2MvsrJM',positionSeconds:0})
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>host.querySelector('button')!.click())
 expect(host.textContent).toContain(code===100?'private, removed, or unavailable':'disabled embedded playback')
 expect(host.textContent).toContain('Retry YouTube')
})
