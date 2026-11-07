export interface ForYouToken { arabic:string; english:string; cefr?:string|null; pos?:string|null; headword?:string|null; entry_type?:string|null; transliteration?:string|null; start_seconds?:number; end_seconds?:number }
export interface ForYouSegment {
 id:number; position:number; original_text:string; english_text:string|null; translation?:string|null;
 start_seconds:number; end_seconds:number; canonical_paragraph?:unknown; source_tokens?:unknown; tokens:ForYouToken[]
}
export interface ForYouClip {
 video:{source_language?:'ar'|'en';id:string;youtube_id:string;title:string;channel:string|null};
 clip_start_ms:number;clip_end_ms:number;segments:ForYouSegment[]
}

const record=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value))
const firstText=(...values:unknown[]):string=>values.find((v):v is string=>typeof v==='string'&&Boolean(v.trim()))?.trim()??''

/** Source tokens may be useful even when optional dictionary enrichment failed.
 * Never substitute sentence translations or dictionary definitions for glosses. */
export function forYouTokens(canonical:unknown,source:unknown):ForYouToken[] {
 const canonicalTokens=record(canonical)&&Array.isArray(canonical.tokens)?canonical.tokens:[]
 const sourceTokens=record(source)&&Array.isArray(source.tokens)?source.tokens:[]
 const parse=(tokens:unknown[])=>tokens.flatMap((value,index)=>{
  const token=typeof value==='string'?{arabic:value}:value
  if(!record(token))return []
  const arabic=firstText(token.arabic,token.ar,token.surface)
  if(!arabic)return []
  const enriched=sourceTokens[index]
  const matching=record(enriched)&&firstText(enriched.arabic,enriched.ar,enriched.surface)===arabic?enriched:{}
  const start = typeof token.start_seconds === 'number' ? token.start_seconds : typeof token.start_ms === 'number' ? token.start_ms / 1000 : typeof token.start === 'number' ? token.start : undefined
  const end = typeof token.end_seconds === 'number' ? token.end_seconds : typeof token.end_ms === 'number' ? token.end_ms / 1000 : typeof token.end === 'number' ? token.end : undefined
  const timingStart=start??(typeof matching.start_ms==='number'?matching.start_ms/1000:matching.start_seconds)
  const timingEnd=end??(typeof matching.end_ms==='number'?matching.end_ms/1000:matching.end_seconds)
  const nullable=Object.fromEntries(['pos','headword','entry_type','transliteration','cefr'].filter(key=>key in token).map(key=>[key,typeof token[key]==='string'?token[key]:null]))
  return [{arabic,english:firstText(token.english,token.gloss,token.translation,matching.english,matching.gloss,matching.translation),...nullable, ...(typeof timingStart==='number'&&Number.isFinite(timingStart)&&typeof timingEnd==='number'&&Number.isFinite(timingEnd)&&timingEnd>timingStart&&timingStart>=0 ? {start_seconds:timingStart,end_seconds:timingEnd}: {})}]
 })
 const preferred=parse(canonicalTokens)
 return preferred.length?preferred:parse(sourceTokens)
}

/** Gaps must not fall back to an unrelated first sentence. */
export function segmentAtTime(segments:ForYouSegment[], seconds:number):ForYouSegment|undefined {
 return segments.find(segment=>segment.start_seconds<=seconds && seconds<segment.end_seconds)
}
