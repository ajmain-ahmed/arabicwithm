/** Elapsed viewing time, never distance travelled through a source video. */
export interface PlaybackSample {clock:number;time:number;playing:boolean;rate:number}
export function elapsedViewingMs(previous:PlaybackSample|null,next:PlaybackSample):number {
 if(!previous||!previous.playing||!next.playing)return 0
 const elapsed=next.clock-previous.clock,advance=next.time-previous.time
 if(elapsed<=0||elapsed>1000||advance<=0||advance>elapsed/1000*Math.max(previous.rate,next.rate)+.75)return 0
 return elapsed
}
