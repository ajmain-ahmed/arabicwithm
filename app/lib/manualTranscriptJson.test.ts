import { describe, expect, it } from 'vitest'
import { normaliseManualTranscriptJson, serialiseTranscriptJson, transcriptJsonFilename } from './manualTranscriptJson'
const content=[{text:'حياكم الله',offset:84200,duration:5500,english:'Welcome'},{text:'مرحبا بكم',offset:0,duration:5270,english:'Hello'}]
describe('canonical manual transcript JSON',()=>{
  it('preserves bilingual text and real integer timing in chronological order',()=>{expect(normaliseManualTranscriptJson(JSON.stringify({content}))).toEqual({provider:'manual',lang:'ar',content:[content[1],content[0]]})})
  it('reports syntax errors usefully',()=>{expect(()=>normaliseManualTranscriptJson('{')).toThrow('Invalid transcript JSON')})
  it.each([{content:[]},[],{content:[{text:'مرحبا',offset:'0',duration:5}]},{content:[{text:'مرحبا',offset:0,duration:0}]},{content:[{text:'مرحبا',offset:0.5,duration:5}]},{content:[{text:'مرحبا',offset:0,duration:5,english:1}]},{content:[{text:'English',offset:0,duration:5}]},{content:[{text:'مرحبا',offset:43200000,duration:5}]}])('rejects malformed fields without coercion',value=>{expect(()=>normaliseManualTranscriptJson(JSON.stringify(value))).toThrow()})
  it('accepts timed AWM token blocks and preserves lexical data',()=>{const blocks=[{tokens:[{arabic:'\u0645\u0631\u062d\u0628\u0627',headword:'\u0645\u0631\u062d\u0628\u0627',english:'Hello'}],timestamp:'0:00',translation:'Hello'}];expect(normaliseManualTranscriptJson(JSON.stringify(blocks),2).content[0]).toMatchObject({text:'\u0645\u0631\u062d\u0628\u0627',offset:0,duration:2000,english:'Hello',tokens:blocks[0].tokens})})
})

it('round-trips the full bilingual UTF-8 export through the canonical import validator',()=>{
  const segments=[{original_text:'\u0645\u0631\u062d\u0628\u0627 \u0645\u0631\u062d\u0628\u0627',english_text:'Welcome',start_ms:84200,end_ms:89700,start_seconds:84.2,end_seconds:89.7},{original_text:'\u0645\u0631\u062d\u0628\u0627',english_text:'Hello',start_ms:0,end_ms:5270,start_seconds:0,end_seconds:5.27}]
  const json=serialiseTranscriptJson(segments)
  expect(JSON.parse(json)).toEqual({content:[{text:'\u0645\u0631\u062d\u0628\u0627',offset:0,duration:5270,english:'Hello'},{text:'\u0645\u0631\u062d\u0628\u0627 \u0645\u0631\u062d\u0628\u0627',offset:84200,duration:5500,english:'Welcome'}]})
  expect(normaliseManualTranscriptJson(json).content).toEqual(JSON.parse(json).content)
  expect(json).toContain('\u0645\u0631\u062d\u0628\u0627 \u0645\u0631\u062d\u0628\u0627')
})
it('exports legacy seconds as milliseconds and includes empty English consistently',()=>{
  expect(JSON.parse(serialiseTranscriptJson([{original_text:'\u0645\u0631\u062d\u0628\u0627',english_text:null,start_seconds:1.234,end_seconds:6.789}])).content).toEqual([{text:'\u0645\u0631\u062d\u0628\u0627',english:'',offset:1234,duration:5555}])
})
it.each(['../Bad: title? * file','\u0645\u0631\u062d\u0628\u0627 \u0645\u0631\u062d\u0628\u0627','', 'CON'])('makes a safe JSON filename for %s',title=>{
  const filename=transcriptJsonFilename(title)
  expect(filename).toMatch(/_transcript\.json$/)
  expect(filename).not.toMatch(/[<>:"/\\|?*]/)
})
it.each(['text','offset','duration'])('reports the missing %s field',key=>{
  const segment:Record<string,unknown>={text:'\u0645\u0631\u062d\u0628\u0627',offset:0,duration:5};delete segment[key]
  expect(()=>normaliseManualTranscriptJson(JSON.stringify({content:[segment]}))).toThrow(key)
})
it.each([{offset:-1,duration:5},{offset:0,duration:-1},{offset:'0',duration:5},{offset:0,duration:'5'}])('rejects invalid or negative timing %j',timing=>{
  expect(()=>normaliseManualTranscriptJson(JSON.stringify({content:[{text:'\u0645\u0631\u062d\u0628\u0627',...timing}]}))).toThrow()
})


describe('expanded formats and resource limits',()=>{
 it('infers all start_ms-only boundaries including segment 98 without unit confusion',()=>{
  const blocks=Array.from({length:98},(_,index)=>({arabic:'\u0645\u0631\u062d\u0628\u0627',start_ms:index*6500}))
  const result=normaliseManualTranscriptJson(JSON.stringify(blocks),657)
  expect(result.content[96]).toMatchObject({offset:624000,duration:6500})
  expect(result.content[97]).toMatchObject({offset:630500,duration:26500})
 })
 it('uses explicit end before duration and keeps complete timing independent of video duration',()=>{
  expect(normaliseManualTranscriptJson(JSON.stringify({segments:[{text:'\u0645\u0631\u062d\u0628\u0627',start_ms:1000,end_ms:5000,duration:999999}]})).content[0]).toMatchObject({offset:1000,duration:4000})
 })
 it.each([{duration:'10:57'},{duration_seconds:657},{duration_ms:657000},{duration_seconds:'10:57'}])('uses root duration %j as an absolute final endpoint',timing=>{
  expect(normaliseManualTranscriptJson(JSON.stringify({...timing,segments:[{text:'\u0645\u0631\u062d\u0628\u0627',start_ms:630000}]})).content[0]).toMatchObject({offset:630000,duration:27000})
 })
 it.each([{duration:'00:05'},{duration_seconds:5},{duration_ms:5000},{duration:5000}])('normalizes segment duration %j before adding it to start_ms',timing=>{
  expect(normaliseManualTranscriptJson(JSON.stringify({segments:[{text:'\u0645\u0631\u062d\u0628\u0627',start_ms:1000,...timing}]})).content[0]).toMatchObject({offset:1000,duration:5000})
 })
 it('reports missing final duration and unordered starts without a false 12-hour error',()=>{
  const text='\u0645\u0631\u062d\u0628\u0627'
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{text,start_ms:630000}]))).toThrow('This transcript uses start-only timestamps')
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{text,start_ms:5000},{text,start_ms:1000}]),10)).toThrow('Check timestamp order')
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{text,start_ms:630000}]),657/1000)).toThrow('video duration extends beyond')
 })
 it('accepts the new bare token array with uppercase CEFR and paragraph grouping',()=>{
  const tokens=[{pos:'verb',cefr:'A2',arabic:'\u0642\u0627\u0644\u064e',english:'said',headword:'\u0642\u0627\u0644',entry_type:'word',transliteration:'qala'},{pos:'noun',cefr:'A1',arabic:'\u0627\u0644\u0648\u0644\u062f',english:'boy',headword:'\u0648\u0644\u062f',entry_type:'word',transliteration:'al-walad'}]
  const blocks=[{tokens,timestamp:'00:00',translation:'The boy said.',paragraph:1},{tokens,timestamp:'00:05',translation:'He said again.',paragraph:2}]
  expect(normaliseManualTranscriptJson(JSON.stringify(blocks),8).content).toEqual([{text:tokens.map(token=>token.arabic).join(' '),offset:0,duration:5000,english:blocks[0].translation,tokens,paragraph:1},{text:tokens.map(token=>token.arabic).join(' '),offset:5000,duration:3000,english:blocks[1].translation,tokens,paragraph:2}])
 })
 it.each([0,-1,1.5,'1'])('rejects an invalid paragraph number %j',paragraph=>{
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[{arabic:'\u0645\u0631\u062d\u0628\u0627'}],timestamp:'00:00',paragraph}]),2)).toThrow('paragraph must be a positive integer')
 })
 it('preserves sentence IDs, glosses, translations, and exact token milliseconds',()=>{
  const token={id:'s0001_t001',i:1,ar:'\u0633\u0644\u0645',plain:'\u0633\u0644\u0645',gloss:'deliver',start_ms:23039,end_ms:24799}
  const result=normaliseManualTranscriptJson(JSON.stringify({sentences:[{sentence_id:'s0001',sentence_index:1,start_ms:23039,end_ms:28320,arabic:'\u0633\u0644\u0645 \u0648\u0627\u0633\u062a\u0644\u0645.',english:'Deliver and receive.',tokens:[token]}]}))
  expect(result.content[0]).toMatchObject({offset:23039,duration:5281,text:'\u0633\u0644\u0645 \u0648\u0627\u0633\u062a\u0644\u0645.',english:'Deliver and receive.',sentence_id:'s0001',sentence_index:1,tokens:[token]})
 })
 it('accepts segments using seconds without losing millisecond precision',()=>{expect(normaliseManualTranscriptJson(JSON.stringify({segments:[{original_text:'\u0645\u0631\u062d\u0628\u0627',english_text:'Hello',start_seconds:1.234,end_seconds:3.456}]})).content[0]).toMatchObject({offset:1234,duration:2222})})
 it('accepts more than 5,000 segments and more than 10,000 characters in a segment',()=>{
  const long='\u0645\u0631\u062d\u0628\u0627 '.repeat(3000)
  const content=Array.from({length:5001},(_,i)=>({text:i===0?long:'\u0645\u0631\u062d\u0628\u0627',offset:i*1000,duration:1000}))
  const result=normaliseManualTranscriptJson(JSON.stringify({content}))
  expect(result.content).toHaveLength(5001);expect(result.content[0].text).toBe(long)
 })
 it('reports the actual malformed sentence and refuses untimed books',()=>{
  expect(()=>normaliseManualTranscriptJson(JSON.stringify({sentences:[{arabic:'\u0645\u0631\u062d\u0628\u0627',end_ms:5}]}))).toThrow('Sentence 1: missing or invalid start_ms')
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[{arabic:'\u0645\u0631\u062d\u0628\u0627'}],translation:'Hello'}]))).toThrow('timed imports require a start time')
 })
 it('never guesses a final endpoint or accepts invalid token intervals',()=>{
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[{arabic:'\u0645\u0631\u062d\u0628\u0627'}],timestamp:'0:00'}]))).toThrow('video duration')
  expect(()=>normaliseManualTranscriptJson(JSON.stringify({sentences:[{arabic:'\u0645\u0631\u062d\u0628\u0627',start_ms:0,end_ms:5,tokens:[{ar:'\u0645\u0631\u062d\u0628\u0627',start_ms:0,end_ms:8}]}]}))).toThrow('token timing')
 })
})
