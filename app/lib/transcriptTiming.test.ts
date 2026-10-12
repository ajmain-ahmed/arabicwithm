import {describe,it,expect} from 'vitest'
import {parseTranscriptTime,parseVideoDuration} from '@/app/lib/transcriptTiming'
describe('human-readable transcript timing',()=>{
 it.each([['10:57',657000],['42:15',2535000],['1:10:57',4257000],['1:03:22',3802000],['00:00.123',123]])('converts %s to %i milliseconds',(time,ms)=>{expect(parseTranscriptTime(time)).toBe(ms)})
 it('keeps explicit numeric units distinct',()=>{expect(parseTranscriptTime(657,'seconds')).toBe(657000);expect(parseTranscriptTime(657000)).toBe(657000);expect(parseVideoDuration('')).toBeUndefined()})
 it.each(['657','10:7','10:60','1:60:00','NaN','-1:00','1.5','00:00','12:00:01'])('rejects an invalid video duration %s',value=>{expect(()=>parseVideoDuration(value)).toThrow()})
 it.each([NaN,Infinity,-1])('rejects nonfinite or negative numeric timing',value=>{expect(()=>parseTranscriptTime(value,'seconds')).toThrow()})
})

it.each([['11',660000],['00:11',660000],['1:03',3780000],['12:00',43200000]])('supports minutes mode %s without reinterpreting legacy seconds', (value,expected)=>{
 expect(parseVideoDuration(value,'minutes')).toBe(expected)
 expect(parseVideoDuration('10:57')).toBe(657000)
})
it.each(['1:60','0','12:01','1.5','00:11:00'])('rejects invalid minutes mode %s',value=>expect(()=>parseVideoDuration(value,'minutes')).toThrow())
