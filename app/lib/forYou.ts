export interface ForYouToken { arabic:string; english:string; start_seconds?:number; end_seconds?:number }
export interface ForYouSegment {
 id:number; position:number; original_text:string; english_text:string|null;
 start_seconds:number; end_seconds:number; canonical_paragraph?:unknown; source_tokens?:unknown; tokens:ForYouToken[]
}
export interface ForYouClip {
 video:{id:string;youtube_id:string;title:string;channel:string|null};
 clip_start_ms:number;clip_end_ms:number;segments:ForYouSegment[]
}

/** Hourly seed for the very first For You batch: every visitor in the same
    hour gets the same opening clips, so the initial fetch is shared via the
    data cache instead of hitting the RPC once per visitor. */
export function hourlySeed(): string {
  return `hour-${new Date().toISOString().slice(0, 13)}`
}
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value))
const firstText=(...values:unknown[]):string=>values.find((v):v is string=>typeof v==='string'&&Boolean(v.trim()))?.trim()??''

/** Source tokens may be useful even when optional dictionary enrichment failed.
 * Never substitute sentence translations or dictionary definitions for glosses. */
export function forYouTokens(canonical:unknown,source:unknown):ForYouToken[] {
 const canonicalTokens=record(canonical)&&Array.isArray(canonical.tokens)?canonical.tokens:[]
 const sourceTokens=record(source)&&Array.isArray(source.tokens)?source.tokens:[]
 const tokens=sourceTokens.length?sourceTokens:canonicalTokens
 return tokens.flatMap((value,index)=>{
  const token=typeof value==='string'?{arabic:value}:value
  if(!record(token))return []
  const arabic=firstText(token.arabic,token.ar,token.surface)
  if(!arabic)return []
  const enriched=canonicalTokens[index]
  const matching=record(enriched)&&firstText(enriched.arabic,enriched.ar,enriched.surface)===arabic?enriched:{}
  const start = typeof token.start_seconds === 'number' ? token.start_seconds : typeof token.start_ms === 'number' ? token.start_ms / 1000 : typeof token.start === 'number' ? token.start : undefined
  const end = typeof token.end_seconds === 'number' ? token.end_seconds : typeof token.end_ms === 'number' ? token.end_ms / 1000 : typeof token.end === 'number' ? token.end : undefined
  return [{arabic,english:firstText(token.english,token.gloss,token.translation,matching.english,matching.gloss,matching.translation), ...(start !== undefined && end !== undefined && end > start ? {start_seconds:start,end_seconds:end}: {})}]
 })
}

/** Gaps must not fall back to an unrelated first sentence. */
export function segmentAtTime(segments:ForYouSegment[], seconds:number):ForYouSegment|undefined {
 return segments.find(segment=>segment.start_seconds<=seconds && seconds<segment.end_seconds)
}
