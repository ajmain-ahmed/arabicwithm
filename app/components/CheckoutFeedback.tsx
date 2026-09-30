'use client'

import { Suspense, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Alert, Snackbar } from '@mui/material'

const MESSAGES = {
  success: { severity: 'success' as const, text: 'Welcome to AWM+! Your subscription is active — it may take a moment to appear everywhere.' },
  cancelled: { severity: 'info' as const, text: 'Checkout cancelled — you can upgrade to AWM+ anytime.' },
}

function CheckoutFeedbackInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [dismissed, setDismissed] = useState(false)
  const result = searchParams.get('checkout')
  const message = result === 'success' ? MESSAGES.success : result === 'cancelled' ? MESSAGES.cancelled : null
  if (!message) return null
  const close = () => {
    setDismissed(true)
    router.replace(pathname)
  }
  return (
    <Snackbar open={!dismissed} autoHideDuration={6000} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert onClose={close} severity={message.severity} variant="filled" sx={{ width: '100%', fontFamily: 'Jost, sans-serif' }}>
        {message.text}
      </Alert>
    </Snackbar>
  )
}

export default function CheckoutFeedback() {
  return (
    <Suspense fallback={null}>
      <CheckoutFeedbackInner />
    </Suspense>
  )
}
