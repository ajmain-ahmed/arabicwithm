'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { Close } from '@mui/icons-material'
import { Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import SupportForm from '@/app/support/SupportForm'

export default function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
 const {t:awmT}=useWebsiteLocale()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: '12px', bgcolor: 'var(--awm-white)', backgroundImage: 'none' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--awm-bark)', pb: 0 }}>
        <UiText>{"Support the Project"}</UiText><IconButton onClick={onClose} aria-label={awmT("Close support")} sx={{ color: 'var(--awm-muted)' }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2, fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.85rem', color: 'var(--awm-muted)', lineHeight: 1.6 }}>
          <UiText>{"Contributions help fund content production, hosting and the learning tools behind Arabic with M. Support is entirely optional."}</UiText></Typography>
        <SupportForm />
      </DialogContent>
    </Dialog>
  )
}
