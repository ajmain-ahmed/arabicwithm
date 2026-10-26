'use client'

import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import {Alert,Box,Button,CircularProgress,Dialog,DialogActions,DialogContent,DialogTitle,Typography} from '@mui/material'
import {syncForYouUsage} from '@/app/actions/forYouUsage'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import {elapsedViewingMs,type PlaybackSample} from '@/app/lib/forYouMeter'

import {MeterContext,type PlayerSample} from './ForYouMeterContext'

/** One account lease and clock across clips and Short/Full. No visible timer. */
export default function ForYouAllowance({children,onExplore}:{children:ReactNode;onExplore:()=>void}){
 const [admitted,setAdmitted]=useState(false)
 const [ready,setReady]=useState(false),[limited,setLimited]=useState(false),[error,setError]=useState(''),[upgrade,setUpgrade]=useState(false)
 const meter=useRef({lease:'',total:0,remaining:Infinity,unlimited:false,previous:null as PlaybackSample|null,pause:null as (()=>void)|null,blocked:true,busy:false})
 const sample=useCallback(({time,playing,rate,pause}:PlayerSample)=>{
  const m=meter.current;m.pause=pause
  if(m.blocked){if(playing)pause();m.previous=null;return}
  if(m.unlimited)return
  const next={time,playing,rate,clock:performance.now()}
  const elapsed=elapsedViewingMs(m.previous,next)
  m.previous=next;m.total+=elapsed;m.remaining=Math.max(0,m.remaining-elapsed)
  if(m.remaining<=0){m.blocked=true;pause();setLimited(true)}
 },[])
 useEffect(()=>{
  let alive=true,inFlight=false,pendingRelease=false
  const m=meter.current;m.lease=crypto.randomUUID()
  async function sync(acquire=false){
   if(inFlight)return
   if(m.unlimited&&!acquire)return
   inFlight=true
   const totalMs=Math.floor(m.total)
   try{
    const active=acquire||(!m.blocked&&!!m.previous?.playing&&performance.now()-m.previous.clock<1000)
    const result=await syncForYouUsage({lease:m.lease,totalMs,active})
    if(!alive)return
    m.unlimited=result.unlimited
    m.remaining=result.unlimited?Infinity:Math.max(0,(result.remainingMs??0)-(m.total-totalMs))
    m.blocked=result.busy||m.remaining<=0
    m.busy=result.busy
    setLimited(!result.unlimited&&m.remaining<=0)
    setError(result.busy?'For You is playing in another tab or device. Pause it there, then retry.':'')
    if(m.blocked)m.pause?.()
    if(!m.blocked)setAdmitted(true)
    setReady(true)
   }catch{
    if(alive){m.blocked=true;m.pause?.();setError('Unable to verify For You access. Please retry.');setReady(true)}
   }finally{inFlight=false;if(pendingRelease){pendingRelease=false;release()}}
  }
  void sync(true)
  const timer=window.setInterval(()=>void sync(),1000)
  const refresh=()=>void sync(true)
  const release=()=>{m.previous=null;m.pause?.();if(inFlight){pendingRelease=true;return}void syncForYouUsage({lease:m.lease,totalMs:Math.floor(m.total),active:false}).catch(()=>{})}
  window.addEventListener('account-access-changed',refresh)
  window.addEventListener('pagehide',release)
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('account-access-changed',refresh);window.removeEventListener('pagehide',release);release()}
 },[])
 return <MeterContext.Provider value={sample}>
  <Box sx={{position:'relative',minHeight:'calc(100dvh - var(--awm-navbar-height))'}}>
   {!ready?<Box sx={{minHeight:'60dvh',display:'grid',placeItems:'center'}}><CircularProgress aria-label="Loading For You"/></Box>:admitted?children:null}
   {error&&<Box sx={{position:'absolute',inset:0,zIndex:20,bgcolor:'background.default',p:3}}><Alert severity="info">{error}</Alert><Button onClick={()=>window.dispatchEvent(new Event('account-access-changed'))}>Retry</Button><Button onClick={onExplore}>Continue on Explore</Button></Box>}
  </Box>
  <Dialog open={limited&&!upgrade} aria-labelledby="for-you-limit-title" maxWidth="xs" fullWidth>
   <DialogTitle id="for-you-limit-title">Unlock unlimited For You</DialogTitle>
   <DialogContent><Typography>Upgrade to AWM Plus for unlimited For You viewing.</Typography></DialogContent>
   <DialogActions sx={{flexDirection:'column',gap:1,p:3,'& > :not(style) ~ :not(style)':{ml:0}}}><Button fullWidth variant="contained" onClick={()=>setUpgrade(true)}>Upgrade to AWM Plus</Button><Button fullWidth onClick={onExplore}>Continue on Explore</Button></DialogActions>
  </Dialog>
  <PremiumPrompt open={upgrade} onClose={()=>setUpgrade(false)}/>
 </MeterContext.Provider>
}
