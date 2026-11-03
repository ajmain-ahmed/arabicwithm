import {expect,it} from 'vitest'
import {normaliseForYouClip,normaliseForYouSegment,forYouId} from './forYouData'
import samples from './fixtures/forYouAffectedCandidates.json'
const row=samples[0]
const clip=(segment:unknown=row)=>({video:{id:row.transcript_id,youtube_id:row.youtube_id,title:row.title,channel:null},clip_start_ms:row.start_seconds*1000,clip_end_ms:row.end_seconds*1000,segments:[segment]})
it.each(samples)('normalises the saved raw tokens for $title, without canonical tokens',sample=>{
 const segment=normaliseForYouSegment(sample)
 expect(segment?.tokens.length).toBeGreaterThan(0)
 expect(()=>JSON.stringify(segment)).not.toThrow()
})
it('prefers canonical tokens and tolerates nullable educational fields',()=>{
 expect(normaliseForYouSegment({...row,canonical_paragraph:{tokens:[{arabic:'كتاب',english:'canonical',headword:null,transliteration:null,pos:'noun',entry_type:'word'}]}})?.tokens).toEqual([expect.objectContaining({english:'canonical',headword:null,transliteration:null})])
})
it('falls through malformed canonical and RPC tokens to the saved raw content',()=>{
 const raw={tokens:[{arabic:'كتاب',english:'book'}]}
 expect(normaliseForYouSegment({...row,canonical_paragraph:{tokens:[null,{},false]},source_tokens:[]},raw)?.tokens).toHaveLength(1)
})
it('rejects missing tokens, malformed clips, unsafe IDs and invalid timing',()=>{
 expect(normaliseForYouSegment({...row,source_tokens:null,canonical_paragraph:null})).toBeNull()
 for(const value of [null,{}, {segments:{}},clip({...row,tokens:{},source_tokens:false}),clip({...row,end_seconds:Infinity})])expect(normaliseForYouClip(value)).toBeNull()
 expect(forYouId('9007199254740993')).toBeNull();expect(forYouId(BigInt('9007199254740993'))).toBeNull()
 expect(forYouId(BigInt(56606))).toBe(56606)
 expect(normaliseForYouClip(clip({...row,id:BigInt(56606)}))).not.toBeNull()
})
it('returns only plain serialisable metadata and a safe missing-title/translation fallback',()=>{
 const value=clip({...row,english_text:null})
 const result=normaliseForYouClip({...value,video:{...value.video,title:null,channel:{unsafe:true}},unexpected:new Error('private')})!
 expect(result.video).toMatchObject({title:'Arabic video',channel:null})
 expect(JSON.parse(JSON.stringify(result))).toEqual(result)
})
it('normalises 1,000 varied five-item batches across all seven affected sources',()=>{
 for(let seed=0;seed<1000;seed++)for(let offset=0;offset<5;offset++){
  const sample=samples[(seed*3+offset)%samples.length]
  const result=normaliseForYouClip({video:{id:sample.transcript_id,youtube_id:sample.youtube_id,title:sample.title},clip_start_ms:sample.start_seconds*1000,clip_end_ms:sample.end_seconds*1000,segments:[sample]})
  expect(result).not.toBeNull();expect(()=>JSON.stringify(result)).not.toThrow()
 }
})
