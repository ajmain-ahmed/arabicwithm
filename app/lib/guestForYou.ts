import {elapsedViewingMs,type PlaybackSample} from './forYouMeter'

export const GUEST_FOR_YOU_LIMIT_MS=5*60*1000
export const GUEST_FOR_YOU_STORAGE_KEY='awm-for-you-guest-playback-v1'
let usedMs=0
const listeners=new Set<()=>void>()
export function readGuestForYouUsage():number{
 if(typeof window==='undefined')return 0
 try{const stored=Number(window.localStorage.getItem(GUEST_FOR_YOU_STORAGE_KEY)??0);if(Number.isFinite(stored)&&stored>=0)usedMs=Math.max(usedMs,Math.min(GUEST_FOR_YOU_LIMIT_MS,stored))}catch{}
 return usedMs
}
export function guestForYouExhausted(){return readGuestForYouUsage()>=GUEST_FOR_YOU_LIMIT_MS}
function notify(){for(const listener of listeners)listener()}
export function chargeGuestForYouPlayback(delta:number){
 if(!Number.isFinite(delta)||delta<=0||delta>1000)return
 usedMs=Math.min(GUEST_FOR_YOU_LIMIT_MS,readGuestForYouUsage()+delta)
 // Persist each valid sample, including the final sample before refresh/exit.
 try{window.localStorage.setItem(GUEST_FOR_YOU_STORAGE_KEY,String(usedMs))}catch{}
 notify()
}
function onStorage(event:StorageEvent){if(event.key===GUEST_FOR_YOU_STORAGE_KEY||event.key===null){readGuestForYouUsage();notify()}}
export function subscribeGuestForYou(listener:()=>void){
 listeners.add(listener)
 if(listeners.size===1)window.addEventListener('storage',onStorage)
 return()=>{listeners.delete(listener);if(!listeners.size)window.removeEventListener('storage',onStorage)}
}
export function createGuestForYouMeter(){
 let previous:PlaybackSample|null=null,pause:(()=>void)|null=null,pausing=false
 function stop(){previous=null;if(pausing)return;pausing=true;try{pause?.()}finally{pausing=false}}
 return {
  stop,
  canAdvance:()=>!guestForYouExhausted(),
  sample(sample:{time:number;playing:boolean;rate:number;pause:()=>void},clock=performance.now(),visible=!document.hidden){
   pause=sample.pause
   if(guestForYouExhausted()||!visible){stop();return}
   const next={time:sample.time,playing:sample.playing,rate:sample.rate,clock}
   const elapsed=elapsedViewingMs(previous,next)
   previous=sample.playing?next:null
   if(elapsed)chargeGuestForYouPlayback(elapsed)
   if(guestForYouExhausted())stop()
  },
 }
}
