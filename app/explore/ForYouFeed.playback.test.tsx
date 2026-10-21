import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({clips:vi.fn(),transcript:vi.fn().mockResolvedValue([]),mute:vi.fn()}))
vi.mock('@/app/actions/forYou',()=>({fetchForYouClips:mocks.clips,fetchForYouTranscript:mocks.transcript}))
vi.mock('@/app/lib/useYouTubePlayer',()=>({default:()=>({wrapRef:{current:null},isReady:false,isMuted:false,autoplayBlocked:false,mute:mocks.mute,seekTo:vi.fn()})}))
import ForYouFeed from './ForYouFeed'
import {useForYouCache} from '@/store/forYouStore'
import type {ForYouClip} from '@/app/lib/forYou'

it('continues beyond an entirely blocked cached batch instead of leaving an empty feed',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 useForYouCache.setState({clips:[],index:0,excluded:[]})
 localStorage.setItem('awm-for-you-unplayable-v1',JSON.stringify(['abcdefghij0']))
 const clip=(youtubeId:string,id:number):ForYouClip=>({video:{id:`video-${id}`,youtube_id:youtubeId,title:'Clip',channel:null},clip_start_ms:0,clip_end_ms:1000,segments:[{id,position:0,start_seconds:0,end_seconds:1,original_text:'text',english_text:null,tokens:[]}]})
 mocks.clips.mockResolvedValueOnce([clip('abcdefghij0',42)]).mockResolvedValueOnce([clip('abcdefghij1',43)])
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host)
 try{
  await act(async()=>root.render(<ForYouFeed/>))
  expect(mocks.clips).toHaveBeenCalledTimes(2)
  expect(mocks.clips.mock.calls[1][1]).toEqual([42])
  expect(host.querySelector('[data-for-you-source]')?.getAttribute('data-for-you-source')).toBe('abcdefghij1')
 }finally{await act(async()=>root.unmount());host.remove();localStorage.clear()}
})
