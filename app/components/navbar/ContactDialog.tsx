'use client'

import { Close, EmailSharp } from '@mui/icons-material'
import { Box, Dialog, IconButton, Typography } from '@mui/material'

interface ContactDialogProps {
    open: boolean
    onClose: () => void
}

export default function ContactDialog({ open, onClose }: ContactDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        background: 'linear-gradient(160deg, var(--awm-forest) 0%, var(--awm-bark-dark) 100%)',
                        borderRadius: 'var(--awm-radius-none)',
                        border: '1px solid color-mix(in srgb, var(--awm-gold-light) 20%, transparent)',
                        overflow: 'hidden',
                    },
                },
            }}
        >
            <Box sx={{ position: 'relative', pt: 4, pb: 4, px: 3.5 }}>
                <IconButton
                    onClick={onClose}
                    size="small"
                    aria-label="Close contact dialog"
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        color: 'color-mix(in srgb, var(--awm-cream) 40%, transparent)',
                        '&:hover': { color: 'var(--awm-gold-light)' },
                    }}
                >
                    <Close sx={{ fontSize: 18 }} />
                </IconButton>
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: 'var(--awm-cream)', lineHeight: 1.1, mb: 1 }}>
                        Get in Touch
                    </Typography>
                    <Box
                        sx={{
                            height: '1px',
                            width: 60,
                            background: 'linear-gradient(90deg, transparent, var(--awm-gold-light), transparent)',
                            mx: 'auto',
                            mb: 1.5,
                        }}
                    />
                    <Typography variant="body2" sx={{ color: 'color-mix(in srgb, var(--awm-cream) 50%, transparent)', lineHeight: 1.7 }}>
                        Have questions about learning Arabic? Reach out anytime.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box
                        component="a"
                        href="mailto:hello@arabicwithm.com"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.8,
                            border: '1px solid color-mix(in srgb, var(--awm-gold-light) 15%, transparent)',
                            borderRadius: 'var(--awm-radius-none)',
                            background: 'color-mix(in srgb, var(--awm-white) 3%, transparent)',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            '&:hover': {
                                background: 'color-mix(in srgb, var(--awm-gold-light) 8%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--awm-gold-light) 35%, transparent)',
                            },
                        }}
                    >
                        <Box
                            sx={{
                                flexShrink: 0,
                                width: 36,
                                height: 36,
                                borderRadius: 'var(--awm-radius-none)',
                                background: 'color-mix(in srgb, var(--awm-gold-light) 10%, transparent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <EmailSharp sx={{ fontSize: 20, color: 'var(--awm-gold-light)' }} />
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--awm-cream)', lineHeight: 1.2 }}>
                                Email Us
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'color-mix(in srgb, var(--awm-cream) 45%, transparent)' }}>
                                hello@arabicwithm.com
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Dialog>
    )
}
