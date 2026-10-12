'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import { profileRoute } from '@/app/lib/navigation'

/** A missing server session never silently navigates My Profile to Home. */
export default function ProfileSignIn() {
  const { user, loading } = useAuth()
  const router = useRouter()
  useEffect(() => { if (user) router.replace(profileRoute(user.id)) }, [router, user])
  return <Box sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}>
    {loading || user ? <CircularProgress aria-label="Loading your profile" /> : <Box sx={{ textAlign: 'center' }}>
      <Typography component="h1" variant="h4">My Profile</Typography>
      <Typography sx={{ my: 2 }}>Sign in to view your learning profile.</Typography>
      <Button variant="contained" onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))}>Sign in</Button>
    </Box>}
  </Box>
}
