'use client'
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { AutoStories, Download, PsychologyOutlined } from '@mui/icons-material'
import { fetchPremiumStatus, managePremium, startPremiumCheckout } from '@/app/actions/premium'
import { useAuth } from '@/app/AuthContext'
import { PREMIUM } from '@/app/lib/entitlements'

export default function PremiumPrompt({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { user } = useAuth()
  const [premium, setPremium] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) fetchPremiumStatus().then(s => setPremium(s.premium)).catch(() => setError('Unable to check Premium status. Please try again.')) }, [open, user?.id])
  async function purchase() {
    if (!user) { onClose(); window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } })); return }
    setBusy(true); setError('')
    try { window.location.assign(await (premium ? managePremium() : startPremiumCheckout())) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to open billing.'); setBusy(false) }
  }
  return <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="premium-title" slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: '16px', m: 2, width: 'calc(100% - 32px)' } } }}>
    <DialogTitle id="premium-title">{premium ? 'Premium active' : 'Premium'} <Typography component="span" sx={{ color: 'text.secondary' }}>£3.99 GBP / month</Typography></DialogTitle>
    <DialogContent>
      {reason && <Typography sx={{ mb: 2 }}>{reason}</Typography>}
      {[
        { icon: AutoStories, title: 'Finish longer books', text: 'The first five chapters of eligible longer books are free. Premium unlocks Chapter 6 onwards. Our four original exempt books remain free to read in full.' },
        { icon: Download, title: 'Download PDFs', text: 'Take available Arabic and English book PDFs with you.' },
        { icon: PsychologyOutlined, title: 'Unlimited Memory practice', text: 'Free accounts can complete 20 cards each day. Premium has no daily limit. Random sessions stay at 20 cards, with the same XP per card for everyone.' },
      ].map(item => <Box key={item.title} sx={{ display: 'flex', gap: 2, py: 1.5 }}><item.icon sx={{ color: 'primary.main', mt: .5 }} /><Box><Typography sx={{ fontWeight: 700 }}>{item.title}</Typography><Typography color="text.secondary">{item.text}</Typography></Box></Box>)}
      <Typography sx={{ mt: 2 }} color="text.secondary">And this is only the beginning. More Premium features, books and learning content will be added over time.</Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>£3.99 GBP, billed monthly as a recurring subscription. Cancel through Manage Premium; access continues until the end of your paid period.</Typography>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}><Button onClick={onClose}>Close</Button><Button variant="contained" disabled={busy} onClick={() => void purchase()}>{premium ? 'Manage Premium' : `Get Premium — ${PREMIUM.label}`}</Button></DialogActions>
  </Dialog>
}
export function PremiumSection() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [premium, setPremium] = useState(false)
  useEffect(() => { let active = true; fetchPremiumStatus().then(s => { if (active) setPremium(s.premium) }).catch(() => {}); return () => { active = false } }, [user?.id])
  return <Box component="section" sx={{ width: '100%', p: { xs: 3, md: 6 }, mt: 5, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
    <Typography variant="h2">{premium ? 'Premium active' : 'Premium'}</Typography><Typography sx={{ mt: 1, fontWeight: 700 }}>{PREMIUM.label}</Typography>
    <Typography sx={{ my: 2 }}>Unlock the full reading experience, downloadable books and unlimited Memory practice.</Typography>
    <Button variant="contained" onClick={() => setOpen(true)}>{premium ? 'Manage Premium' : 'See Premium'}</Button>
    <PremiumPrompt open={open} onClose={() => setOpen(false)} />
  </Box>
}
export function LockedChapter({ bookSlug, chapterTitle }: { bookSlug: string; chapterTitle: string }) {
  const [open, setOpen] = useState(true)
  return <Box component="main" sx={{ p: { xs: 3, md: 6 }, minHeight: '60vh' }}><Typography variant="h2">{chapterTitle}</Typography><Typography sx={{ my: 2 }}>Continue reading with Premium. Your reading progress is saved.</Typography><Button href={`/books/${bookSlug}`}>Back to chapters</Button><Button onClick={() => setOpen(true)}>Upgrade to Premium</Button><PremiumPrompt open={open} onClose={() => setOpen(false)} reason="You've reached the end of the free chapters. Upgrade to Premium to continue reading this book." /></Box>
}
