'use client'
import {Box,Button,Container,Typography} from '@mui/material'
export default function ExploreError(){return <Container sx={{pt:14,pb:12}}><Box role="alert"><Typography variant="h4">Explore / For You couldn’t load</Typography><Typography>Please try again.</Typography><Button variant="contained" onClick={()=>window.location.reload()} sx={{mt:2}}>Retry</Button></Box></Container>}
