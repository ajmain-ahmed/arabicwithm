import {describe,it,expect} from 'vitest'
import {parseTranscriptTime,parseVideoDuration} from '@/app/lib/transcriptTiming'
describe('human-readable transcript timing',()=>{
 it.each([['10:57',657000],['42:15',2535000],['1:10:57',4257000],['1:03:22',3802000],['00:00.123',123]])('converts %s to %i milliseconds',(time,ms)=>{expect(parseTranscriptTime(time)).toBe(ms)})
 it('keeps explicit numeric units distinct',()=>{expect(parseTranscriptTime(657,'seconds')).toBe(657000);expect(parseTranscriptTime(657000)).toBe(657000);expect(parseVideoDuration('')).toBeUndefined()})
 it.each(['657','10:7','10:60','1:60:00','NaN','-1:00','1.5','00:00','12:00:01'])('rejects an invalid video duration %s',value=>{expect(()=>parseVideoDuration(value)).toThrow()})
 it.each([NaN,Infinity,-1])('rejects nonfinite or negative numeric timing',value=>{expect(()=>parseTranscriptTime(value,'seconds')).toThrow()})
})
