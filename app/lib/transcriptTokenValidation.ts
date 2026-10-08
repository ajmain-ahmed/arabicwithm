/** Arabic Script AND Unicode Letter, excluding presentation-form vowel marks; same frozen character class in the SQL migration. */
export const ARABIC_LETTER_PATTERN = "[ؠ-ؿف-يٮ-ٯٱ-ۓەۥ-ۦۮ-ۯۺ-ۼۿݐ-ݿࡰ-ࢇࢉ-࢏ࢠ-ࣉﭐ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﺀ-ﻼ𐻂-𐻇𞸀-𞸃𞸅-𞸟𞸡-𞸢𞸤𞸧𞸩-𞸲𞸴-𞸷𞸹𞸻𞹂𞹇𞹉𞹋𞹍-𞹏𞹑-𞹒𞹔𞹗𞹙𞹛𞹝𞹟𞹡-𞹢𞹤𞹧-𞹪𞹬-𞹲𞹴-𞹷𞹹-𞹼𞹾𞺀-𞺉𞺋-𞺛𞺡-𞺣𞺥-𞺩𞺫-𞺻]"
const arabicLetter=new RegExp(ARABIC_LETTER_PATTERN,'u')
export const hasArabicLetter=(value:string):boolean=>arabicLetter.test(value)
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v))
const surface=(t:Record<string,unknown>)=>t.ar??t.arabic??t.surface
const punctuation=(v:string)=>/^[\p{P}]+$/u.test(v)
const openings=/^[([{«‹“‘]+$/u
const closings=/^[.,،؛:!?؟…\])}»›”’]+$/u
const valueText=(v:unknown)=>v===undefined?'missing':JSON.stringify(v)
/** Return a copy. Diagnostics never become content, metadata, or persisted placeholders. */
export function normaliseEnrichmentTokens(values:unknown[],issues:string[]):unknown[]{
 return values.map((value,segment)=>{
  if(!record(value)||value.tokens===undefined)return value
  const report=(token:number,field:string,v:unknown,reason:string)=>issues.push(`Segment ${segment+1}, token ${token+1}: ${field}=${valueText(v)} — ${reason}`)
  if(!Array.isArray(value.tokens)){issues.push(`Segment ${segment+1}: tokens must be an array.`);return value}
  if(!value.tokens.length){issues.push(`Segment ${segment+1}: tokens=[] — supplied enrichment must contain at least one Arabic token.`);return value}
  const tokens=value.tokens.map(t=>record(t)?{...t}:t),removed=new Set<number>(),prefixes=new Map<number,string>()
  for(let index=0;index<tokens.length;index++){
   const token=tokens[index]
   if(!record(token)){report(index,'arabic',token,'token must be an object containing Arabic text.');continue}
   const text=surface(token)
   for(const field of ['arabic','ar','surface'])if(token[field]!==undefined&&token[field]!==text)report(index,field,token[field],'Arabic aliases disagree; correct the source without changing wording.')
   for(const field of ['pos','POS','entry_type','transliteration','cefr','english','gloss'])if(token[field]!==undefined&&typeof token[field]!=='string')report(index,field,token[field],'must be text.')
   if(token.headword!==undefined&&token.headword!==null&&typeof token.headword!=='string')report(index,'headword',token.headword,'must be text or null.')
   if(token.entry_type!==undefined&&!['word','phrase'].includes(String(token.entry_type)))report(index,'entry_type',token.entry_type,'must be word or phrase.')
   if(token.entry_type==='phrase'&&token.headword!==undefined&&(typeof token.headword!=='string'||!(/^[1-9][0-9]*$/).test(token.headword)))report(index,'headword',token.headword,'phrase headword must be a phrase ID string.')
   if(typeof text==='string'&&hasArabicLetter(text))continue
   if(typeof text!=='string'||!punctuation(text)){report(index,'arabic',text,'must contain at least one Arabic-script letter; empty text, Latin-only text, digits and diacritics are not Arabic words.');continue}
   // Punctuation can carry lexical/timing/custom metadata: merging that would lose information.
   const neutral=Object.entries(token).every(([key,v])=>['arabic','ar','surface'].includes(key)||v===null||v===''||(key==='entry_type'&&v==='word')||(['pos','POS'].includes(key)&&['punctuation','punct','unknown'].includes(String(v)))||(['english','gloss','headword','transliteration'].includes(key)&&typeof v==='string'&&punctuation(v)))
   let target=-1
   if(openings.test(text)){for(let next=index+1;next<tokens.length;next++){const t=tokens[next];if(record(t)&&typeof surface(t)==='string'&&hasArabicLetter(String(surface(t)))){target=next;break}if(!record(t)||typeof surface(t)!=='string'||!openings.test(String(surface(t))))break}}
   else if(closings.test(text)){for(let prev=index-1;prev>=0;prev--){const t=tokens[prev];if(record(t)&&typeof surface(t)==='string'&&hasArabicLetter(String(surface(t)))){target=prev;break}if(!removed.has(prev))break}}
   if(!neutral||target<0){report(index,'arabic',text,!neutral?'punctuation has enrichment or timing metadata that cannot be merged without loss.':'punctuation has no unambiguous adjacent Arabic token in this segment.');continue}
   const neighbour=tokens[target] as Record<string,unknown>,word=String(surface(neighbour)),prefix=prefixes.get(target)??'',merged=target>index?prefix+text+word.slice(prefix.length):word+text
   if(target>index)prefixes.set(target,prefix+text)
   for(const key of ['arabic','ar','surface'])if(neighbour[key]!==undefined)neighbour[key]=merged
   removed.add(index)
  }
  const kept=tokens.filter((_,index)=>!removed.has(index))
  const explicit=value.text??value.arabic??value.original_text
  if(removed.size&&typeof explicit==='string'){
   const original=value.tokens.map(t=>record(t)?String(surface(t)??''):'').join('')
   if(explicit.replace(/\s/gu,'')!==original.replace(/\s/gu,''))issues.push(`Segment ${segment+1}: punctuation cannot be attached safely because tokens differ from the supplied Arabic text.`)
  }
  return {...value,tokens:kept}
 })
}
