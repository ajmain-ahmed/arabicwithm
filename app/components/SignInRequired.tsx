'use client'
import { useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import AuthDialog from '@/app/components/AuthDialog'

/* Gate for direct navigation to a signed-in-only route: show the wall AND
   open the auth dialog immediately, so the sign-in path is one click. */
export default function SignInRequired({ title = 'Sign in to view your profile' }: { title?: string }) {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(true)
  return <Box sx={{ p: { xs: 3, md: 6 }, minHeight: '50vh' }}>
    <Typography variant="h2">{title}</Typography>
    <Button variant="contained" sx={{ mt: 2 }} onClick={() => setOpen(true)}>Sign in</Button>
    <AuthDialog open={open && !loading && !user} onClose={() => setOpen(false)} purpose={title} />
  </Box>
}
