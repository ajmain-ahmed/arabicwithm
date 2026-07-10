'use client'

import { useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { supabase } from '@/app/lib/supabase/client'
import { SectionLabel, SectionTitle } from './SectionTitle'

export default function SettingsSection({ userEmail }: { userEmail: string }) {
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

    const handleResetLink = async () => {
        setStatus('sending')
        const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        setStatus(error ? 'error' : 'sent')
    }

    return (
        <Box>
            <SectionLabel>Preferences</SectionLabel>
            <SectionTitle>Settings</SectionTitle>
            <Box
                sx={{
                    background: 'var(--awm-white)',
                    border: '1px solid color-mix(in srgb, var(--awm-gold) 18%, transparent)',
                    borderRadius: 'var(--awm-radius-xs)',
                    p: { xs: 2, sm: 3 },
                }}
            >
                <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--awm-bark)', mb: 0.5 }}>
                    Password
                </Typography>
                <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--awm-muted)', mb: 2.5, lineHeight: 1.6 }}>
                    We&apos;ll send a secure reset link to{' '}
                    <Box component="span" sx={{ color: 'var(--awm-bark)', fontWeight: 500 }}>
                        {userEmail}
                    </Box>
                </Typography>
                {status === 'sent' ? (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1.4,
                            background: 'color-mix(in srgb, var(--awm-forest) 6%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--awm-forest) 20%, transparent)',
                            borderRadius: 'var(--awm-radius-none)',
                        }}
                    >
                        <Box sx={{ fontSize: 16, color: 'var(--awm-forest)', flexShrink: 0 }}>✓</Box>
                        <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--awm-forest)' }}>
                            Reset link sent — check your inbox.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                            onClick={handleResetLink}
                            disabled={status === 'sending'}
                            variant="contained"
                            sx={{
                                alignSelf: 'flex-start',
                                background: 'linear-gradient(135deg, var(--awm-gold), var(--awm-gold-light))',
                                color: 'var(--awm-forest)',
                                fontFamily: 'var(--font-sans)',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 'var(--awm-radius-none)',
                                px: 3,
                                '&:disabled': {
                                    background: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)',
                                    color: 'color-mix(in srgb, var(--awm-bark) 30%, transparent)',
                                },
                            }}
                        >
                            {status === 'sending' ? 'Sending…' : 'Send Reset Link'}
                        </Button>
                        {status === 'error' && (
                            <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--awm-error)' }}>
                                Something went wrong. Please try again.
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    )
}
