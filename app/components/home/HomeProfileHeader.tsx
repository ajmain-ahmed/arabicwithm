'use client'
import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogContent, DialogTitle, Typography } from '@mui/material'
import { DiamondOutlined, LocalFireDepartmentRounded } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { fetchPublicProfile, type PublicProfile } from '@/app/actions/profiles'
import ProfileAvatar from '@/app/profile/ProfileAvatar'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

/* The supabase client is imported dynamically inside upload() (interaction
   time) so supabase-js stays out of the initial bundle. */

export default function HomeProfileHeader() {
  const { user } = useAuth()
  const [snapshot,setProfile]=useState<PublicProfile|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{let active=true;if(user?.id)void fetchPublicProfile(user.id).then(value=>{if(active)setProfile(value)}).catch(()=>{});return()=>{active=false}},[user])
  if(!user)return null
  const profile=snapshot?.id===user.id?snapshot:null
  const name=profile?.displayName ?? String(user.user_metadata.full_name ?? 'Arabic learner')
  const banner=typeof user.user_metadata.banner_url==='string'?user.user_metadata.banner_url:'/homepage/mosaic-banner.avif'
  async function upload(file?:File){
    if(!file||busy||!user)return
    setError('');setBusy(true)
    let uploaded:string|undefined
    // Interaction-time import: keeps supabase-js out of the initial bundle.
    const { supabase } = await import('@/app/lib/supabase/client')
    try{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choose a JPEG, PNG or WebP image under 5 MB.')
      const {data,error:authError}=await supabase.auth.getUser()
      if(authError||data.user?.id!==user.id)throw new Error('Sign in again to update your banner.')
      const bitmap=await createImageBitmap(file)
      const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas')
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
      const context=canvas.getContext('2d');if(!context)throw new Error('Unable to prepare image.')
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close()
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Unable to prepare image.')),'image/webp',.9))
      const path=`${user.id}/banner-${crypto.randomUUID()}.webp`
      const result=await supabase.storage.from('profile-media').upload(path,blob,{contentType:'image/webp',upsert:false})
      if(result.error)throw new Error('Unable to upload banner. Please retry.')
      uploaded=path
      const current=await supabase.auth.getUser()
      if(current.error||current.data.user?.id!==user.id)throw new Error('Your account changed. Sign in again.')
      const saved=await supabase.auth.updateUser({data:{banner_url:supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl}})
      if(saved.error)throw new Error('Unable to save banner. Please retry.')
      uploaded=undefined
      const prefix=supabase.storage.from('profile-media').getPublicUrl(`${user.id}/`).data.publicUrl
      const previous=current.data.user.user_metadata.banner_url
      if(typeof previous==='string'&&previous.startsWith(prefix+'banner-'))await supabase.storage.from('profile-media').remove([`${user.id}/${previous.slice(prefix.length)}`])
    }catch(e){if(uploaded)await supabase.storage.from('profile-media').remove([uploaded]);setError(e instanceof Error?e.message:'Unable to upload image.')}
    finally{setBusy(false)}
  }
  return <Box component="header" data-home-profile sx={{width:'100%',pb:1}}>
    <Box component="img" data-profile-banner src={banner} alt="Profile banner" sx={{display:'block',width:'100%',height:{xs:'clamp(190px, 40vw, 300px)',md:'clamp(300px, 29vw, 460px)'},objectFit:'cover',objectPosition:'50% 45%'}}/>
    <Box data-profile-card sx={{position:'relative',zIndex:1,width:'calc(100% - 32px)',maxWidth:1152,mx:'auto',mt:{xs:-5,md:-8},p:{xs:2.5,md:4},boxSizing:'border-box',display:'grid',gridTemplateColumns:{xs:'1fr',sm:'112px minmax(0,1fr)'},columnGap:3,rowGap:2,alignItems:'center',borderRadius:'20px',bgcolor:'var(--awm-white)',border:'1px solid color-mix(in srgb,var(--awm-gold) 20%,transparent)',boxShadow:'0 8px 30px rgba(44,26,14,.08)'}}>
      <Avatar src={user.user_metadata.avatar_url} alt={name} sx={{gridRow:{sm:'1 / 3'},alignSelf:'start',width:{xs:88,md:112},height:{xs:88,md:112},boxShadow:'0 3px 12px rgba(0,0,0,.12)',border:'4px solid var(--awm-white)','& img':thumbnailCropCss(user.user_metadata.avatar_crop)}}>{name[0]}</Avatar>
      <Box sx={{display:'flex',gap:1,alignItems:'center',flexWrap:'wrap',minWidth:0,'& .MuiChip-root':{height:30,fontSize:12,bgcolor:'var(--awm-cream)',border:'1px solid color-mix(in srgb,var(--awm-gold) 20%,transparent)'},'& .MuiChip-icon':{fontSize:18,color:'var(--awm-gold)'}}}>
        <Typography component="h1" sx={{fontFamily:'var(--font-heading)',fontSize:{xs:28,md:36},fontWeight:600,lineHeight:1.15,mr:1,overflowWrap:'anywhere',width:{xs:'100%',sm:'auto'}}}>{name}</Typography>
        {profile&&<Chip aria-label={`Streak ${profile.summary.streak}`} icon={<LocalFireDepartmentRounded/>} label={profile.summary.streak}/>}
        {profile&&<Chip icon={profile.premium?<DiamondOutlined/>:undefined} label={profile.premium?'AWM Plus':'User'}/>}
        <Button onClick={()=>setOpen(true)} sx={{ml:{xs:0,sm:'auto'},textTransform:'none',minHeight:36,fontSize:12,px:1.5,borderRadius:'999px',border:'1px solid color-mix(in srgb,var(--awm-gold) 30%,transparent)'}}>Edit Profile</Button>
      </Box>
    </Box>
    <Dialog open={open} onClose={()=>{if(!busy)setOpen(false)}} fullWidth maxWidth="xs"><DialogTitle>Edit Profile</DialogTitle><DialogContent>
      <ProfileAvatar id={user.id} name={name} src={user.user_metadata.avatar_url??null} crop={user.user_metadata.avatar_crop} editable/>
      <Button component="label" disabled={busy} sx={{my:2}}>{busy?'Uploading…':'Change banner'}<input hidden type="file" aria-label="Choose a banner" accept="image/jpeg,image/png,image/webp" onChange={event=>{void upload(event.target.files?.[0]);event.target.value=''}}/></Button>
      {error&&<Alert severity="error">{error}</Alert>}<Button disabled={busy} onClick={()=>setOpen(false)}>Done</Button>
    </DialogContent></Dialog>
  </Box>
}
