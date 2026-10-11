'use client'
import {Box,Button,Container,Typography} from '@mui/material'
export default function ExploreError({reset}:{reset:()=>void}){return <Container sx={{pt:14,pb:12}}><Box role="alert"><Typography variant="h4">Explore is temporarily unavailable</Typography><Typography>Please try again when the connection is restored.</Typography><Button variant="contained" onClick={reset} sx={{mt:2}}>Try again</Button></Box></Container>}
