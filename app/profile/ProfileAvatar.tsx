'use client'
import {Avatar,Box} from '@mui/material'
import {thumbnailCropCss,type ThumbnailCrop} from '@/app/lib/thumbnailCrop'

export default function ProfileAvatar({name,src,crop,editable=false,onChoose}:{name:string;src:string|null;crop?:ThumbnailCrop;editable?:boolean;onChoose?:()=>void}){
 const interactive=editable&&!!onChoose
 return <Box component={interactive?'button':'span'} type={interactive?'button':undefined} aria-label={interactive?'Choose Profile Picture':undefined} onClick={interactive?onChoose:undefined} sx={{display:'block',p:0,border:0,borderRadius:'50%',bgcolor:'transparent',cursor:interactive?'pointer':undefined,outlineOffset:3,...(interactive?{'&:hover':{outline:'2px solid var(--awm-gold)'},'&:focus-visible':{outline:'3px solid var(--awm-gold)'}}:{})}}>
  <Avatar data-profile-avatar src={src??undefined} alt={name} sx={{width:'var(--profile-avatar-size,104px)',height:'var(--profile-avatar-size,104px)',bgcolor:'var(--awm-forest)',color:'var(--awm-cream)',fontFamily:'var(--font-heading)',fontSize:44,border:'4px solid var(--awm-white)',boxShadow:'0 2px 8px rgba(44,26,14,.12)','& .MuiAvatar-img':{objectFit:'cover',...thumbnailCropCss(crop)}}}>{name.charAt(0).toUpperCase()||'A'}</Avatar>
 </Box>
}
