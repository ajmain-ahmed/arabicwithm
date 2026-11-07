import {expect,it} from 'vitest'
import {selectHomeSpotlight} from './homeSpotlight'
import type {ForYouClip,ForYouSegment} from './forYou'
const line=(position:number,start:number,end:number,text='A line'):ForYouSegment=>({id:position,position,start_seconds:start,end_seconds:end,original_text:text,english_text:null,tokens:[{arabic:'\u0643\u062a\u0627\u0628',english:'book'}]})
const clip=(segments:ForYouSegment[]):ForYouClip=>({video:{id:'fixture',youtube_id:'abcdefghij0',title:'Fixture',channel:null},clip_start_ms:0,clip_end_ms:segments.at(-1)!.end_seconds*1000,segments})
it.each([5,10,15,29.99])('rejects a %ss fragment',duration=>expect(selectHomeSpotlight(clip([line(0,0,duration)]))).toBeNull())
it.each([30,40,45,59.75,60])('accepts a %ss complete segment',duration=>expect(selectHomeSpotlight(clip([line(0,0,duration)]))?.clip_end_ms).toBe(duration*1000))
it('extends a short candidate using contiguous transcript lines and prefers a complete thought',()=>{
 const result=selectHomeSpotlight(clip([line(0,0,10)]),[line(0,0,10),line(1,10,30),line(2,30,45,'Complete.'),line(3,45,59),line(4,59,65)])
 expect(result?.clip_end_ms).toBe(45000);expect(result?.segments).toHaveLength(3)
})
it('never cuts a sentence beyond 60 seconds',()=>expect(selectHomeSpotlight(clip([line(0,0,61)]))).toBeNull())
it('does not bridge missing segments or long gaps',()=>{
 expect(selectHomeSpotlight(clip([line(0,0,10),line(2,10,45)]))).toBeNull()
 expect(selectHomeSpotlight(clip([line(0,0,10),line(1,20,45)]))).toBeNull()
})

it('recognises an Arabic question boundary when choosing a complete thought',()=>{
 const result=selectHomeSpotlight(clip([line(0,0,10)]),[line(0,0,10),line(1,10,45,'Complete\u061f'),line(2,45,59)])
 expect(result?.clip_end_ms).toBe(45000)
})
