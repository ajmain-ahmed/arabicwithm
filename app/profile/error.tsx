'use client'
import { Alert, Box, Button } from '@mui/material'
export default function ProfileError({ reset }: { reset: () => void }) {
  return <Box sx={{ p: 3 }}><Alert severity="error">Profile could not load. Your account has not changed.</Alert><Button onClick={reset}>Retry Profile</Button></Box>
}
