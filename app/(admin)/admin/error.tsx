'use client'
import { Alert, Box, Button } from '@mui/material'
export default function AdminError({ reset }: { reset: () => void }) { return <Box sx={{ p: 3 }}><Alert severity="error">Admin content could not be loaded. Please retry or sign in again.</Alert><Button onClick={reset}>Try again</Button><Button href="/">Back to website</Button></Box> }
