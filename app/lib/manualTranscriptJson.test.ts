import {it,expect} from 'vitest'
import {normaliseManualTranscriptJson,serialiseTranscriptJson,transcriptJsonFilename} from './manualTranscriptJson'
import legacy from './fixtures/transcript-start-only.json'
const parse=(segments:unknown)=>normaliseManualTranscriptJson(JSON.stringify(segments))
it.each(['مرحبا','مَرْحَبًا','English','42','١٢٣','50%','12.5','2026-10-08','08:22','Dr. Smith','[Music]','! «» 😀 Ω'])('preserves legitimate source %j',text=>expect(parse([{text,start_ms:1234}]).content[0]).toMatchObject({text,offset:1234,duration:null}))
it.each([undefined,null,[],{},'broken',[null,{headword:42,arabic:''}]])('preserves optional unsupported enrichment %j',tokens=>{
 const raw=parse([{text:'مرحبا 42!',timestamp:'00:01.234',end_ms:5000,tokens}])
 expect(raw.content[0]).toMatchObject({text:'مرحبا 42!',offset:1234,duration:3766,...(tokens!==undefined?{tokens}:{})})
})
it('preserves enrichment and does not absorb punctuation or reorder repeated timestamps',()=>{
 const tokens=[{arabic:'مرحبا',pos:'noun',headword:'مرحبا',english:'hello',entry_type:'word',transliteration:'marhaba',custom:{keep:true}},{arabic:'!'},{arabic:'42'}]
 const raw=parse([{tokens,start_ms:1234,paragraph:'custom'},{text:'Another caption',start_ms:1234},{text:'Final',start_ms:4567}])
 expect(raw.content).toHaveLength(3);expect(raw.content[0].tokens).toEqual(tokens);expect(raw.content[0].text).toBe('مرحبا ! 42');expect(raw.content.map(c=>[c.offset,c.duration])).toEqual([[1234,3333],[1234,3333],[4567,null]])
})
it('infers only next distinct known start or supplied final end',()=>{
 expect(parse([{text:'A',start_ms:1000},{text:'B',start_ms:1000},{text:'C',start_ms:2000,end_ms:3500}]).content.map(c=>c.duration)).toEqual([1000,1000,1500])
 expect(normaliseManualTranscriptJson(JSON.stringify([{text:'A',start_ms:1000}]),5).content[0].duration).toBe(4000)
 expect(parse([{text:'A',start_ms:1000,duration:0}]).content[0].duration).toBe(0)
})
it.each(['content','segments','sentences','scriptBlocks','transcript'])('accepts %s wrappers',key=>expect(parse({[key]:[{text:'Readable',start_seconds:1.234,end_seconds:5.678}]}).content[0]).toMatchObject({offset:1234,duration:4444}))
it('accepts legacy JSON without requiring video duration or merging its captions',()=>{
 const raw=parse(legacy);expect(raw.content).toHaveLength(legacy.length);expect(raw.content[1].tokens).toEqual(legacy[1].tokens);expect(raw.content[1].offset).toBe(raw.content[2].offset);expect(raw.content.at(-1)?.duration).toBeNull()
})
it('keeps explicit wording when enrichment is unusable',()=>expect(parse([{text:'Every original word 42!',timestamp:'00:00',tokens:[{},false,null]}]).content[0].text).toBe('Every original word 42!'))
it('rejects missing essential text when token surfaces cannot be recovered',()=>expect(()=>parse([{tokens:[{}],timestamp:'00:00'}])).toThrow('text is required'))
it.each(['{','['])('reports malformed JSON %j',json=>expect(()=>normaliseManualTranscriptJson(json)).toThrow('Invalid transcript JSON'))
it.each([[],{content:[]},[{text:'',start_ms:0}],[{text:'Readable'}],[{text:'Readable',start_ms:-1}],[{text:'Readable',start_ms:0.5}],[{text:'Readable',start_ms:1,end_ms:0}],[{text:'Readable',start_ms:43200000,end_ms:43200001}],[{text:'Readable',start_ms:0,translation:42}]])('rejects structural error %j',value=>expect(()=>parse(value)).toThrow())
it('collects structural issues without altering chronology',()=>{
 let message='';try{parse([{text:'',start_ms:1000},{text:'Text',start_ms:0,end_ms:-1}])}catch(e){message=(e as Error).message}
 expect(message).toContain('Segment 1');expect(message).toContain('Segment 2');expect(message).toContain('timestamp-order')
})
it('handles large legacy files and long source text without segment-count rules',()=>{const text='Readable '.repeat(3000),source=Array.from({length:5001},(_,index)=>({text:index===0?text:'Text',start_ms:index*1000}));expect(parse(source).content).toHaveLength(5001);expect(parse(source).content[0].text).toBe(text)})
it('exports real ends and open ends without manufacturing timestamps',()=>{
 const content=JSON.parse(serialiseTranscriptJson([{original_text:'Text',english_text:'Translation',start_seconds:1.234,end_seconds:null}])).content
 expect(content[0]).toEqual({text:'Text',offset:1234,duration:null,english:'Translation'});expect(parse({content}).content).toEqual(content)
 expect(transcriptJsonFilename('../Unsafe title')).not.toMatch(/[<>:"/\\|?*]/)
})
