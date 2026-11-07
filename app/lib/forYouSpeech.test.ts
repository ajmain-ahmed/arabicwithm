import {expect,it} from 'vitest'
import {forYouTokens,type ForYouClip,type ForYouSegment} from './forYou'
import {hasSpokenContent,speechCoverage,spokenForYouClip,spokenSegment} from './forYouSpeech'
import real from './fixtures/forYouRealSpeechRegions.json'
const line=(start:number,end:number,text='This is meaningful spoken dialogue for learners.'):ForYouSegment=>({id:start,position:start,start_seconds:start,end_seconds:end,original_text:text,english_text:null,tokens:[{arabic:text,english:text}]})
const clip=(segments:ForYouSegment[],start=0,end=45):ForYouClip=>({video:{id:'test',youtube_id:'uvX4k_3Cmvs',title:'test',channel:null},clip_start_ms:start*1000,clip_end_ms:end*1000,segments})
it.each(['[Music]','[Applause]','[Laughter]','[Silence]','[Sound effects]','\u266a\u266b',''])('rejects non-speech-only candidate %s',text=>expect(spokenForYouClip(clip([line(0,45,text)]))).toBeNull())
it('rejects a tiny line in an otherwise empty long window and late speech',()=>{expect(spokenForYouClip(clip([line(0,5)]))).toBeNull();expect(spokenForYouClip(clip([line(18,45)]))).toBeNull()})
it('merges overlaps once and rejects long interior gaps',()=>{expect(speechCoverage(clip([line(0,10),line(0,10),line(35,45)])).ratio).toBeCloseTo(20/45);expect(spokenForYouClip(clip([line(0,15),line(30,45)]))).toBeNull()})
it('keeps coherent dialogue and filters occasional non-verbal markers from returned subtitles',()=>{const result=spokenForYouClip(clip([line(0,20),line(20,23,'[Music]'),line(23,45)]));expect(result?.segments).toHaveLength(2);expect(result?.clip_end_ms).toBe(45000)})
it('preserves normal feed durations while enforcing Spotlight 30-60 seconds when requested',()=>{expect(spokenForYouClip(clip([line(0,10)],0,10))).not.toBeNull();expect(spokenForYouClip(clip([line(0,10)],0,10),{minSeconds:30,maxSeconds:60})).toBeNull();expect(spokenForYouClip(clip([line(0,61)],0,61),{minSeconds:30,maxSeconds:60})).toBeNull()})
const actual=real.map(row=>({...row,english_text:row.canonical_paragraph.translation,tokens:forYouTokens(row.canonical_paragraph,null)}))
it('rejects the actual music/applause region at 02:13-02:22, uvX4k_3Cmvs',()=>{const markers=actual.filter(row=>row.position>=36&&row.position<=38);expect(markers).toHaveLength(3);expect(markers.every(row=>!hasSpokenContent(row))).toBe(true);expect(spokenForYouClip(clip(markers,133,142))).toBeNull()})
it('accepts the actual dialogue at 00:00-00:31 from the same English-group video',()=>{const spoken=actual.filter(row=>row.position<7);const result=speechCoverage(clip(spoken,0,31),{minSeconds:30,maxSeconds:60});expect(result.eligible).toBe(true);expect(result.ratio).toBe(1)})
it('does not mistake discussion about music for an annotation',()=>expect(hasSpokenContent(line(0,5,'We talked about music and silence.'))).toBe(true))

it('removes only annotation tokens from a mixed spoken sentence without changing stored fields',()=>{
 const segment={...line(0,45),tokens:[{arabic:'[Music]',english:'[Music]'},{arabic:'speech',english:'A complete meaningful spoken sentence.'}]},before=JSON.stringify(segment)
 expect(spokenSegment(segment).tokens).toEqual([segment.tokens[1]]);expect(JSON.stringify(segment)).toBe(before)
})
