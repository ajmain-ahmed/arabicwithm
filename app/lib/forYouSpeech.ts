import type {ForYouClip,ForYouSegment} from './forYou'
import {stripDiacritics} from './arabic'

const marker=/^(?:music|opening music|closing music|background music|instrumental(?: music)?|applause|laughter|laughing|silence|silent|sound effects?|sfx|no speech|inaudible|\u0645\u0648\u0633\u064a\u0642\u0649|\u0645\u0648\u0633\u064a\u0642\u0627|\u062a\u0635\u0641\u064a\u0642|\u0636\u062d\u0643|\u0635\u0645\u062a|\u0645\u0624\u062b\u0631\u0627\u062a \u0635\u0648\u062a\u064a\u0629)$/iu
const clean=(text:string)=>stripDiacritics(text).replace(/[\[\](){}\u00ab\u00bb\u266a\u266b.!?,:;\u060c\u061f]/gu,' ').trim().replace(/\s+/g,' ')
function spoken(text:string):string{
 const withoutAnnotations=text.replace(/\[[^\]]*\]|\([^)]*\)/g,annotation=>marker.test(clean(annotation))?' ':annotation)
 const value=clean(withoutAnnotations)
 return marker.test(value)?'':value
}
const words=(text:string)=>spoken(text).match(/[\p{L}\p{M}]+/gu)?.length??0
export function hasSpokenContent(segment:ForYouSegment):boolean{
 const english=segment.tokens.map(token=>token.english).join(' ').trim()
 // A translated annotation must not become speech simply because its Arabic label is a noun.
 if(english&&marker.test(clean(english)))return false
 return Math.max(words(segment.original_text),words(english))>0
}
/** Remove annotation-only tokens from a derived view, never from storage. */
export function spokenSegment(segment:ForYouSegment):ForYouSegment{
 return {...segment,tokens:segment.tokens.filter(token=>!marker.test(clean(token.english||token.arabic)))}
}
/** Selection guard only. Never rewrite stored transcripts or classify their language.
 * Coverage uses the union of spoken intervals: overlapping paragraph timings count once. */
export function speechCoverage(clip:ForYouClip,{minSeconds=0,maxSeconds=Infinity}:{minSeconds?:number;maxSeconds?:number}={}){
 const start=clip.clip_start_ms/1000,end=clip.clip_end_ms/1000,duration=end-start
 const segments=clip.segments.filter(hasSpokenContent),intervals=segments.map(segment=>[Math.max(start,segment.start_seconds),Math.min(end,segment.end_seconds)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])
 let covered=0,stop=start,maxGap=0
 for(const [a,b] of intervals){maxGap=Math.max(maxGap,a-stop);covered+=Math.max(0,b-Math.max(a,stop));stop=Math.max(stop,b)}
 maxGap=Math.max(maxGap,end-stop)
 const wordCount=segments.reduce((total,line)=>total+Math.max(words(line.original_text),words(line.tokens.map(token=>token.english).join(' '))),0)
 const ratio=duration>0?covered/duration:0,lead=intervals.length?intervals[0][0]-start:Infinity
 return {eligible:duration>0&&duration>=minSeconds&&duration<=maxSeconds&&lead<=1.5&&ratio>=.55&&maxGap<=8&&wordCount>=5,segments,ratio,maxGap,wordCount,lead}
}
export function spokenForYouClip(clip:ForYouClip,bounds?:{minSeconds?:number;maxSeconds?:number}):ForYouClip|null{
 const result=speechCoverage(clip,bounds)
 return result.eligible?{...clip,segments:result.segments.map(spokenSegment)}:null
}
