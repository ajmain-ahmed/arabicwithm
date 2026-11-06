/** Interpret observed player sound without mistaking autoplay fallback for user intent. */
export function createPlayerSoundIntent(){
 let temporary=false,pendingFallback=false,audibleSeen=false,lastMuted:boolean|undefined,lastVolume:number|undefined
 return {
  autoplayBlocked(){temporary=true;pendingFallback=true},
  requestSound(){pendingFallback=false},
  observe(muted:boolean,volume:number):'sound'|'muted'|null{
   const changed=muted!==lastMuted||(volume===0)!==(lastVolume===0)
   const zeroed=lastVolume!==undefined&&lastVolume>0&&volume===0
   lastMuted=muted;lastVolume=volume
   if(muted&&temporary)pendingFallback=false
   if(!muted&&!pendingFallback){temporary=false;audibleSeen=true}
   if(!changed)return null
   if(!muted&&!pendingFallback)return 'sound'
   if(muted&&((audibleSeen&&!temporary)||zeroed))return 'muted'
   return null
  },
 }
}
