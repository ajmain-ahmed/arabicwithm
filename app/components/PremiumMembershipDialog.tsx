'use client'
import {Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,IconButton,Typography} from '@mui/material'
import {CheckCircleRounded,Close} from '@mui/icons-material'
import {useRouter} from 'next/navigation'
import {PREMIUM_BENEFITS} from '@/app/lib/entitlements'
import {profileRoute} from '@/app/lib/navigation'

export default function PremiumMembershipDialog({onClose,userId,includedAccess,onProfileNavigate}:{onClose:()=>void;userId:string;includedAccess:boolean;onProfileNavigate?:()=>void}){
 const router=useRouter()
 return <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="membership-title" slotProps={{paper:{sx:{bgcolor:'background.paper',borderRadius:'24px',m:2,width:'calc(100% - 32px)',border:'1px solid',borderColor:'divider'}}}}>
  <DialogTitle id="membership-title" sx={{pr:6,fontSize:26}}>AWM Plus</DialogTitle>
  <IconButton aria-label="Close AWM Plus" onClick={onClose} sx={{position:'absolute',right:8,top:8}}><Close/></IconButton>
  <DialogContent>
   <Typography sx={{fontWeight:700,mb:2}}>{includedAccess?'Your AWM Plus access is active.':'Your AWM Plus membership is active.'}</Typography>
   {includedAccess&&<Typography color="text.secondary" sx={{mb:2}}>AWM Plus is included with your account access.</Typography>}
   <Box component="ul" sx={{m:0,p:0,listStyle:'none',display:'grid',gap:1}}>
    {PREMIUM_BENEFITS.filter(benefit=>!benefit.appOnly).map(benefit=><Box component="li" key={benefit.id} sx={{display:'flex',alignItems:'center',gap:1.1,p:1.25,borderRadius:'10px',bgcolor:'background.default'}}>
     <CheckCircleRounded aria-hidden="true" sx={{flexShrink:0,color:'primary.main',fontSize:21}}/>
     <Typography sx={{minWidth:0,fontWeight:600}}>{benefit.label}</Typography>
    </Box>)}
   </Box>
  </DialogContent>
  <DialogActions sx={{px:3,pb:3}}><Button fullWidth variant="contained" sx={{minHeight:48,borderRadius:'12px'}} onClick={()=>{onClose();onProfileNavigate?.();router.push(profileRoute(userId))}}>Go to Profile</Button></DialogActions>
 </Dialog>
}
