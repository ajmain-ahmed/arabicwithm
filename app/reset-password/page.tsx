'use client'

import { ArrowForward, Visibility, VisibilityOff } from '@mui/icons-material'
import { Alert, Box, Button, IconButton, TextField, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '../lib/supabase/client'

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cookie&family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600&display=swap');
  :root {
    --cream: #faf7f2; --bark: #2c1a0e; --forest: #0e2e1f;
    --gold: #b8860b; --gold-lt: #d4a843; --muted: #7a6e65;
  }
  .rp-input .MuiFilledInput-root {
    background: rgba(44,26,14,0.04); border-radius: 2px;
    font-family: 'Jost', sans-serif;
  }
  .rp-input .MuiFilledInput-root:hover { background: rgba(44,26,14,0.07); }
  .rp-input .MuiFilledInput-root:before,
  .rp-input .MuiFilledInput-root:after { display: none; }
  .rp-input .MuiInputLabel-root { font-family: 'Jost', sans-serif; font-size: 0.9rem; }
`

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleReset = async () => {
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setMessage({ type: 'success', text: 'Password updated! Redirecting…' })
    setTimeout(() => router.push('/'), 2000)
  }

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream)',
        px: 2,
      }}>
        <Box sx={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          border: '1px solid rgba(184,134,11,0.18)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(44,26,14,0.1)',
        }}>
          {/* Header */}
          <Box sx={{ px: 4, pt: 4, pb: 3, borderBottom: '1px solid rgba(184,134,11,0.12)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Box component="img" src="/homepage/arabicwithm-notext.png" alt="ArabicWithM"
                sx={{ height: 26, width: 'auto', objectFit: 'contain' }} />
              <Typography sx={{
                fontFamily: '"Cookie", cursive', fontSize: '1.6rem', fontWeight: 500,
                background: 'linear-gradient(135deg, var(--bark) 0%, var(--forest) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1, mt: '0.15em',
              }}>
                ArabicWithM
              </Typography>
            </Box>
            <Typography sx={{
              fontFamily: '"EB Garamond", serif', fontSize: '1.75rem',
              fontWeight: 700, color: 'var(--bark)', lineHeight: 1.15, mb: 0.5,
            }}>
              Set New Password
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', color: 'var(--muted)' }}>
              Choose a strong password for your account.
            </Typography>
          </Box>

          {/* Body */}
          <Box sx={{ px: 4, py: 3.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {message && (
              <Alert severity={message.type} sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', borderRadius: '2px' }}>
                {message.text}
              </Alert>
            )}

            <TextField
              className="rp-input"
              label="New password"
              type={showPw ? 'text' : 'password'}
              variant="filled"
              size="small"
              fullWidth
              value={password}
              disabled={loading}
              onChange={e => setPassword(e.target.value)}
              slotProps={{
                input: {
                  disableUnderline: true,
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShowPw(p => !p)} sx={{ color: 'var(--muted)', mr: -0.5 }}>
                      {showPw ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  ),
                },
              }}
            />

            <TextField
              className="rp-input"
              label="Confirm new password"
              type={showPw ? 'text' : 'password'}
              variant="filled"
              size="small"
              fullWidth
              value={confirm}
              disabled={loading}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReset() }}
              slotProps={{
                input: {
                  disableUnderline: true,
                },
              }}
            />

            <Button
              onClick={handleReset}
              variant="contained"
              fullWidth
              disabled={loading}
              endIcon={<ArrowForward />}
              sx={{
                background: 'linear-gradient(135deg, #b8860b, #d4a843)',
                color: 'var(--forest)',
                fontFamily: 'Jost, sans-serif',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'none',
                borderRadius: '2px',
                py: 1.3,
                boxShadow: '0 4px 16px rgba(184,134,11,0.25)',
                '&:hover': { background: 'linear-gradient(135deg, #d4a843, #b8860b)' },
                '&:disabled': { background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.3)', boxShadow: 'none' },
              }}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  )
}