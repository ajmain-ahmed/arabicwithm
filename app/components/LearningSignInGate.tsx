'use client';
import { useState } from 'react';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { useAuth } from '@/app/AuthContext';
import AuthDialog from '@/app/components/AuthDialog';
export default function LearningSignInGate({ activity }: {
    activity: string;
}) {
    const { user, loading } = useAuth();
    const [open, setOpen] = useState(true);
    return <Container sx={{ pt: 16, pb: 'calc(100px + env(safe-area-inset-bottom))', textAlign: 'center' }}>
    <Typography variant="h3">{activity}</Typography>
    {loading || user ? <CircularProgress aria-label={`Loading ${activity}`} sx={{ mt: 3 }}/> : <Box sx={{ mt: 3 }}>
      <Typography>Your personal {activity} activities are protected.</Typography>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mt: 2 }}>Sign In</Button>
    </Box>}
    <AuthDialog open={open && !loading && !user} onClose={() => setOpen(false)} purpose={`Sign in to practise ${activity}`}/>
  </Container>;
}
