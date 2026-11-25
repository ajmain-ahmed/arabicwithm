'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import { profileRoute } from '@/app/lib/navigation'

/** A missing server session never silently navigates My Profile to Home. */
export default function ProfileSignIn() {
 const {t:awmT}=useWebsiteLocale()

  const { user, loading } = useAuth()
  const router = useRouter()
  useEffect(() => { if (user) router.replace(profileRoute(user.id)) }, [router, user])
  return <Box sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}>
    {loading || user ? <CircularProgress aria-label={awmT("Loading your profile")} /> : <Box sx={{ textAlign: 'center' }}>
      <Typography component="h1" variant="h4"><UiText>{"My Profile"}</UiText></Typography>
      <Typography sx={{ my: 2 }}><UiText>{"Sign in to view your learning profile."}</UiText></Typography>
      <Button variant="contained" onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))}><UiText>{"Sign in"}</UiText></Button>
    </Box>}
  </Box>
}
