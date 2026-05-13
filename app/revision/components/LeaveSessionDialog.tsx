'use client'

import { Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'

export default function LeaveSessionDialog({
    open,
    onStay,
    onLeave,
}: {
    open: boolean
    onStay: () => void
    onLeave: () => void
}) {
    return (
        <Dialog
            open={open}
            onClose={onStay}
            slotProps={{
                paper: { sx: { borderRadius: '20px', width: '100%', maxWidth: 420, m: 2, overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.18)' } },
            }}
        >
            <DialogTitle sx={{
                fontFamily: "'EB Garamond', serif", fontSize: '1.6rem', fontWeight: 700,
                color: '#2c1a0e', pt: 3, px: 3, pb: 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                Leave Session?
                <IconButton onClick={onStay} size="small" sx={{ color: '#7a6e65', mr: -0.5 }}>
                    <Close sx={{ fontSize: '1.1rem' }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#7a6e65', lineHeight: 1.6 }}>
                    Are you sure you want to leave your custom revision session? Your progress will not be saved.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.5 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={onLeave}
                    disableElevation
                    sx={{
                        background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif',
                        fontWeight: 600, fontSize: '0.95rem', textTransform: 'none', borderRadius: '10px', py: 1.1,
                        '&:hover': { background: '#1a0f08' },
                    }}
                >
                    Leave
                </Button>
                <Button
                    fullWidth
                    variant="outlined"
                    onClick={onStay}
                    sx={{
                        borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65',
                        fontFamily: 'Jost, sans-serif', fontWeight: 500,
                        textTransform: 'none', borderRadius: '10px', py: 1.1,
                        '&:hover': { borderColor: '#7a6e65', background: 'rgba(122,110,101,0.05)' },
                    }}
                >
                    Stay
                </Button>
            </DialogActions>
        </Dialog>
    )
}
