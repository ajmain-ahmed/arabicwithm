import type {ForYouClip,ForYouSegment} from './forYou'

/** Homepage-only bounds; the normal For You candidate selector is unchanged.
 * End at real transcript boundaries, preferring a completed thought at 40-60s.
 * Do not bridge missing/invalid sentences or long silent gaps. */
export function selectHomeSpotlight(clip:ForYouClip,source:ForYouSegment[]=clip.segments):ForYouClip|null {
 const start=clip.clip_start_ms/1000,lines:ForYouSegment[]=[]
 let best:ForYouClip|null=null,bestScore=-1
 for(const line of [...source].sort((a,b)=>a.start_seconds-b.start_seconds)){
  if(line.start_seconds<start)continue
  const previous=lines.at(-1)
  if(line.end_seconds>start+60||line.start_seconds>(previous?.end_seconds??start)+3||previous&&line.position!==previous.position+1)break
  lines.push(line)
  const duration=line.end_seconds-start
  if(duration<30)continue
  const complete=/[.!?\u061f\u3002\u2026]["'\u00bb\u201d)]?$/.test(line.original_text.trim())
  const score=(duration>=40?100:0)+(complete?60:0)+duration
  if(score>bestScore){bestScore=score;best={...clip,clip_end_ms:Math.round(line.end_seconds*1000),segments:[...lines]}}
 }
 return best
}
