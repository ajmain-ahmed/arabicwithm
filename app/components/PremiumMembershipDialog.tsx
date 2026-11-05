'use client'
import {Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,IconButton,Typography} from '@mui/material'
import {CheckCircleRounded,Close} from '@mui/icons-material'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {PREMIUM_BENEFITS} from '@/app/lib/entitlements'
import {managePremium} from '@/app/actions/premium'
import {formatMembershipDate} from '@/app/lib/display'
import {profileRoute} from '@/app/lib/navigation'

export default function PremiumMembershipDialog({onClose,userId,includedAccess,onProfileNavigate,periodEnd,cancelAtPeriodEnd}:{onClose:()=>void;userId:string;includedAccess:boolean;onProfileNavigate?:()=>void;periodEnd?:string|null;cancelAtPeriodEnd?:boolean}){
 const router=useRouter()
 const [openingPortal,setOpeningPortal]=useState(false)
 const endDate=formatMembershipDate(periodEnd)
 const openPortal=async()=>{setOpeningPortal(true);try{window.location.assign(await managePremium())}catch{setOpeningPortal(false)}}
 return <Dialog open onClose={openingPortal?undefined:onClose} maxWidth="xs" fullWidth aria-labelledby="membership-title" slotProps={{paper:{sx:{bgcolor:'background.paper',borderRadius:'24px',m:2,width:'calc(100% - 32px)',border:'1px solid',borderColor:'divider'}}}}>
  <DialogTitle id="membership-title" sx={{pr:6,fontSize:26}}>AWM Plus</DialogTitle>
  <IconButton aria-label="Close AWM Plus" onClick={onClose} sx={{position:'absolute',right:8,top:8}}><Close/></IconButton>
  <DialogContent>
   <Typography sx={{fontWeight:700,mb:2}}>{includedAccess?'Your AWM Plus access is active.':'Your AWM Plus membership is active.'}</Typography>
   {includedAccess&&<Typography color="text.secondary" sx={{mb:2}}>AWM Plus is included with your account access.</Typography>}
   {cancelAtPeriodEnd&&endDate?(
    /* A portal cancellation is already scheduled — say so plainly, with the
       exact end date, so the state is never ambiguous after Stripe emails. */
    <Box sx={{display:'flex',alignItems:'center',gap:1,px:1.5,py:1.1,borderRadius:'10px',bgcolor:'rgba(184,134,11,0.08)',border:'1px solid rgba(184,134,11,0.25)',mb:2}}>
     <Typography sx={{fontSize:13,color:'var(--awm-bark)','& strong':{color:'var(--awm-gold)'}}}>Cancellation scheduled — you have access until <strong>{endDate}</strong>. You won&rsquo;t be charged again.</Typography>
    </Box>
   ):endDate?(
    <Typography color="text.secondary" sx={{mb:2,fontSize:13}}>Renews on {endDate}.</Typography>
   ):null}
   <Box component="ul" sx={{m:0,p:0,listStyle:'none',display:'grid',gap:1}}>
    {PREMIUM_BENEFITS.map(benefit=><Box component="li" key={benefit.id} sx={{display:'flex',alignItems:'center',gap:1.1,p:1.25,borderRadius:'10px',bgcolor:'background.default'}}>
     <CheckCircleRounded aria-hidden="true" sx={{flexShrink:0,color:'primary.main',fontSize:21}}/>
     <Typography sx={{minWidth:0,fontWeight:600}}>{benefit.label}</Typography>
    </Box>)}
   </Box>
  </DialogContent>
  <DialogActions sx={{px:3,pb:3,flexDirection:'column',gap:1}}>
   {!includedAccess&&<Button fullWidth variant="outlined" disabled={openingPortal} onClick={()=>void openPortal()} sx={{minHeight:48,borderRadius:'12px',textTransform:'none'}}>{openingPortal?'Opening…':'Manage AWM+'}</Button>}
   <Button fullWidth variant="contained" sx={{minHeight:48,borderRadius:'12px'}} onClick={()=>{onClose();onProfileNavigate?.();router.push(profileRoute(userId))}}>Go to Profile</Button>
  </DialogActions>
 </Dialog>
}
