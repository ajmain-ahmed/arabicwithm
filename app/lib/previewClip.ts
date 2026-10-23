import type { ForYouSegment } from '@/app/lib/forYou'

/** Same bounded, whole-caption window and boundary ordering as the public
 * transcript_for_you_groups RPC. Preview deliberately omits publication gates. */
export function previewClipWindow(segments: ForYouSegment[]): ForYouSegment[] {
  const sorted=[...segments].sort((a,b)=>a.start_seconds-b.start_seconds||a.position-b.position)
  let best:ForYouSegment[]=[], bestRank:number[]=[]
  const finalEnd=sorted.reduce((end,line)=>Math.max(end,line.end_seconds),0)
  for(let anchor=0;anchor<sorted.length;anchor++){
    const start=sorted[anchor].start_seconds, safe:ForYouSegment[]=[]
    let stop=start
    for(const line of sorted.slice(anchor,anchor+256)){
      if(line.start_seconds>=start+60||line.end_seconds<=line.start_seconds||line.start_seconds>stop+2||line.end_seconds>start+60||line.end_seconds>43200||!/[\u0621-\u064a]/.test(line.original_text))break
      safe.push(line);stop=Math.max(stop,line.end_seconds)
      const duration=stop-start
      if(duration<8&&finalEnd>stop)continue
      const rank=[Number(duration>=15&&/[.!?\u061f\u06d4]["' )]*$/.test(line.original_text)),Number(duration>=15&&duration<=45),Number(duration>=15),-Math.abs(duration-30)]
      const difference=rank.findIndex((value,index)=>value!==bestRank[index])
      if(!best.length||(difference>=0&&rank[difference]>bestRank[difference])){best=[...safe];bestRank=rank}
    }
  }
  return best
}
