'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, Button, Container, Typography } from '@mui/material'
import { CheckCircleRounded, Close, InfoOutlined, WarningAmberRounded } from '@mui/icons-material'
import { refreshPremiumStatus } from '@/app/lib/premiumStatusCache'

type NoticeState = 'activating' | 'active' | 'stuck' | 'cancelled'

const POLL_ATTEMPTS = 8
const POLL_INTERVAL_MS = 4000
const ACTIVE_DISMISS_MS = 5000

/* Stripe redirects here after checkout with ?checkout=success|cancelled.
   Entitlement activates when the webhook lands (usually seconds), so success
   says "activating" and polls premium status instead of congratulating before
   access exists. The parameter is consumed immediately so refreshes and
   shared links don't replay the notice. */
export default function CheckoutReturnNotice({ userId }: { userId: string }) {
  const [state, setState] = useState<NoticeState | null>(null)
  const dismissTimer = useRef<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (params.has('checkout')) {
      params.delete('checkout')
      const query = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    }
    if (checkout === 'cancelled') {
      /* Defer to a microtask: reading browser state in the effect and then
         setting state synchronously would trip react-hooks/set-state-in-effect. */
      queueMicrotask(() => setState('cancelled'))
      return
    }
    if (checkout !== 'success') return
    queueMicrotask(() => setState('activating'))
    let cancelled = false
    let attempts = 0
    const poll = () => {
      if (cancelled) return
      attempts += 1
      refreshPremiumStatus(userId)
        .then(status => {
          if (cancelled) return
          if (status.premium || status.admin) {
            setState('active')
            dismissTimer.current = window.setTimeout(() => setState(null), ACTIVE_DISMISS_MS)
          } else if (attempts >= POLL_ATTEMPTS) setState('stuck')
          else window.setTimeout(poll, POLL_INTERVAL_MS)
        })
        .catch(() => {
          if (cancelled) return
          if (attempts >= POLL_ATTEMPTS) setState('stuck')
          else window.setTimeout(poll, POLL_INTERVAL_MS)
        })
    }
    poll()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => () => {
    if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current)
  }, [])

  if (!state) return null
  const copy = {
    activating: {
      Icon: InfoOutlined, color: 'var(--awm-gold)',
      title: 'Payment received',
      body: 'Your AWM+ access is activating — this usually takes under a minute.',
    },
    active: {
      Icon: CheckCircleRounded, color: 'var(--awm-forest)',
      title: 'AWM+ is active',
      body: 'Welcome aboard — every benefit is unlocked.',
    },
    stuck: {
      Icon: WarningAmberRounded, color: '#b3541e',
      title: 'Still confirming your payment',
      body: 'Access is taking longer than expected. Try refreshing in a minute — if AWM+ still hasn’t appeared, email hello@arabicwithm.com.',
    },
    cancelled: {
      Icon: InfoOutlined, color: 'var(--awm-muted)',
      title: 'Checkout cancelled',
      body: 'You haven’t been charged. You can subscribe any time.',
    },
  }[state]
  const { Icon } = copy

  return (
    <Container maxWidth={false} sx={{ mb: { xs: 2, md: 2.5 } }}>
      <Box role="status" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: { xs: 2, md: 2.5 }, py: 1.75, borderRadius: '10px', bgcolor: 'var(--awm-white)', border: '1px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', boxShadow: '0 6px 18px rgba(44,26,14,0.06)' }}>
        <Icon aria-hidden="true" sx={{ mt: 0.2, fontSize: 20, color: copy.color, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--awm-bark)' }}>{copy.title}</Typography>
          <Typography sx={{ mt: 0.25, fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: 'var(--awm-muted)', lineHeight: 1.55 }}>{copy.body}</Typography>
        </Box>
        <Button onClick={() => setState(null)} aria-label="Dismiss notice" sx={{ minWidth: 0, p: 0.5, color: 'var(--awm-muted-light)', '&:hover': { color: 'var(--awm-bark)', bgcolor: 'transparent' } }}>
          <Close sx={{ fontSize: 18 }} />
        </Button>
      </Box>
    </Container>
  )
}
