'use client'

import { useState } from 'react'
import { FavoriteRounded, LockRounded } from '@mui/icons-material'
import { Alert, Box, Button, InputAdornment, TextField, Typography } from '@mui/material'
import { startSupportCheckout } from '@/app/actions/support'
import { formatSupportAmount, parseSupportAmountToPence, SUPPORT_PRESET_PENCE } from '@/app/lib/supportAmount'

export default function SupportForm() {
  const [selected, setSelected] = useState<number | null>(1000)
  const [customAmount, setCustomAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const amountPence = customAmount.trim() ? parseSupportAmountToPence(customAmount) : selected

  const continueToCheckout = async () => {
    if (!amountPence) {
      setError('Enter a positive amount with no more than two decimal places.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const result = await startSupportCheckout(amountPence)
      if (!result.ok) {
        setError(result.error)
        setSubmitting(false)
        return
      }
      window.location.assign(result.url)
    } catch (checkoutError) {
      console.error('[support] Checkout action failed', checkoutError)
      setError('Secure checkout is temporarily unavailable. Please try again later.')
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Typography component="h2" sx={{ color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 27, sm: 32 }, fontWeight: 600 }}>
        Choose an amount
      </Typography>
      <Box role="group" aria-label="Suggested contribution amounts" sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
        {SUPPORT_PRESET_PENCE.map((amount) => {
          const active = selected === amount && !customAmount.trim()
          return (
            <Button
              key={amount}
              type="button"
              aria-pressed={active}
              onClick={() => { setSelected(amount); setCustomAmount(''); setError('') }}
              variant={active ? 'contained' : 'outlined'}
              sx={{ minHeight: 54, borderRadius: '12px', borderColor: 'color-mix(in srgb, var(--awm-gold) 52%, transparent)', bgcolor: active ? 'var(--awm-gold)' : 'transparent', color: active ? '#fff' : 'var(--awm-bark)', fontSize: 17, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: active ? '#946c08' : 'color-mix(in srgb, var(--awm-gold) 8%, transparent)', borderColor: 'var(--awm-gold)' } }}
            >
              {formatSupportAmount(amount)}
            </Button>
          )
        })}
      </Box>

      <TextField
        label="Custom amount"
        value={customAmount}
        onChange={(event) => { setCustomAmount(event.target.value); setError('') }}
        type="number"
        fullWidth
        slotProps={{
          htmlInput: { min: 0.01, max: 999999.99, step: 0.01, inputMode: 'decimal' },
          input: { startAdornment: <InputAdornment position="start">£</InputAdornment> },
        }}
        sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'var(--awm-white)' } }}
        helperText="Enter any positive amount in GBP."
      />

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Button
        type="button"
        onClick={continueToCheckout}
        disabled={submitting}
        fullWidth
        variant="contained"
        startIcon={<FavoriteRounded />}
        sx={{ mt: 2.5, minHeight: 56, borderRadius: '12px', bgcolor: '#0e2e1f', color: '#fff', fontWeight: 700, fontSize: 16, textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}
      >
        {submitting ? 'Opening secure checkout…' : `Support Arabic with M${amountPence ? ` — ${formatSupportAmount(amountPence)}` : ''}`}
      </Button>
      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, color: 'var(--awm-muted)' }}>
        <LockRounded aria-hidden="true" sx={{ fontSize: 15 }} />
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: 12 }}>Secure one-time payment processed by Stripe</Typography>
      </Box>
    </Box>
  )
}
