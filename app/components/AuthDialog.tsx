'use client'

import {
  ArrowForward,
  Close,
  Google,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { supabase } from '../lib/supabase/client'

// ─── types ─────────────────────────────────────────────────────────────────
interface AuthDialogProps {
  open: boolean
  onClose: () => void
}

interface FormData {
  email: string
  password: string
}

interface SnackbarMessage {
  severity: 'success' | 'error' | 'info' | 'warning'
  text: string
}

// ─── styles ─────────────────────────────────────────────────────────────────
const DIALOG_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cookie&family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600&display=swap');

  :root {
    --sand:   #f5ede0;
    --cream:  #faf7f2;
    --bark:   #2c1a0e;
    --forest: #0e2e1f;
    --gold:   #b8860b;
    --gold-lt:#d4a843;
    --muted:  #7a6e65;
  }

  .auth-input-awm .MuiFilledInput-root {
    background: rgba(44,26,14,0.04);
    border-radius: 2px;
    font-family: 'Jost', sans-serif;
    font-size: 0.9rem;
  }
  .auth-input-awm .MuiFilledInput-root:hover {
    background: rgba(44,26,14,0.07);
  }
  .auth-input-awm .MuiInputLabel-root {
    font-family: 'Jost', sans-serif;
    font-size: 0.9rem;
  }
  .auth-input-awm .MuiFilledInput-root:before,
  .auth-input-awm .MuiFilledInput-root:after {
    display: none;
  }
`

function GoldDivider() {
  return (
    <Box sx={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.35), transparent)',
      width: '100%',
    }} />
  )
}

// ─── component ───────────────────────────────────────────────────────────────
export default function AuthDialog({ open, onClose }: AuthDialogProps) {
  const [authMode, setAuthMode] = useState<'register' | 'signin'>('signin')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null)

  const showSnackbar = (severity: SnackbarMessage['severity'], text: string) =>
    setSnackbar({ severity, text })

  const resetAndClose = (severity: SnackbarMessage['severity'], message: string) => {
    setLoading(false)
    setFormData({ email: '', password: '' })
    setForgotPassword(false)
    onClose()
    showSnackbar(severity, message)
  }

  const handleSignUp = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })
    if (error) {
      setLoading(false)
      showSnackbar('error', error.message)
      return
    }
    if (data) resetAndClose('success', 'Check your inbox — a verification email is on its way.')
  }

  const handleSignIn = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })
    if (error) {
      setLoading(false)
      showSnackbar('error', error.message)
      return
    }
    if (data) resetAndClose('success', 'Signed in successfully. Welcome back!')
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setLoading(false)
      showSnackbar('error', error.message)
      return
    }
    resetAndClose('success', 'Password reset link sent — check your inbox.')
  }

  // Add this to your existing useState declarations (around line 40)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Update the handleGoogleSignIn function (around line 127)
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        showSnackbar('error', error.message)
        setGoogleLoading(false)
      }
      // Note: On success, page redirects, so no need to setLoading(false)
    } catch {
      showSnackbar('error', 'Failed to sign in with Google')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!formData.email) { showSnackbar('warning', 'Please enter your email.'); return }
    if (!forgotPassword && !formData.password) { showSnackbar('warning', 'Please enter your password.'); return }
    if (forgotPassword) handleForgotPassword()
    else if (authMode === 'register') handleSignUp()
    else handleSignIn()
  }

  const handleClose = () => {
    setFormData({ email: '', password: '' })
    setForgotPassword(false)
    onClose()
  }

  const title = forgotPassword
    ? 'Reset Password'
    : authMode === 'register'
      ? 'Create Account'
      : 'Welcome Back'

  const subtitle = forgotPassword
    ? "Enter your email and we'll send a reset link."
    : authMode === 'register'
      ? 'Join ArabicWithM and start your learning journey.'
      : 'Sign in to continue your Arabic studies.'

  const ctaLabel = forgotPassword
    ? 'Send Reset Link'
    : authMode === 'register'
      ? 'Create Account'
      : 'Sign In'

  return (
    <>
      <style>{DIALOG_CSS}</style>

      {/* ── Snackbar ── */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity}
          variant="filled"
          sx={{ width: '100%', fontFamily: 'Jost, sans-serif' }}
        >
          {snackbar?.text}
        </Alert>
      </Snackbar>

      {/* ── Dialog ── */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              background: 'var(--cream)',
              border: '1px solid rgba(184,134,11,0.18)',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(44,26,14,0.18)',
            },
          },
        }}
      >
        {/* ── Header ── */}
        <Box sx={{ px: 4, pt: 4, pb: 2.5, position: 'relative', background: '#ffffff' }}>
          <IconButton
            onClick={handleClose}
            size="small"
            aria-label="Close"
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              color: 'var(--muted)',
              '&:hover': { color: 'var(--bark)', background: 'rgba(44,26,14,0.05)' },
            }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>

          <Typography sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--bark)',
            lineHeight: 1.15,
            mb: 0.5,
          }}>
            {title}
          </Typography>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.82rem',
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}>
            {subtitle}
          </Typography>
        </Box>

        <GoldDivider />

        {/* ── Body ── */}
        <DialogContent sx={{ px: 4, pt: 3, pb: 4 }}>

          {/* Mode toggle (only when not in forgot-password flow) */}
          {!forgotPassword && (
            <ToggleButtonGroup
              value={authMode}
              exclusive
              onChange={(_e, v) => { if (v) setAuthMode(v) }}
              fullWidth
              size="small"
              sx={{
                mb: 3,
                '& .MuiToggleButton-root': {
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.82rem',
                  letterSpacing: '0.06em',
                  textTransform: 'none',
                  borderColor: 'rgba(184,134,11,0.25)',
                  color: 'var(--muted)',
                  borderRadius: '2px !important',
                  py: 1,
                  '&.Mui-selected': {
                    background: 'var(--forest)',
                    color: 'var(--gold-lt)',
                    borderColor: 'var(--forest)',
                    '&:hover': { background: 'var(--forest)' },
                  },
                  '&:hover': { background: 'rgba(14,46,31,0.05)' },
                },
              }}
            >
              <ToggleButton value="signin">Sign In</ToggleButton>
              <ToggleButton value="register">Register</ToggleButton>
            </ToggleButtonGroup>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Email */}
            <TextField
              className="auth-input-awm"
              disabled={loading}
              label="Email address"
              type="email"
              variant="filled"
              size="small"
              fullWidth
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              slotProps={{ input: { disableUnderline: true } }}
            />

            {/* Password (hidden in forgot-password mode) */}
            {!forgotPassword && (
              <TextField
                className="auth-input-awm"
                disabled={loading}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="filled"
                size="small"
                fullWidth
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                slotProps={{
                  input: {
                    disableUnderline: true,
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(p => !p)}
                        sx={{ color: 'var(--muted)', mr: -0.5 }}
                      >
                        {showPassword
                          ? <VisibilityOff sx={{ fontSize: 18 }} />
                          : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    ),
                  },
                }}
              />
            )}

            {/* CTA */}
            <Button
              onClick={handleSubmit}
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
                '&:hover': { background: 'linear-gradient(135deg, #d4a843, #b8860b)', boxShadow: '0 6px 20px rgba(184,134,11,0.35)' },
                '&:disabled': { background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.3)', boxShadow: 'none' },
              }}
            >
              {loading ? 'Please wait…' : ctaLabel}
            </Button>

            {/* Forgot password link */}
            {!forgotPassword && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  component="span"
                  onClick={() => setForgotPassword(true)}
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--gold)',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Forgot password?
                </Typography>
              </Box>
            )}

            {/* Back to sign in */}
            {forgotPassword && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  component="span"
                  onClick={() => setForgotPassword(false)}
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--gold)',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  ← Back to sign in
                </Typography>
              </Box>
            )}

            {/* Divider + Google (only in sign-in/register flow) */}
            {!forgotPassword && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 0.5 }}>
                  <Box sx={{ flex: 1, height: '1px', background: 'rgba(44,26,14,0.1)' }} />
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    or
                  </Typography>
                  <Box sx={{ flex: 1, height: '1px', background: 'rgba(44,26,14,0.1)' }} />
                </Box>

                <Button
                  loading={googleLoading}  // ← Add this prop
                  loadingPosition="start"   // ← Optional: keeps icon in place while loading
                  disabled={loading || googleLoading}  // ← Disable while any auth is in progres
                  onClick={handleGoogleSignIn}
                  variant="outlined"
                  fullWidth
                  startIcon={<Google sx={{ fontSize: 18 }} />}
                  sx={{
                    borderColor: 'rgba(44,26,14,0.15)',
                    color: 'var(--bark)',
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 400,
                    fontSize: '0.88rem',
                    textTransform: 'none',
                    borderRadius: '2px',
                    py: 1.1,
                    '&:hover': {
                      borderColor: 'rgba(44,26,14,0.3)',
                      background: 'rgba(44,26,14,0.03)',
                    },
                  }}
                >
                  Continue with Google
                </Button>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}