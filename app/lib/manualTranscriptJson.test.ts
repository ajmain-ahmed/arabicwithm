import { describe, expect, it } from 'vitest'
import { normaliseManualTranscriptJson, serialiseTranscriptJson, transcriptJsonFilename } from './manualTranscriptJson'
const content=[{text:'حياكم الله',offset:84200,duration:5500,english:'Welcome'},{text:'مرحبا بكم',offset:0,duration:5270,english:'Hello'}]
describe('canonical manual transcript JSON',()=>{
  it('preserves bilingual text and real integer timing in chronological order',()=>{expect(normaliseManualTranscriptJson(JSON.stringify({content}))).toEqual({provider:'manual',lang:'ar',content:[content[1],content[0]]})})
  it('reports syntax errors usefully',()=>{expect(()=>normaliseManualTranscriptJson('{')).toThrow('Invalid transcript JSON')})
  it.each([{content:[]},[],{content:[{text:'مرحبا',offset:'0',duration:5}]},{content:[{text:'مرحبا',offset:0,duration:0}]},{content:[{text:'مرحبا',offset:0.5,duration:5}]},{content:[{text:'مرحبا',offset:0,duration:5,english:1}]},{content:[{text:'English',offset:0,duration:5}]},{content:[{text:'مرحبا',offset:43200000,duration:5}]}])('rejects malformed fields without coercion',value=>{expect(()=>normaliseManualTranscriptJson(JSON.stringify(value))).toThrow()})
  it('rejects Show JSON without changing its schema or parser',()=>{expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[{arabic:'مرحبا'}],timestamp:'0:00',translation:'Hello'}]))).toThrow('content array')})
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
