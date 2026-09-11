'use client'
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, IconButton } from '@mui/material'
import { AutoStories, Download, PsychologyOutlined, AutoAwesome, Close } from '@mui/icons-material'
import { fetchPremiumStatus, managePremium, startPremiumCheckout } from '@/app/actions/premium'
import { useAuth } from '@/app/AuthContext'
import { PREMIUM } from '@/app/lib/entitlements'
import { useRouter } from 'next/navigation'

export default function PremiumPrompt({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { user } = useAuth()
  const [premium, setPremium] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) fetchPremiumStatus().then(s => setPremium(s.premium)).catch(() => setError('Unable to check AWM+ status. Please try again.')) }, [open, user?.id])
  async function purchase() {
    if (!user) { onClose(); window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } })); return }
    setBusy(true); setError('')
    try { window.location.assign(await (premium ? managePremium() : startPremiumCheckout())) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to open billing.'); setBusy(false) }
  }
  return <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="premium-title" slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: '24px', m: 2, width: 'calc(100% - 32px)', textAlign: 'center', border: '1px solid', borderColor: 'divider' } } }}>
    <IconButton aria-label="Close AWM+ details" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}><Close /></IconButton>
    <DialogTitle id="premium-title" sx={{ pt: 4, pb: 1, fontSize: 32 }}><AutoAwesome sx={{ display: 'block', mx: 'auto', mb: 1, color: 'primary.main', fontSize: 34 }} />{premium ? 'AWM+ active' : 'AWM+'}</DialogTitle>
    <DialogContent sx={{ px: { xs: 2.5, sm: 4 } }}>
      <Typography color="text.secondary">More stories. More practice. Take your learning with you.</Typography>
      <Box sx={{ py: 3 }}><Typography sx={{ fontSize: 48, fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1 }}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(PREMIUM.monthlyPence / 100)}<Typography component="span" sx={{ ml: 1, fontSize: 16, color: 'text.secondary' }}>GBP / month</Typography></Typography></Box>
      {reason && <Typography sx={{ mb: 2 }}>{reason}</Typography>}
      {[
        { icon: AutoStories, title: 'Finish longer books', text: 'Unlimited access to all books.' },
        { icon: Download, title: 'Download PDFs', text: 'Read available PDFs offline.' },
        { icon: PsychologyOutlined, title: 'Unlimited Memory practice', text: 'Practise beyond the free 20-card daily limit.' },
      ].map(item => <Box key={item.title} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 2, mb: 1.5, borderRadius: '14px', bgcolor: 'background.default' }}><item.icon sx={{ color: 'primary.main', mt: .5 }} /><Box><Typography sx={{ fontWeight: 700 }}>{item.title}</Typography><Typography color="text.secondary">{item.text}</Typography></Box></Box>)}
      <Typography sx={{ mt: 2 }} color="text.secondary">New books and features as they arrive.</Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>£3.99 GBP, billed monthly as a recurring subscription. Cancel through Manage AWM+; access continues until the end of your paid period.</Typography>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: { xs: 2.5, sm: 4 }, pb: 3, flexDirection: 'column-reverse', gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 }, width: '100%' }}><Button onClick={onClose}>Close</Button><Button fullWidth sx={{ minHeight: 52, borderRadius: "12px" }} variant="contained" disabled={busy} onClick={() => void purchase()}>{premium ? 'Manage AWM+' : `Get AWM+ — ${PREMIUM.label}`}</Button></DialogActions>
  </Dialog>
}
export function PremiumSection() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [premium, setPremium] = useState(false)
  useEffect(() => { let active = true; fetchPremiumStatus().then(s => { if (active) setPremium(s.premium) }).catch(() => {}); return () => { active = false } }, [user?.id])
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
    }}>{premium ? 'AWM+ active - Manage' : 'Upgrade to AWM+'}</Button>
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
