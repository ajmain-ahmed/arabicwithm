'use client'
import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { AutoAwesome, CheckCircleRounded } from '@mui/icons-material'
import { fetchPremiumStatus, managePremium, startPremiumCheckout } from '@/app/actions/premium'
import type { PremiumStatus } from '@/app/actions/premium'
import { useAuth } from '@/app/AuthContext'
import { PREMIUM, PREMIUM_BENEFITS } from '@/app/lib/entitlements'
import { useRouter } from 'next/navigation'
import PremiumMembershipDialog from '@/app/components/PremiumMembershipDialog'

interface PremiumPromptProps { open:boolean; onClose:()=>void; reason?:string; membershipSummary?:boolean; onProfileNavigate?:()=>void }
export default function PremiumPrompt(props:PremiumPromptProps){
  const {user}=useAuth()
  // Re-openings and identity changes must verify current server entitlements.
  return props.open?<PremiumPromptContent key={user?.id??'signed-out'} {...props}/>:null
}
function PremiumPromptContent({ open, onClose, reason, membershipSummary=false,onProfileNavigate }:PremiumPromptProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState<PremiumStatus|null>(null)
  const [attempt,setAttempt]=useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active=true,settled=false
    const fail=()=>{if(active&&!settled){settled=true;setError('Unable to check AWM+ status. Please try again.')}}
    const timer=window.setTimeout(fail,10000)
    void fetchPremiumStatus().then(value=>{
      if(active&&!settled){settled=true;setStatus(value);window.clearTimeout(timer)}
    }).catch(()=>{window.clearTimeout(timer);fail()})
    return()=>{active=false;window.clearTimeout(timer)}
  },[attempt])
  const retry=()=>{setError('');setAttempt(value=>value+1)}
  const premium = status?.premium ?? false
  async function purchase() {
    if (!user) { onClose(); window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } })); return }
    if(premium && !status?.manageable){onClose();return}
    setBusy(true); setError('')
    try { window.location.assign(await (premium ? managePremium() : startPremiumCheckout())) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to open billing.'); setBusy(false) }
  }
  /* Show the shell immediately on click; only the billing state waits for the
     status round trip. Without this the click appears dead until both the
     lazy chunk and fetchPremiumStatus resolve. */
  if(status?.premium&&membershipSummary&&user)return <PremiumMembershipDialog onClose={onClose} userId={user.id} includedAccess={status.admin} onProfileNavigate={onProfileNavigate}/>
  if (status?.admin) return null
  if (!status) return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="premium-title" slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: '24px', m: 2, width: 'calc(100% - 32px)', textAlign: 'center', border: '1px solid', borderColor: 'divider' } } }}>
      <DialogTitle id="premium-title" sx={{ pt: 4, pb: 1, fontSize: 32 }}>AWM Plus</DialogTitle>
      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, minHeight: 100, display: 'grid', placeItems: 'center' }}>
        {error?<Alert severity="error">{error}</Alert>:<CircularProgress aria-label="Checking AWM Plus status" sx={{ color: 'var(--awm-gold)' }} />}
      </DialogContent>
      <DialogActions sx={{px:3,pb:2}}><Button onClick={onClose}>Close</Button>{error&&<Button variant="contained" onClick={retry}>Retry</Button>}</DialogActions>
    </Dialog>
  )
  return <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="premium-title" slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: '24px', m: 2, width: 'calc(100% - 32px)', textAlign: 'center', border: '1px solid', borderColor: 'divider' } } }}>
    <DialogTitle id="premium-title" sx={{ pt: 4, pb: 1, fontSize: 32 }}>{premium ? 'AWM+ active' : 'Upgrade to AWM+'}</DialogTitle>
    <DialogContent sx={{ px: { xs: 2.5, sm: 4 } }}>
      <Typography color="text.secondary">More stories. More practice. Take your learning with you.</Typography>
      {!premium && <Box sx={{ py: 3 }}><Typography sx={{ fontSize: 48, fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1 }}>{PREMIUM.price}<Typography component="span" sx={{ ml: 1, fontSize: 16, color: 'text.secondary' }}>GBP / month</Typography></Typography></Box>}
      {reason && <Typography sx={{ mb: 2 }}>{reason}</Typography>}
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
        {PREMIUM_BENEFITS.map((benefit) => <Box component="li" key={benefit.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.1, px: 1.5, py: 1.25, borderRadius: '10px', bgcolor: 'background.default', textAlign: 'left' }}>
          <CheckCircleRounded aria-hidden="true" sx={{ flex: '0 0 auto', color: 'primary.main', fontSize: 21 }} />
          <Typography sx={{ minWidth: 0, flex: 1, fontWeight: 700 }}>{benefit.label}</Typography>
          {benefit.appOnly && <Box component="span" sx={{ flex: '0 0 auto', px: 0.8, py: 0.35, borderRadius: '9999px', bgcolor: 'color-mix(in srgb, var(--awm-forest) 9%, transparent)', color: 'var(--awm-forest)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>📱 App only</Box>}
        </Box>)}
      </Box>
      <Typography sx={{ mt: 2 }} color="text.secondary">New books and features as they arrive.</Typography>
      {!premium ? <Typography variant="body2" sx={{ mt: 2 }}>{PREMIUM.price} GBP, billed monthly as a recurring subscription. Cancel through Manage AWM+; access continues until the end of your paid period.</Typography> : <Typography variant="body2" sx={{mt:2}}>Your account has AWM+ access.</Typography>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, pb: 3, flexDirection: 'column-reverse', gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 }, width: '100%' }}><Button fullWidth sx={{ minHeight: 52, borderRadius: "12px" }} variant="contained" disabled={busy} onClick={() => void purchase()}>{premium ? status.manageable ? 'Manage AWM+' : 'Continue learning' : `Upgrade to AWM+ — ${PREMIUM.label}`}</Button></DialogActions>
  </Dialog>
}
export function PremiumSection() {
  const { user } = useAuth()
  return <PremiumAccountSection key={user?.id ?? 'signed-out'} />
}
function PremiumAccountSection() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<PremiumStatus | null>(null)
  useEffect(() => { let active = true; const refresh=()=>{void fetchPremiumStatus().then(s => { if (active) setStatus(s) }).catch(() => {})}; refresh(); const timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},60000);window.addEventListener('account-access-changed',refresh); window.addEventListener('focus',refresh); return () => { active = false;window.clearInterval(timer);window.removeEventListener('account-access-changed',refresh);window.removeEventListener('focus',refresh) } }, [user?.id])
  if (!status || status.admin) return null
  const premium = status?.premium ?? false
  return <Box component="section" aria-label="AWM+" sx={{ width: '100%', px: { xs: 2, md: 5 }, py: { xs: 4, md: 6 }, display: 'flex', justifyContent: 'center' }}>
    <Button variant="contained" startIcon={<AutoAwesome />} onClick={() => setOpen(true)} sx={{
      width: '100%', maxWidth: 920, minHeight: { xs: 64, md: 76 }, px: 4, borderRadius: '18px', position: 'relative', overflow: 'hidden',
      color: 'primary.contrastText', background: 'linear-gradient(135deg, var(--awm-gold-light), var(--awm-gold))',
      border: '1px solid color-mix(in srgb, var(--awm-gold-light) 75%, transparent)', fontSize: { xs: 17, md: 20 }, fontWeight: 700,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 10px 28px color-mix(in srgb, var(--awm-gold) 22%, transparent)',
      transition: 'transform .18s ease, box-shadow .18s ease',
      '&::before': { content: '\"\"', position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,.24) 46%, transparent 68%)', transform: 'translateX(-65%)', transition: 'transform .65s ease', pointerEvents: 'none' },
      '&:hover': { background: 'linear-gradient(135deg, var(--awm-gold-light), var(--awm-gold))', transform: 'translateY(-2px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 14px 32px color-mix(in srgb, var(--awm-gold) 30%, transparent)', '&::before': { transform: 'translateX(60%)' } },
      '&:active': { transform: 'translateY(1px)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,.12)' },
      '&:focus-visible': { outline: '3px solid', outlineColor: 'text.primary', outlineOffset: 4 },
      '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&::before': { transition: 'none' }, '&:hover, &:active': { transform: 'none' } },
    }}>{premium ? status.manageable ? 'AWM+ active - Manage' : 'AWM+ active' : 'Upgrade to AWM+'}</Button>
    <PremiumPrompt open={open} onClose={() => setOpen(false)} />
  </Box>

}
export function LockedChapter({ bookSlug, chapterTitle }: { bookSlug: string; chapterTitle: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const close = () => {
    setOpen(false)
    router.replace(`/books/${encodeURIComponent(bookSlug)}`)
  }
  return <Box component="main" sx={{ minHeight: '60vh', bgcolor: 'var(--awm-cream-light)' }}>
    <PremiumPrompt open={open} onClose={close} reason={`${chapterTitle} is available with AWM+.`} />
  </Box>
}
