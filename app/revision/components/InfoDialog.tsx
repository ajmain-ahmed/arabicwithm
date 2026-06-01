'use client'

import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'
import { type Queue, QUEUE_CONFIG } from '../types'

export default function InfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open} onClose={onClose} slotProps={{
            paper: { sx: { borderRadius: '20px', width: '100%', maxWidth: 420, m: 2, overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.18)' } },
        }}>
            <DialogTitle sx={{
                fontFamily: "'EB Garamond', serif", fontSize: '1.6rem', fontWeight: 700,
                color: '#2c1a0e', pt: 3, px: 3, pb: 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                How House of Cards Works
                <IconButton onClick={onClose} size="small" sx={{ color: '#7a6e65', mr: -0.5 }}>
                    <Close sx={{ fontSize: '1.1rem' }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: '#7a6e65', mb: 2.5, lineHeight: 1.6 }}>
                    This page uses <strong style={{ color: '#2c1a0e' }}>spaced repetition</strong> — a method that shows you cards exactly when your memory is starting to fade, making every review as efficient as possible.
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b8860b', mb: 1.25 }}>
                    The Three Queues
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2.5 }}>
                    {([
                        { queue: 'new' as Queue, icon: '🟦', body: 'Cards you have added to House of Cards but never studied yet. Max 20 per day.' },
                        { queue: 'learning' as Queue, icon: '🟥', body: 'Cards you are currently learning. You must answer them correctly twice in a row before they graduate. If you press Again, the counter resets.' },
                        { queue: 'review' as Queue, icon: '🟩', body: 'Cards you learned in a previous session. Answer correctly and the interval doubles or triples. Fail and the card lapses back to Learning.' },
                    ]).map(({ queue, icon, body }) => {
                        const cfg = QUEUE_CONFIG[queue]
                        return (
                            <Box key={queue} sx={{
                                display: 'flex', gap: 1.5, alignItems: 'flex-start',
                                p: 1.5, borderRadius: '12px',
                                border: `1px solid ${cfg.border}`, background: cfg.activeBg,
                            }}>
                                <Typography sx={{ fontSize: '1.1rem', flexShrink: 0, mt: '1px' }}>{icon}</Typography>
                                <Box>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: cfg.color, mb: 0.25 }}>{cfg.label}</Typography>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.83rem', color: '#5a4e47', lineHeight: 1.55 }}>{body}</Typography>
                                </Box>
                            </Box>
                        )
                    })}
                </Box>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b8860b', mb: 1.25 }}>
                    Rating Buttons
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
                    {([
                        { label: 'Again', color: '#c62828', desc: 'You forgot. The card resets its learning counter and returns within a few cards.' },
                        { label: 'Hard', color: '#e65100', desc: 'You remembered with difficulty. Interval grows slowly.' },
                        { label: 'Good', color: '#2e7d32', desc: 'Normal recall. Interval roughly doubles.' },
                        { label: 'Easy', color: '#1565c0', desc: 'Effortless recall. Interval triples or more.' },
                    ] as { label: string; color: string; desc: string }[]).map(a => (
                        <Box key={a.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                            <Box sx={{ flexShrink: 0, mt: '2px', minWidth: 52, px: 1, py: '2px', borderRadius: '6px', border: `1.5px solid ${a.color}44`, background: `${a.color}0d`, textAlign: 'center' }}>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.78rem', color: a.color }}>{a.label}</Typography>
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.83rem', color: '#5a4e47', lineHeight: 1.55 }}>{a.desc}</Typography>
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <Button fullWidth variant="contained" onClick={onClose} disableElevation sx={{
                    background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif',
                    fontWeight: 600, fontSize: '0.95rem', textTransform: 'none', borderRadius: '10px', py: 1.1,
                    '&:hover': { background: '#1a0f08' },
                }}>Got it</Button>
            </DialogActions>
        </Dialog>
    )
}
