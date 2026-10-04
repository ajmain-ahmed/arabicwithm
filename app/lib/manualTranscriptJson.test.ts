import { describe, expect, it } from 'vitest'
import { normaliseManualTranscriptJson } from './manualTranscriptJson'
const content=[{text:'حياكم الله',offset:84200,duration:5500,english:'Welcome'},{text:'مرحبا بكم',offset:0,duration:5270,english:'Hello'}]
describe('canonical manual transcript JSON',()=>{
  it('preserves bilingual text and real integer timing in chronological order',()=>{expect(normaliseManualTranscriptJson(JSON.stringify({content}))).toEqual({provider:'manual',lang:'ar',content:[content[1],content[0]]})})
  it('reports syntax errors usefully',()=>{expect(()=>normaliseManualTranscriptJson('{')).toThrow('Invalid transcript JSON')})
  it.each([{content:[]},[],{content:[{text:'مرحبا',offset:'0',duration:5}]},{content:[{text:'مرحبا',offset:0,duration:0}]},{content:[{text:'مرحبا',offset:0.5,duration:5}]},{content:[{text:'مرحبا',offset:0,duration:5,english:1}]},{content:[{text:'English',offset:0,duration:5}]},{content:[{text:'مرحبا',offset:43200000,duration:5}]}])('rejects malformed fields without coercion',value=>{expect(()=>normaliseManualTranscriptJson(JSON.stringify(value))).toThrow()})
  it('rejects Show JSON without changing its schema or parser',()=>{expect(()=>normaliseManualTranscriptJson(JSON.stringify([{tokens:[{arabic:'مرحبا'}],timestamp:'0:00',translation:'Hello'}]))).toThrow('content array')})
})
