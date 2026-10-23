'use client'

import { useEffect, useState } from 'react'
import { Alert, Box, Button, TextField, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import { appLaunchPreference, setAppLaunchPreference } from '@/app/actions/appLaunch'

export default function AppLaunchSignup() {
  const { user, loading } = useAuth()
  return loading ? null : <Signup key={user?.id ?? 'guest'} signedIn={Boolean(user)} accountEmail={user?.email} />
}

function Signup({ signedIn, accountEmail }: { signedIn: boolean; accountEmail?: string }) {
  const [email, setEmail] = useState(accountEmail ?? '')
  const [subscribed, setSubscribed] = useState(false), [checking, setChecking] = useState(signedIn)
  const [busy, setBusy] = useState(false), [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  useEffect(() => {
    if (!signedIn) return
    let active = true
    appLaunchPreference().then(value => { if (active) setSubscribed(value) }).catch(() => { if (active) setResult({ ok: false, message: 'Unable to load your preference. Please try again.' }) }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [signedIn])
  async function submit() {
    setBusy(true); setResult(null)
    try {
      const response = await setAppLaunchPreference({ email: signedIn ? undefined : email, consent: signedIn ? !subscribed : true })
      setResult(response)
      if (response.ok) setSubscribed(signedIn ? !subscribed : true)
    } catch { setResult({ ok: false, message: 'We couldn’t save your preference. Please try again.' }) }
    finally { setBusy(false) }
  }
  return <Box sx={{ mt: 2, width: '100%', maxWidth: 460, minWidth: 0, mx: { xs: 'auto', md: 0 }, p: 1.5, boxSizing: 'border-box', overflow: 'hidden', borderRadius: '12px', bgcolor: 'rgba(255,255,255,.06)', textAlign: 'center', color: '#f5ede0' }}>
    <Typography sx={{ mb: 1, fontSize: 14, color: 'inherit' }}>{subscribed ? 'We’ll let you know when the app launches.' : 'Want to know when it’s ready?'}</Typography>
    {signedIn&&<TextField fullWidth label="Email address" type="email" value={accountEmail??''} slotProps={{input:{readOnly:true}}} size="small" sx={{mb:1,bgcolor:'var(--awm-white)',borderRadius:1,'& .MuiInputLabel-root.MuiInputLabel-shrink':{bgcolor:'var(--awm-white)',px:.5}}}/>}
    {signedIn&&<Typography sx={{fontSize:12,color:'inherit',opacity:.75,mb:1.5}}>We will email you when the app launches. No spam.</Typography>}
    {signedIn ? <Button variant="outlined" disabled={busy || checking} onClick={submit} sx={{ color: 'inherit', borderColor: 'var(--awm-gold-light)', minHeight: 44 }}>{checking ? 'Loading preference…' : subscribed ? 'Turn off app-launch emails' : 'Get notified'}</Button>
      : !subscribed && <Box component="form" onSubmit={event => { event.preventDefault(); void submit() }} sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1, pt: .5 }}>
          <TextField fullWidth required type="email" label="Email address" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} size="small" slotProps={{ htmlInput: { maxLength: 254 } }} sx={{ minWidth: 0, bgcolor: 'var(--awm-white)', borderRadius: 1, '& .MuiInputLabel-root.MuiInputLabel-shrink': { bgcolor: 'var(--awm-white)', px: .5 } }} />
          <Typography sx={{fontSize:12,color:'inherit',opacity:.75,textAlign:'center',lineHeight:1.5}}>We will email you when the app launches. No spam.</Typography>
          <Button fullWidth type="submit" variant="contained" disabled={busy} sx={{ minHeight: 44, px: 1, whiteSpace: 'normal', textTransform: 'none', bgcolor: 'var(--awm-gold-light)', color: '#2c1a0e', '&.Mui-disabled': { bgcolor: 'rgba(212,168,67,.24)', color: 'rgba(245,237,224,.7)' } }}>{busy ? 'Saving…' : 'Get notified'}</Button>
        </Box>
      </Box>}
    {result && <Alert severity={result.ok ? 'success' : 'error'} sx={{ mt: 1 }} role="status">{result.message}</Alert>}
  </Box>
}
