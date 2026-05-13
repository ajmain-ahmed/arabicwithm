'use client'

import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Slider } from '@mui/material'
import { Close } from '@mui/icons-material'

export default function SettingsDialog({
    open,
    onClose,
    textScale,
    onTextScaleChange,
    showDiacritics,
    onDiacriticsToggle,
}: {
    open: boolean
    onClose: () => void
    textScale: number
    onTextScaleChange: (v: number) => void
    showDiacritics: boolean
    onDiacriticsToggle: () => void
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px', width: '100%', maxWidth: 360, m: 2, overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.2)' } } }}>
            <DialogTitle sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e', pb: 2, pt: 2.5, px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Settings
                <IconButton onClick={onClose} size="small" sx={{ color: '#7a6e65', mr: -0.5 }}><Close sx={{ fontSize: '1.2rem' }} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 2.5, pt: 1.5, pb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box onClick={onDiacriticsToggle} sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid',
                        borderColor: showDiacritics ? 'rgba(184,134,11,0.33)' : 'rgba(122,110,101,0.15)',
                        background: showDiacritics ? 'rgba(184,134,11,0.08)' : 'rgba(122,110,101,0.03)',
                        transition: 'all 0.15s', userSelect: 'none',
                        '&:hover': { borderColor: 'rgba(184,134,11,0.53)', background: 'rgba(184,134,11,0.05)' },
                    }}>
                        <Box sx={{ pr: 2 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e', lineHeight: 1.2 }}>Show Diacritics</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65', mt: 0.3, lineHeight: 1.4 }}>Display vowel marks on Arabic words</Typography>
                        </Box>
                        <Box sx={{
                            width: 38, height: 22, borderRadius: '999px', flexShrink: 0,
                            background: showDiacritics ? '#b8860b' : 'rgba(122,110,101,0.22)',
                            position: 'relative', transition: 'background 0.2s',
                        }}>
                            <Box sx={{
                                position: 'absolute', top: '3px', left: showDiacritics ? '19px' : '3px',
                                width: 16, height: 16, borderRadius: '50%',
                                background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
                                transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
                            }} />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid rgba(122,110,101,0.15)', background: 'rgba(122,110,101,0.03)', gap: 2 }}>
                        <Box sx={{ pr: 2, flex: '0 0 auto' }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e' }}>Text Size</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65', mt: 0.3 }}>Adjust flashcard content size</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Slider value={textScale} min={1.0} max={1.4} step={0.1} size="small" onChange={(_, v) => onTextScaleChange(v as number)} sx={{ color: '#b8860b', width: '100%', '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5, flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="contained" onClick={onClose} disableElevation sx={{ background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.95rem', textTransform: 'none', borderRadius: '10px', py: 1.1, '&:hover': { background: '#1a0f08' } }}>Done</Button>
            </DialogActions>
        </Dialog>
    )
}
