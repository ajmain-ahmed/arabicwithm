'use client'
import { Box, Button, Typography } from '@mui/material'
export default function SignInRequired({ title = 'Sign in to view your profile' }: { title?: string }) {
  return <Box sx={{ p: { xs: 3, md: 6 }, minHeight: '50vh' }}><Typography variant="h2">{title}</Typography><Button variant="contained" sx={{ mt: 2 }} onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))}>Sign in</Button></Box>
}
