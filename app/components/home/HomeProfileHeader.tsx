'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar, Box, Button, Chip, Typography } from '@mui/material'
import { DiamondOutlined, LocalFireDepartmentRounded } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { fetchPublicProfile, type PublicProfile } from '@/app/actions/profiles'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

export default function HomeProfileHeader() {
  const { user } = useAuth()
  const [snapshot,setProfile]=useState<PublicProfile|null>(null)
  useEffect(()=>{let active=true;if(user?.id)void fetchPublicProfile(user.id).then(value=>{if(active)setProfile(value)}).catch(()=>{});return()=>{active=false}},[user])
  if(!user)return null
  const profile=snapshot?.id===user.id?snapshot:null
  const name=profile?.displayName ?? String(user.user_metadata.full_name ?? 'Arabic learner')
  const banner=typeof user.user_metadata.banner_url==='string'?user.user_metadata.banner_url:'/homepage/mosaic-banner.avif'
  return <Box component="header" data-home-profile sx={{width:'100%',pb:1}}>
    <Box component="img" data-profile-banner src={banner} alt="Profile banner" sx={{display:'block',width:'100%',height:{xs:'clamp(190px, 40vw, 300px)',md:'clamp(300px, 29vw, 460px)'},objectFit:'cover',objectPosition:'50% 45%'}}/>
    <Box data-profile-card sx={{position:'relative',zIndex:1,width:'calc(100% - 32px)',maxWidth:1152,mx:'auto',mt:{xs:-5,md:-8},p:{xs:2.5,md:4},boxSizing:'border-box',display:'grid',gridTemplateColumns:{xs:'1fr',sm:'112px minmax(0,1fr)'},columnGap:3,rowGap:2,alignItems:'center',borderRadius:'20px',bgcolor:'var(--awm-white)',border:'1px solid color-mix(in srgb,var(--awm-gold) 20%,transparent)',boxShadow:'0 8px 30px rgba(44,26,14,.08)'}}>
      <Avatar src={user.user_metadata.avatar_url} alt={name} sx={{gridRow:{sm:'1 / 3'},alignSelf:'start',width:{xs:88,md:112},height:{xs:88,md:112},boxShadow:'0 3px 12px rgba(0,0,0,.12)',border:'4px solid var(--awm-white)','& img':thumbnailCropCss(user.user_metadata.avatar_crop)}}>{name[0]}</Avatar>
      <Box sx={{display:'flex',gap:1,alignItems:'center',flexWrap:'wrap',minWidth:0,'& .MuiChip-root':{height:30,fontSize:12,bgcolor:'var(--awm-cream)',border:'1px solid color-mix(in srgb,var(--awm-gold) 20%,transparent)'},'& .MuiChip-icon':{fontSize:18,color:'var(--awm-gold)'}}}>
        <Typography component="h1" sx={{fontFamily:'var(--font-heading)',fontSize:{xs:28,md:36},fontWeight:600,lineHeight:1.15,mr:1,overflowWrap:'anywhere',width:{xs:'100%',sm:'auto'}}}>{name}</Typography>
        {profile&&<Chip aria-label={`Streak ${profile.summary.streak}`} icon={<LocalFireDepartmentRounded/>} label={profile.summary.streak}/>}
        {profile&&<Chip icon={profile.premium?<DiamondOutlined/>:undefined} label={profile.premium?'AWM Plus':'User'}/>}
        <Button component={Link} href="/profile" sx={{ml:{xs:0,sm:'auto'},textTransform:'none',minHeight:36,fontSize:12,px:1.5,borderRadius:'999px',border:'1px solid color-mix(in srgb,var(--awm-gold) 30%,transparent)'}}>Edit Profile</Button>
      </Box>
    </Box>
  </Box>
}
