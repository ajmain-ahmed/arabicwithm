import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({request:vi.fn(),save:vi.fn(),youtube:vi.fn(),user:{id:'listener'} as {id:string}|null}))
vi.mock('@/app/actions/audiobooks',()=>({requestChapterAudioResult:mocks.request,saveAudioProgress:mocks.save}))
vi.mock('@/app/components/PremiumPrompt',()=>({default:({open}:{open:boolean})=>open?<aside role="dialog">Upgrade to AWM+</aside>:null}))
vi.mock('@/app/AuthContext',()=>({useAuth:()=>({user:mocks.user})}))
vi.mock('@/app/lib/useYouTubePlayer',()=>({default:mocks.youtube}))
vi.mock('@mui/icons-material',()=>({PauseRounded:()=>null,PlayArrowRounded:()=>null,RefreshRounded:()=>null}))
import ChapterAudioPlayer from './ChapterAudioPlayer'
let root:Root,host:HTMLDivElement
const audio={chapterId:'11111111-1111-4111-8111-111111111111',language:'en' as const,narrator:null,durationSeconds:15}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.resetAllMocks();mocks.save.mockResolvedValue(undefined);mocks.user={id:'listener'};mocks.request.mockResolvedValue({status:'ready',playback:{sourceType:'supabase_storage',url:'https://example.test/private',expiresIn:900,positionSeconds:3}});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined);vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks()})
it('does not fetch or autoplay private audio when the reader opens',async()=>{await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>));expect(host.textContent).toContain('Audio');expect(mocks.request).not.toHaveBeenCalled();expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();expect(document.querySelector('audio')).toBeNull()})
it('starts one inline player after clicking Audio without opening a dialog',async()=>{await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>));await act(async()=>host.querySelector('button')!.click());expect(mocks.request).toHaveBeenCalledWith(audio.chapterId,'en');const element=document.querySelector('audio')!;expect(element.src).toBe('https://example.test/private');expect(document.querySelector('[role=dialog]')).toBeNull();expect(element.controls).toBe(true);expect(element.autoplay).toBe(false);Object.defineProperty(element,'duration',{value:15});await act(async()=>element.dispatchEvent(new Event('loadedmetadata')));expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();await act(async()=>element.dispatchEvent(new Event('pause')));expect(mocks.save).toHaveBeenCalledWith(audio.chapterId,3,false,'en','listener')})
it('offers a private URL refresh after playback errors',async()=>{await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>));await act(async()=>host.querySelector('button')!.click());await act(async()=>document.querySelector('audio')!.dispatchEvent(new Event('error')));expect(document.body.textContent).toContain('Retry audio')})
it.each([100,101,150])('explains unavailable/private or disabled YouTube embeds (%s)',async(code)=>{
 mocks.youtube.mockReturnValue({wrapRef:{current:null},errorCode:code,retry:vi.fn(),playWithSound:vi.fn(),pauseVideo:vi.fn(),isPlaying:false})
 mocks.request.mockResolvedValue({status:'ready',playback:{sourceType:'youtube',videoId:'yFeE2MvsrJM',positionSeconds:0}})
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>host.querySelector('button')!.click())
 expect(host.textContent).toContain(code===100?'private, removed, or unavailable':'disabled embedded playback')
 expect(host.textContent).toContain('Retry YouTube')
})

it.each(['free','guest'])('offers the existing upgrade without audio or permission errors for %s',async(kind)=>{
 if(kind==='guest')mocks.user=null
 mocks.request.mockResolvedValue({status:'upgrade'})
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>host.querySelector('button')!.click())
 expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Upgrade to AWM+')
 expect(document.querySelector('audio')).toBeNull()
 expect(host.querySelector('[role="alert"]')).toBeNull()
 expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
})
it('keeps the same media element and position across ordinary reader renders',async()=>{
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>host.querySelector('button')!.click())
 const element=host.querySelector('audio')!;element.currentTime=12
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 expect(host.querySelector('audio')).toBe(element);expect(element.currentTime).toBe(12);expect(mocks.request).toHaveBeenCalledOnce()
})
it('ignores a pending request after the account changes',async()=>{
 let finish!:(value:unknown)=>void;mocks.request.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>host.querySelector('button')!.click())
 mocks.user={id:'another-account'}
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>finish({status:'ready',playback:{sourceType:'supabase_storage',url:'https://example.test/private',expiresIn:900,positionSeconds:0}}))
 expect(host.querySelector('audio')).toBeNull();expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
 expect(host.querySelector('button')!.disabled).toBe(false)
})
it('uses the next user tap to play the same loaded source after autoplay is blocked',async()=>{
 vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('User gesture required','NotAllowedError')).mockResolvedValue(undefined)
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>host.querySelector('button')!.click())
 const element=host.querySelector('audio')!;Object.defineProperty(element,'duration',{value:15})
 await act(async()=>element.dispatchEvent(new Event('loadedmetadata')))
 expect(host.textContent).toContain('Tap Play Audio')
 await act(async()=>host.querySelector('button')!.click())
 expect(host.querySelector('audio')).toBe(element);expect(mocks.request).toHaveBeenCalledOnce()
 expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
 expect(host.textContent).not.toContain('Tap Play Audio')
})
it('closes an old account upgrade prompt when the account changes',async()=>{
 mocks.request.mockResolvedValue({status:'upgrade'})
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 await act(async()=>host.querySelector('button')!.click())
 expect(host.querySelector('[role=dialog]')).not.toBeNull()
 mocks.user={id:'premium-account'}
 await act(async()=>root.render(<ChapterAudioPlayer audio={audio} chapterTitle="Chapter"/>))
 expect(host.querySelector('[role=dialog]')).toBeNull()
})
