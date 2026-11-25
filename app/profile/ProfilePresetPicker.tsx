'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'

import {useEffect,useState} from 'react'
import {Alert,Box,Button,CircularProgress,Dialog,DialogActions,DialogContent,DialogTitle,Typography} from '@mui/material'
import {listProfilePresets} from '@/app/actions/profilePresets'
import type {ProfilePreset,ProfilePresetBucket} from '@/app/lib/profilePresets'

export default function ProfilePresetPicker({bucket,selected,onSelect,onDone,onCancel}:{bucket:ProfilePresetBucket;selected?:string;onSelect:(preset:ProfilePreset)=>void;onDone:()=>void;onCancel:()=>void}){
 const {t:awmT}=useWebsiteLocale()

 const [items,setItems]=useState<ProfilePreset[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(false),[revision,setRevision]=useState(0)
 const avatars=bucket==='profile-pictures',title=avatars?'Choose Profile Picture':'Choose Profile Banner'
 useEffect(()=>{
  let active=true
  void listProfilePresets(bucket).then(rows=>{if(active){setItems(rows);setError(false);setBusy(false)}}).catch(()=>{if(active){setError(true);setBusy(false)}})
  return()=>{active=false}
 },[bucket,revision])
 function refresh(){setBusy(true);setError(false);setRevision(n=>n+1)}
 return <Dialog open onClose={onCancel} fullWidth maxWidth="sm" aria-labelledby="profile-preset-title" slotProps={{paper:{sx:{borderRadius:'12px',bgcolor:'var(--awm-cream-light)'}}}}>
  <DialogTitle id="profile-preset-title" sx={{fontFamily:'var(--font-heading)'}}>{awmT(title)}</DialogTitle>
  <DialogContent dividers sx={{maxHeight:'65dvh',p:{xs:2,sm:3}}}>
   {busy?<Box sx={{display:'flex',justifyContent:'center',p:4}}><CircularProgress aria-label={awmT("Loading profile presets")}/></Box>:error?<Alert severity="error" action={<Button onClick={refresh}><UiText>{"Try again"}</UiText></Button>}>{awmT(avatars?'Profile pictures could not be loaded. Please try again.':'Profile banners could not be loaded. Please try again.')}</Alert>:!items.length?<Typography role="status">{awmT(avatars?'No profile pictures are available yet.':'No profile banners are available yet.')}</Typography>:<Box data-profile-preset-grid sx={{display:'grid',gridTemplateColumns:avatars?'repeat(auto-fit,72px)':{xs:'1fr',sm:'repeat(2,minmax(0,1fr))'},justifyContent:avatars?'center':undefined,gap:2}}>
    {items.map(item=><Box component="button" type="button" key={item.ref} aria-label={awmT('Select {name}',{name:awmT(item.label)})} aria-pressed={selected===item.ref} onClick={()=>onSelect(item)} sx={{position:'relative',aspectRatio:avatars?'1 / 1':'3 / 1',width:avatars?72:'100%',height:avatars?72:undefined,minWidth:0,flexShrink:0,p:0,border:avatars?'none':'3px solid',borderColor:selected===item.ref?'var(--awm-gold)':'transparent',outline:avatars&&selected===item.ref?'3px solid var(--awm-gold)':'none',outlineOffset:3,borderRadius:avatars?'50%':'8px',overflow:'hidden',bgcolor:avatars?'transparent':'var(--awm-white)',cursor:'pointer','&:hover':avatars?{boxShadow:'0 0 0 2px var(--awm-gold-light)'}:{borderColor:'var(--awm-gold-light)'},'&:focus-visible':{outline:'3px solid var(--awm-forest)',outlineOffset:3}}}><Box component="img" src={item.url} alt={item.label} loading="lazy" sx={{display:'block',width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}}/></Box>)}
   </Box>}
  </DialogContent>
  <DialogActions sx={{flexWrap:'wrap',gap:1,p:2}}><Button onClick={refresh} disabled={busy}><UiText>{"Refresh"}</UiText></Button><Button onClick={onCancel}><UiText>{"Cancel"}</UiText></Button><Button onClick={onDone} variant="contained"><UiText>{"Done"}</UiText></Button></DialogActions>
 </Dialog>
}
