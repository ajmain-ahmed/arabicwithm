'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
import {UiText} from '@/app/components/WebsiteLocaleProvider'

import {Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,Typography} from '@mui/material'
import {CheckCircleRounded} from '@mui/icons-material'
import {useRouter} from 'next/navigation'
import {PREMIUM_BENEFITS} from '@/app/lib/entitlements'
import {formatMembershipDate} from '@/app/lib/display'
import {profileRoute} from '@/app/lib/navigation'

export default function PremiumMembershipDialog({onClose,userId,includedAccess,onProfileNavigate,periodEnd,cancelAtPeriodEnd,paymentIssue}:{onClose:()=>void;userId:string;includedAccess:boolean;onProfileNavigate?:()=>void;periodEnd?:string|null;cancelAtPeriodEnd?:boolean;paymentIssue?:boolean}){
 const {t:awmT}=useWebsiteLocale()

 const {locale}=useWebsiteLocale()

 const router=useRouter()
 const endDate=formatMembershipDate(periodEnd,locale)
 return <Dialog open onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="membership-title" slotProps={{paper:{sx:{bgcolor:'background.paper',borderRadius:'24px',m:2,width:'calc(100% - 32px)',border:'1px solid',borderColor:'divider'}}}}>
  <DialogTitle id="membership-title" sx={{pr:6,fontSize:26}}><UiText>{"AWM Plus"}</UiText></DialogTitle>
  <DialogContent>
   <Typography sx={{fontWeight:700,mb:2}}>{includedAccess?awmT("Your AWM Plus access is active."):awmT("Your AWM Plus membership is active.")}</Typography>
   {includedAccess&&<Typography color="text.secondary" sx={{mb:2}}><UiText>{"AWM Plus is included with your account access."}</UiText></Typography>}
   {paymentIssue&&endDate?(
    /* A renewal payment failed: access survives until the paid period ends
       (grace), but the member must fix payment or entitlement lapses. */
    <Box sx={{display:'flex',alignItems:'center',gap:1,px:1.5,py:1.1,borderRadius:'10px',bgcolor:'rgba(178,34,34,0.06)',border:'1px solid rgba(178,34,34,0.3)',mb:2}}>
     <Typography sx={{fontSize:13,color:'var(--awm-bark)','& strong':{color:'#b22222'}}}><UiText>{"Your last payment didn’t go through. Update your payment method to keep AWM+ after"}</UiText>{' '}<strong>{endDate}</strong>.</Typography>
    </Box>
   ):cancelAtPeriodEnd&&endDate?(
    /* A cancellation is already scheduled — say so plainly, with the exact
       end date, so the state is never ambiguous after Stripe emails. */
    <Box sx={{display:'flex',alignItems:'center',gap:1,px:1.5,py:1.1,borderRadius:'10px',bgcolor:'rgba(184,134,11,0.08)',border:'1px solid rgba(184,134,11,0.25)',mb:2}}>
     <Typography sx={{fontSize:13,color:'var(--awm-bark)','& strong':{color:'var(--awm-gold)'}}}><UiText>{"Cancellation scheduled — you have access until"}</UiText>{' '}<strong>{endDate}</strong><UiText>{". You won’t be charged again."}</UiText></Typography>
    </Box>
   ):endDate?(
    <Typography color="text.secondary" sx={{mb:2,fontSize:13}}><UiText>{"Renews on"}</UiText>{' '}{endDate}.</Typography>
   ):null}
   <Box component="ul" sx={{m:0,p:0,listStyle:'none',display:'grid',gap:1}}>
    {PREMIUM_BENEFITS.map(benefit=><Box component="li" key={benefit.id} sx={{display:'flex',alignItems:'center',gap:1.1,p:1.25,borderRadius:'10px',bgcolor:'background.default'}}>
     <CheckCircleRounded aria-hidden="true" sx={{flexShrink:0,color:'primary.main',fontSize:21}}/>
     <Typography sx={{minWidth:0,fontWeight:600}}>{benefit.label}</Typography>
    </Box>)}
   </Box>
  </DialogContent>
  <DialogActions sx={{px:3,pb:3}}>
   <Button fullWidth variant="contained" sx={{minHeight:48,borderRadius:'12px'}} onClick={()=>{onClose();onProfileNavigate?.();router.push(profileRoute(userId))}}><UiText>{"Go to Profile"}</UiText></Button>
  </DialogActions>
 </Dialog>
}
