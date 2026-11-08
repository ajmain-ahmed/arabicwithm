import {expect,it} from 'vitest'
import {ENGLISH_TRANSCRIPT_GROUP_ID as english,isEnglishTranscriptGroup,transcriptGroupDescendants} from './transcriptGroupTree'
it('uses canonical identity and descendants, never an English-looking name',()=>{
 const groups=[{id:english,parent_id:null,name:'Renamed'},{id:'child',parent_id:english},{id:'grandchild',parent_id:'child'},{id:'other',parent_id:null,name:'English Practice'}]
 expect([...transcriptGroupDescendants(groups,[english])]).toEqual([english,'child','grandchild'])
 for(const id of [english,'child','grandchild'])expect(isEnglishTranscriptGroup(id,groups)).toBe(true)
 for(const id of ['other','',null,undefined])expect(isEnglishTranscriptGroup(id,groups)).toBe(false)
})
it('terminates even for malformed cyclic trees',()=>{
 expect([...transcriptGroupDescendants([{id:'a',parent_id:'b'},{id:'b',parent_id:'a'}],['a'])]).toEqual(['a','b'])
})
