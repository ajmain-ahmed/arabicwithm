'use client'
import {UiText} from '@/app/components/WebsiteLocaleProvider'

import { Alert, Box, Button } from '@mui/material'
export default function ProfileError({ reset }: { reset: () => void }) {
  return <Box sx={{ p: 3 }}><Alert severity="error"><UiText>{"Profile could not load. Your account has not changed."}</UiText></Alert><Button onClick={reset}><UiText>{"Retry Profile"}</UiText></Button></Box>
}
