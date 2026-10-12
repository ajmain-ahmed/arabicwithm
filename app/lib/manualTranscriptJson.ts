import type {CanonicalChunk} from '@/app/lib/manualTranscripts'
import {MAX_TRANSCRIPT_TIME_MS,parseTranscriptTime} from '@/app/lib/transcriptTiming'
export const MAX_TRANSCRIPT_BYTES=20*1024*1024
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v))
const contentFields=new Set(['text','arabic','original_text','english','translation','english_text','tokens','offset','start_ms','start_seconds','timestamp','end_ms','end_seconds','duration_ms','duration','duration_seconds'])
export function normaliseManualTranscriptJson(input:string,videoDurationSeconds?:number):{provider:'manual';lang:'ar';content:CanonicalChunk[]}{
 if(new TextEncoder().encode(input).length>MAX_TRANSCRIPT_BYTES)throw new Error('Transcript JSON exceeds the 20 MB import budget.')
 let parsed:unknown;try{parsed=JSON.parse(input)}catch(e){throw new Error(`Invalid transcript JSON: ${(e as Error).message}`)}
 const root=object(parsed)?parsed:{},key=['content','sentences','segments','scriptBlocks','transcript'].find(k=>Array.isArray(root[k])),values=Array.isArray(parsed)?parsed:key?root[key]:null
 if(!Array.isArray(values)||!values.length)throw new Error('Supply a non-empty content[], sentences[], segments[], or timed AWM block array.')
 const issues:string[]=[],content:CanonicalChunk[]=[],label=key==='sentences'?'Sentence':'Segment'
 let videoEnd:number|undefined
 try{if(root.duration_ms!==undefined)videoEnd=parseTranscriptTime(root.duration_ms);else if(root.duration_seconds!==undefined)videoEnd=parseTranscriptTime(root.duration_seconds,'seconds');else if(typeof root.duration==='string')videoEnd=parseTranscriptTime(root.duration);else if(videoDurationSeconds!==undefined)videoEnd=parseTranscriptTime(videoDurationSeconds,'seconds')}catch(e){issues.push(`Invalid video duration: ${(e as Error).message}`)}
 const starts=values.map((item,index)=>{try{if(!object(item))throw new Error('must be an object');const value=item.offset??item.start_ms??item.start_seconds??item.timestamp;if(value===undefined)throw new Error('missing offset / start_ms / timestamp; timed imports require a start time');return parseTranscriptTime(value,item.offset!==undefined||item.start_ms!==undefined?'milliseconds':'seconds')}catch(e){issues.push(`${label} ${index+1}: ${(e as Error).message}`);return undefined}})
 const nextDistinct:(number|undefined)[]=new Array(starts.length);let next:number|undefined
 for(let index=starts.length-1;index>=0;index--){if(starts[index]!==undefined&&starts[index+1]!==undefined&&starts[index+1]!>starts[index]!)next=starts[index+1];nextDistinct[index]=next}
 values.forEach((item,index)=>{
  if(!object(item))return
  const fail=(message:string)=>issues.push(`${label} ${index+1}: ${message}`),offset=starts[index]
  if(offset===undefined)return
  if(index&&starts[index-1]!==undefined&&offset<starts[index-1]!)fail('timestamp-order error; Check timestamp order. Source timestamps have not been changed.')
  if(offset>MAX_TRANSCRIPT_TIME_MS)fail('start exceeds the 12-hour limit.')
  const sourceTokens=item.tokens
  const tokenText=Array.isArray(sourceTokens)?sourceTokens.map(t=>typeof t==='string'?t:object(t)?t.ar??t.arabic??t.surface:undefined):[]
  const derived=tokenText.length&&tokenText.every(v=>typeof v==='string')?tokenText.join(' ')+(typeof item.punctuation==='string'?item.punctuation:''):undefined
  const text=item.text??item.arabic??item.original_text??derived,english=item.english??item.translation??item.english_text
  if(typeof text!=='string'||!text.trim())fail('text is required; provide original text when token text cannot be recovered.')
  if(typeof text==='string'&&text.includes('\u0000'))fail('text contains a NUL character unsupported by database storage.')
  if(english!==undefined&&english!==null&&typeof english!=='string')fail('english / translation must be text.')
  let end:number|undefined
  try{
   if(item.end_ms!==undefined)end=parseTranscriptTime(item.end_ms)
   else if(item.end_seconds!==undefined)end=parseTranscriptTime(item.end_seconds,'seconds')
   else if(item.duration_ms!==undefined)end=offset+parseTranscriptTime(item.duration_ms)
   else if(item.duration!==undefined&&item.duration!==null)end=offset+parseTranscriptTime(item.duration)
   else if(item.duration_seconds!==undefined)end=offset+parseTranscriptTime(item.duration_seconds,'seconds')
   else end=nextDistinct[index]??videoEnd
   if(end!==undefined&&(end<offset||end>MAX_TRANSCRIPT_TIME_MS))fail('end must not precede start or exceed the 12-hour limit.')
  }catch(e){fail(`invalid end_ms / duration: ${(e as Error).message}`)}
  const metadata=Object.fromEntries(Object.entries(item).filter(([k])=>!contentFields.has(k)))
  if(typeof text==='string')content.push({...metadata,text,offset,duration:end===undefined?null:end-offset,...(typeof english==='string'?{english}:{}),...(sourceTokens!==undefined?{tokens:sourceTokens}: {})} as CanonicalChunk)
 })
 if(issues.length)throw new Error(issues.join('\n'))
 const result={provider:'manual' as const,lang:'ar' as const,content}
 if(new TextEncoder().encode(JSON.stringify(result)).length>MAX_TRANSCRIPT_BYTES)throw new Error('Normalised transcript exceeds the 20 MB import budget.')
 return result
}

interface ExportSegment {
  original_text: string
  english_text: string | null
  start_seconds: number
  end_seconds: number | null
  start_ms?: number | null
  end_ms?: number | null
  position?: number
  canonical_paragraph?: unknown
}

/** Portable canonical JSON; no database or processing metadata. */
export function serialiseTranscriptJson(segments: readonly ExportSegment[], raw?: unknown): string {
  const sources = object(raw) && Array.isArray(raw.content) ? [...raw.content].filter(object) : []
  const content = segments.map((segment, index) => {
    const offset = segment.start_ms ?? Math.round(segment.start_seconds * 1000)
    const end = segment.end_seconds===null?null:segment.end_ms ?? Math.round(segment.end_seconds * 1000)
    if (!Number.isSafeInteger(offset) || end!==null && (!Number.isSafeInteger(end) || end < offset) || offset < 0) {
      throw new Error('This transcript contains invalid segment timing and cannot be exported.')
    }
    const source = sources[segment.position ?? index]
    const metadata: Record<string, unknown> = Object.create(null)
    if (source && source.text === segment.original_text && source.offset === offset && source.duration === (end===null?null:end-offset)) {
      for (const [key,value] of Object.entries(source)) if (!contentFields.has(key) || key === 'tokens') metadata[key] = value
    }
    const canonical = segment.canonical_paragraph
    if (object(canonical)) {
      if (Array.isArray(canonical.tokens)) {
        const canonicalTokens = canonical.tokens
        const storedTokens = metadata.tokens
        if (!Array.isArray(storedTokens) || !storedTokens.length) metadata.tokens = canonical.tokens
        else if (storedTokens.length === canonical.tokens.length) metadata.tokens = storedTokens.map((token, index) => {
          const enriched = canonicalTokens[index]
          // Merge only exact token matches; retain original IDs, glosses and timing.
          return object(token) && object(enriched) && (token.ar ?? token.arabic ?? token.surface) === enriched.arabic ? { ...enriched, ...token } : token
        })
      }
      if (metadata.paragraph === undefined && canonical.paragraph !== undefined) metadata.paragraph = canonical.paragraph
    }
    return { ...metadata, text: segment.original_text, offset, duration: end===null?null:end-offset, english: segment.english_text ?? (object(canonical) && typeof canonical.translation === 'string' ? canonical.translation : '') }
  })
  return JSON.stringify({ content }, null, 2)
}

export function transcriptJsonFilename(title: string): string {
  const name = title.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 100)
  return `${name || 'video'}_transcript.json`
}
