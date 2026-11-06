'use client'

import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react'
import {Box,Button,CircularProgress,Typography} from '@mui/material'
import {createGuestForYouMeter,guestForYouExhausted,subscribeGuestForYou} from '@/app/lib/guestForYou'
import {AdvanceContext,MeterContext} from './ForYouMeterContext'

function openGuestAuth(mode:'register'|'signin'){
 window.dispatchEvent(new CustomEvent('open-auth-dialog',{detail:{mode,purpose:'Sign up or sign in to keep watching For You'}}))
}
export default function GuestForYouAllowance({children,home=false}:{children:ReactNode;home?:boolean}){
 const exhausted=useSyncExternalStore<boolean|undefined>(subscribeGuestForYou,guestForYouExhausted,()=>undefined)
 const [current]=useState(createGuestForYouMeter)
 const previous=useRef<boolean|undefined>(undefined)
 useEffect(()=>{
  if(exhausted){current.stop();if(previous.current===false&&!home)openGuestAuth('signin')}
  previous.current=exhausted
 },[exhausted,current,home])
 useEffect(()=>{
  const hide=()=>{if(document.hidden)current.stop()}
  const leave=()=>current.stop()
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave)
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);current.stop()}
 },[current])
 if(exhausted===undefined)return <Box role="status" sx={{py:4,textAlign:'center'}}><CircularProgress size={24} aria-label="Loading preview"/></Box>
 if(exhausted)return <Box data-guest-for-you-exhausted sx={{py:4,px:2,textAlign:'center'}}>
  <Typography component="h3" variant="h5">{home?'Want more For You?':'Enjoying For You?'}</Typography>
  <Typography sx={{my:2}}>Sign up or sign in to {home?'watch more videos picked for you.':'keep watching more videos picked for you.'}</Typography>
  <Box sx={{display:'flex',justifyContent:'center',gap:1,flexWrap:'wrap'}}><Button variant="contained" onClick={()=>openGuestAuth('register')}>Sign up</Button><Button onClick={()=>openGuestAuth('signin')}>Sign in</Button></Box>
 </Box>
 return <AdvanceContext.Provider value={current.canAdvance}><MeterContext.Provider value={current.sample}>{children}</MeterContext.Provider></AdvanceContext.Provider>
}
