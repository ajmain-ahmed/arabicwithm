'use client'
import {useEffect,useState} from 'react'
import {Alert,Box,Button,CircularProgress,Dialog,DialogActions,DialogContent,DialogTitle,Typography} from '@mui/material'
import {listProfilePresets} from '@/app/actions/profilePresets'
import type {ProfilePreset,ProfilePresetBucket} from '@/app/lib/profilePresets'

export default function ProfilePresetPicker({bucket,selected,onSelect,onDone,onCancel}:{bucket:ProfilePresetBucket;selected?:string;onSelect:(preset:ProfilePreset)=>void;onDone:()=>void;onCancel:()=>void}){
 const [items,setItems]=useState<ProfilePreset[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(false),[revision,setRevision]=useState(0)
 const avatars=bucket==='profile-pictures',title=avatars?'Choose Profile Picture':'Choose Profile Banner'
 useEffect(()=>{
  let active=true
  void listProfilePresets(bucket).then(rows=>{if(active){setItems(rows);setError(false);setBusy(false)}}).catch(()=>{if(active){setError(true);setBusy(false)}})
  return()=>{active=false}
 },[bucket,revision])
 function refresh(){setBusy(true);setError(false);setRevision(n=>n+1)}
 return <Dialog open onClose={onCancel} fullWidth maxWidth="sm" aria-labelledby="profile-preset-title" slotProps={{paper:{sx:{borderRadius:'12px',bgcolor:'var(--awm-cream-light)'}}}}>
  <DialogTitle id="profile-preset-title" sx={{fontFamily:'var(--font-heading)'}}>{title}</DialogTitle>
  <DialogContent dividers sx={{maxHeight:'65dvh',p:{xs:2,sm:3}}}>
   {busy?<Box sx={{display:'flex',justifyContent:'center',p:4}}><CircularProgress aria-label="Loading profile presets"/></Box>:error?<Alert severity="error" action={<Button onClick={refresh}>Try again</Button>}>{avatars?'Profile pictures':'Profile banners'} could not be loaded. Please try again.</Alert>:!items.length?<Typography role="status">No {avatars?'profile pictures':'profile banners'} are available yet.</Typography>:<Box data-profile-preset-grid sx={{display:'grid',gridTemplateColumns:avatars?{xs:'repeat(3,minmax(0,1fr))',sm:'repeat(5,minmax(0,1fr))'}:{xs:'1fr',sm:'repeat(2,minmax(0,1fr))'},gap:2}}>
    {items.map(item=><Box component="button" type="button" key={item.ref} aria-label={`Select ${item.label}`} aria-pressed={selected===item.ref} onClick={()=>onSelect(item)} sx={{position:'relative',aspectRatio:avatars?'1 / 1':'3 / 1',width:'100%',minWidth:0,p:0,border:'3px solid',borderColor:selected===item.ref?'var(--awm-gold)':'transparent',borderRadius:avatars?'50%':'8px',overflow:'hidden',bgcolor:'var(--awm-white)',cursor:'pointer','&:hover':{borderColor:'var(--awm-gold-light)'},'&:focus-visible':{outline:'3px solid var(--awm-forest)',outlineOffset:3}}}><Box component="img" src={item.url} alt={item.label} loading="lazy" sx={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/></Box>)}
   </Box>}
  </DialogContent>
  <DialogActions sx={{flexWrap:'wrap',gap:1,p:2}}><Button onClick={refresh} disabled={busy}>Refresh</Button><Button onClick={onCancel}>Cancel</Button><Button onClick={onDone} variant="contained">Done</Button></DialogActions>
 </Dialog>
}
