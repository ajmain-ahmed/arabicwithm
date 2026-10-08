import { describe, expect, it } from 'vitest'
import representative from './fixtures/transcript-start-only.json'
import { normaliseManualTranscriptJson, serialiseTranscriptJson, transcriptJsonFilename } from './manualTranscriptJson'
const content=[{text:'حياكم الله',offset:84200,duration:5500,english:'Welcome'},{text:'مرحبا بكم',offset:0,duration:5270,english:'Hello'}]
describe('canonical manual transcript JSON',()=>{
  it('preserves bilingual text and real integer timing in chronological order',()=>{expect(normaliseManualTranscriptJson(JSON.stringify({content:[content[1],content[0]]}))).toEqual({provider:'manual',lang:'ar',content:[content[1],content[0]]})})
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

it('round-trips indexed canonical tokens and raw token milliseconds, IDs and plain Arabic',()=>{
 const tokens=[{ar:'مرحبا',plain:'مرحبا',gloss:'hello',id:'word-1',start_ms:1234,end_ms:2000}]
 const source={content:[{text:'مرحبا',offset:1234,duration:3000,sentence_id:'sentence-1',arabic_plain:'مرحبا',tokens}]}
 const segment={position:0,original_text:'مرحبا',english_text:'Corrected translation',start_seconds:1.234,end_seconds:4.234}
 const json=serialiseTranscriptJson([segment],source)
 expect(normaliseManualTranscriptJson(json).content[0]).toMatchObject({...source.content[0],english:'Corrected translation'})
 const canonical=[{arabic:'مرحبا',english:'hello',headword:'مرحبا'}]
 expect(normaliseManualTranscriptJson(serialiseTranscriptJson([{...segment,canonical_paragraph:{tokens:canonical,paragraph:1}}])).content[0].tokens).toEqual(canonical)
})
it('reports several malformed sentences together without returning partial data',()=>{
 try{normaliseManualTranscriptJson(JSON.stringify({sentences:[{arabic:'مرحبا',end_ms:1000},{arabic:'مرحبا',start_ms:2000,end_ms:1000}]}));throw new Error('Expected rejection')}
 catch(error){expect((error as Error).message).toContain('Sentence 1');expect((error as Error).message).toContain('Sentence 2')}
})

it('retains canonical enrichment alongside supplied token IDs and timings and recovers empty raw tokens',()=>{
 const canonical={tokens:[{arabic:'مرحبا',english:'hello',headword:'مرحبا',transliteration:'marhaba'}],paragraph:1}
 const segment={position:0,original_text:'مرحبا',english_text:'Hello',start_seconds:0,end_seconds:1,canonical_paragraph:canonical}
 const raw={content:[{text:'مرحبا',offset:0,duration:1000,tokens:[{ar:'مرحبا',id:'t1',start_ms:0,end_ms:500,gloss:'hello'}]}]}
 const token=normaliseManualTranscriptJson(serialiseTranscriptJson([segment],raw)).content[0].tokens![0]
 expect(token).toMatchObject({...raw.content[0].tokens[0],headword:'مرحبا',transliteration:'marhaba'})
 expect(normaliseManualTranscriptJson(serialiseTranscriptJson([segment],{content:[{...raw.content[0],tokens:[]}]})).content[0].tokens).toEqual(canonical.tokens)
})

describe('representative AWM simultaneous start-only captions (not the missing original JSON)',()=>{
 const token=(arabic:string,english:string)=>({arabic,english,pos:'noun',headword:arabic,entry_type:'word',transliteration:'fixture',cefr:'A1',custom:{retained:true}})
 const blocks=representative
 it('merges 08:22 captions before timing validation and retains every token property/order',()=>{
  const result=normaliseManualTranscriptJson(JSON.stringify(blocks),510).content
  expect(result).toHaveLength(3)
  expect(result[0]).toMatchObject({offset:501123,duration:877})
  expect(result[1]).toMatchObject({offset:502000,duration:2567,text:'أهلا بكم',english:'Welcome to you.',paragraph:1,speaker:'Narrator',tokens:[...blocks[1].tokens,...blocks[2].tokens]})
  expect(result[2]).toMatchObject({offset:504567,duration:5433})
  expect(normaliseManualTranscriptJson(JSON.stringify({content:result})).content).toEqual(result)
 })
 it('reports incompatible duplicate metadata precisely instead of guessing',()=>{
  const invalid=blocks.map(block=>({...block}));invalid[2].paragraph=2
  expect(()=>normaliseManualTranscriptJson(JSON.stringify(invalid))).toThrow(/Segments 2, 3: duplicate timestamp 502000 ms.*metadata field "paragraph"/)
 })
 it('does not mask a middle order error with the missing final duration',()=>{
  const invalid=[blocks[0],blocks[3],blocks[1]]
  try{normaliseManualTranscriptJson(JSON.stringify(invalid));throw new Error('Expected rejection')}
  catch(error){expect((error as Error).message).toContain('timestamp-order error');expect((error as Error).message).not.toContain('Enter the video duration')}
 })
 it('rejects disagreeing explicit duplicate ends and mixed token mappings',()=>{
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([{...blocks[1],end_ms:503000},{...blocks[2],end_ms:504000}]))).toThrow('explicit end times disagree')
  expect(()=>normaliseManualTranscriptJson(JSON.stringify([blocks[1],{timestamp:'08:22',arabic:'بكم'}]))).toThrow('some blocks have tokens and others do not')
 })
 it('requires duration only when the final end is genuinely unknown',()=>{
  expect(()=>normaliseManualTranscriptJson(JSON.stringify(blocks))).toThrow('Enter the video duration')
  expect(normaliseManualTranscriptJson(JSON.stringify([...blocks.slice(0,-1),{...blocks.at(-1),end_ms:510123}])).content.at(-1)).toMatchObject({offset:504567,duration:5556})
 })
 it.each([1,7,300])('is independent of segment count: %i blocks',count=>{
  const source=Array.from({length:count},(_,index)=>({tokens:[token('مرحبا','hello')],start_ms:index*1234}))
  const result=normaliseManualTranscriptJson(JSON.stringify(source),count*1234/1000).content
  expect(result).toHaveLength(count);expect(result.at(-1)).toMatchObject({offset:(count-1)*1234,duration:1234})
 })
})

it('rejects out-of-order fully timed input instead of silently reordering timestamps',()=>{
 expect(()=>normaliseManualTranscriptJson(JSON.stringify([{arabic:'مرحبا',start_ms:2000,end_ms:3000},{arabic:'مرحبا',start_ms:1000,end_ms:2000}]))).toThrow('timestamp-order error')
})
it('reports invalid final metadata before requesting the missing final duration',()=>{
 expect(()=>normaliseManualTranscriptJson(JSON.stringify([{arabic:'مرحبا',start_ms:0,paragraph:0}]))).toThrow('paragraph must be a positive integer')
})

it('accepts AWM word and phrase enrichment and reports invalid enrichment before missing final timing',()=>{
 const phrase={arabic:'الحمد لله',english:'praise be to God',pos:'phrase',headword:'3',entry_type:'phrase',transliteration:'al-ḥamdu lillāh',cefr:'A1'}
 expect(normaliseManualTranscriptJson(JSON.stringify([{tokens:[phrase],timestamp:'00:01.234',end_ms:5000}])).content[0].tokens).toEqual([phrase])
 expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[{...phrase,headword:3}],timestamp:'00:01'}]))).toThrow('Token 1 headword must be text or null')
 expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[{...phrase,entry_type:'invalid'}],timestamp:'00:01'}]))).toThrow('entry_type must be word or phrase')
})
