import {describe,it,expect} from 'vitest'
import {normaliseManualTranscriptJson} from './manualTranscriptJson'
import {hasArabicLetter} from './transcriptTokenValidation'
const word={arabic:'مرحبا',english:'hello',pos:'noun',headword:'مرحبا',entry_type:'word',transliteration:'marhaba',cefr:'A1',custom:{keep:true}}
const input=(tokens:unknown[],text?:string)=>JSON.stringify([{tokens,...(text?{text}:{}),timestamp:'00:01.234',end_ms:5000,translation:'Hello.'}])
describe('AWM enrichment preflight',()=>{
 it.each(['','!','،','َُّ','ﹶ','ـ','123','hello'])('rejects %j without Arabic letters',arabic=>{expect(hasArabicLetter(arabic)).toBe(false);expect(()=>normaliseManualTranscriptJson(input([{arabic}]))).toThrow(/Segment 1, token 1: arabic=/)})
 it.each(['مرحبا!','مرحبا،','مرحبا hello','أ','پ','ﷲ','𞸀'])('accepts Arabic letters in %j',arabic=>{expect(hasArabicLetter(arabic)).toBe(true);expect(normaliseManualTranscriptJson(input([{...word,arabic}])).content[0].tokens![0].arabic).toBe(arabic)})
 it('collects every invalid token and enrichment field across the entire document',()=>{
  const json=JSON.stringify([{tokens:[{arabic:''},{arabic:'َُّ',headword:3}],start_ms:1000,end_ms:2000},{tokens:[{arabic:'hello'},{arabic:'?',custom:'do not discard'}],start_ms:2000,end_ms:3000}])
  let error='';try{normaliseManualTranscriptJson(json)}catch(e){error=(e as Error).message}
  for(const expected of ['Segment 1, token 1','Segment 1, token 2','Segment 2, token 1','Segment 2, token 2','arabic="hello"','headword=3'])expect(error).toContain(expected)
 })
 it('rejects an empty enrichment array',()=>expect(()=>normaliseManualTranscriptJson(input([]))).toThrow('tokens=[]'))
 it('attaches closing punctuation without changing explicit wording, translations, timing or word enrichment',()=>{
  const result=normaliseManualTranscriptJson(input([word,{arabic:'،',english:'،',pos:'punctuation',headword:null,entry_type:'word',transliteration:'،'}],'مرحبا،'))
  expect(result.content[0]).toMatchObject({text:'مرحبا،',english:'Hello.',offset:1234,duration:3766,tokens:[{...word,arabic:'مرحبا،'}]})
  expect(word.arabic).toBe('مرحبا')
 })
 it('preserves nested opening and closing punctuation order',()=>{
  const result=normaliseManualTranscriptJson(input([{arabic:'('},{arabic:'['},word,{arabic:']'},{arabic:')'}]))
  expect(result.content[0].tokens).toEqual([{...word,arabic:'([مرحبا])'}])
 })
 it.each([[word,{arabic:'!',start_ms:1500,end_ms:1800}],[word,{arabic:'!',english:'surprise'}],[{arabic:'"'},word],[{arabic:'،'},word]].map(tokens=>[tokens]))('refuses unsafe punctuation normalization',tokens=>expect(()=>normaliseManualTranscriptJson(input(tokens))).toThrow(/Segment 1, token/))
 it('refuses punctuation correction if explicit Arabic wording disagrees',()=>expect(()=>normaliseManualTranscriptJson(input([word,{arabic:'!'}],'وداعا!'))).toThrow('tokens differ'))
 it('does not combine punctuation across timestamps or inject diagnostics into content',()=>{
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[word],start_ms:1000,end_ms:2000},{tokens:[{arabic:'!'}],start_ms:2000,end_ms:3000}]))).toThrow('Segment 2, token 1')
  const raw=normaliseManualTranscriptJson(input([word,{arabic:'!'}]));expect(JSON.stringify(raw)).not.toMatch(/Segment|token 1|warning|diagnostic/)
 })
})
