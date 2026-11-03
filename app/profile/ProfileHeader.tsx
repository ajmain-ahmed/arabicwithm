'use client'
import {Box,Typography} from '@mui/material'
import ProfileAvatar from './ProfileAvatar'
import type {ThumbnailCrop} from '@/app/lib/thumbnailCrop'

export default function ProfileHeader({name,username,joined,avatar,banner,avatarCrop,editing,onAvatar,onBanner}:{name:string;username:string|null;joined:string;avatar:string|null;banner:string|null;avatarCrop?:ThumbnailCrop;editing:boolean;onAvatar:()=>void;onBanner:()=>void}){
 return <Box data-profile-header sx={{'--profile-avatar-size':{xs:'88px',sm:'112px'},mb:4,bgcolor:'var(--awm-white)',border:'1px solid rgba(184,134,11,.18)',borderRadius:'4px'}}>
  <Box sx={{position:'relative'}}>
   <Box component={editing?'button':'div'} type={editing?'button':undefined} aria-label={editing?'Choose Profile Banner':undefined} onClick={editing?onBanner:undefined} data-profile-banner-frame sx={{display:'block',position:'relative',p:0,border:0,width:'100%',aspectRatio:'3 / 1',minHeight:120,maxHeight:240,bgcolor:'var(--awm-forest)',borderRadius:'4px 4px 0 0',overflow:'hidden',cursor:editing?'pointer':undefined,...(editing?{'&:hover':{outline:'2px solid var(--awm-gold)',outlineOffset:2},'&:focus-visible':{outline:'3px solid var(--awm-gold)',outlineOffset:3}}:{})}}>
    <Box component="img" key={banner} src={banner??'/homepage/mosaic-banner.avif'} alt="Profile banner" onError={event=>{event.currentTarget.style.visibility='hidden'}} sx={{display:'block',position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>
   </Box>
   <Box data-profile-avatar-anchor sx={{position:'absolute',left:theme=>({xs:theme.spacing(2),sm:theme.spacing(3),md:theme.spacing(4)}),bottom:0,transform:'translateY(50%)',zIndex:1}}><ProfileAvatar name={name} src={avatar} crop={avatarCrop} editable={editing} onChoose={onAvatar}/></Box>
  </Box>
  <Box data-profile-identity sx={{px:{xs:2,sm:3,md:4},pt:'calc(var(--profile-avatar-size) / 2 + 24px)',pb:3,textAlign:'left',overflowWrap:'anywhere'}}>
   <Typography sx={{fontFamily:'var(--font-heading)',fontSize:{xs:24,sm:28},fontWeight:600,color:'var(--awm-bark)',lineHeight:1.2}}>{name}</Typography>
   {username&&<Typography sx={{fontSize:14,color:'var(--awm-muted)',mt:.5}}>@{username}</Typography>}
   <Typography sx={{fontSize:14,color:'var(--awm-muted)',mt:.5}}>Learning since {joined}</Typography>
  </Box>
 </Box>
}
