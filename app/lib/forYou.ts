export interface ForYouToken { arabic:string; english:string }
export interface ForYouSegment {
 id:number; position:number; original_text:string; english_text:string|null;
 start_seconds:number; end_seconds:number; canonical_paragraph?:unknown; tokens:ForYouToken[]
}
export interface ForYouClip {
 video:{id:string;youtube_id:string;title:string;channel:string|null};
 clip_start_ms:number;clip_end_ms:number;segments:ForYouSegment[]
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
  return [{arabic,english:firstText(token.english,token.gloss,token.translation,matching.english,matching.gloss,matching.translation)}]
 })
}
