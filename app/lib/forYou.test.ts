import {it,expect} from 'vitest'
import {forYouTokens,segmentAtTime,type ForYouSegment} from './forYou'
import {normaliseManualTranscriptJson} from './manualTranscriptJson'

it('selects exact time intervals and never shows stale text across a gap or seek',()=>{
 const rows=[{start_seconds:495,end_seconds:500},{start_seconds:501,end_seconds:522}] as ForYouSegment[]
 expect(segmentAtTime(rows,495)).toBe(rows[0])
 expect(segmentAtTime(rows,510)).toBe(rows[1])
 expect(segmentAtTime(rows,500)).toBeUndefined()
 expect(segmentAtTime(rows,0)).toBeUndefined()
})

it.each(['noun','verb','adjective','pronoun','preposition','particle','proper_noun'])('retains source glosses for %s without requiring enrichment',pos=>{
 const raw=normaliseManualTranscriptJson(JSON.stringify([{tokens:[{arabic:'من',english:'from',pos}],timestamp:'00:08',translation:'From times long past'}]))
 expect(forYouTokens(null,raw.content[0])).toEqual([{arabic:'من',english:'from'}])
})
it('normalises supported legacy glosses and uses exact matching enrichment only',()=>{
 expect(forYouTokens({tokens:[{arabic:'من',english:'from'},{arabic:'آخر',english:'wrong'}]}, {tokens:[{ar:'من',english:' ',gloss:'from'},{surface:'سالف',translation:'bygone'},{arabic:'الزمان',english:'time'},{arabic:'الأرض',english:'the earth'},{arabic:'تزول',english:'fade'},{arabic:'حكايات',english:'stories'}]}).map(t=>t.english)).toEqual(['from','bygone','time','the earth','fade','stories'])
 expect(forYouTokens({tokens:[{arabic:'آخر',english:'wrong'}]},{translation:'Sentence',tokens:[{arabic:'من'}]})).toEqual([{arabic:'من',english:''}])
 expect(forYouTokens({tokens:[{arabic:'من',english:'from'}]},{tokens:['من']})).toEqual([{arabic:'من',english:'from'}])
})
