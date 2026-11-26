'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { returnToPublicHome } from '@/app/lib/publicHome'
import { boundedRead } from '@/app/lib/readRecovery'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowForwardIos, CalendarMonthOutlined, CheckCircleOutlined,
  ChevronRight, DiamondOutlined, EmailOutlined, FavoriteRounded,
CreditCardOutlined, LocalFireDepartmentRounded,
  LockOutlined, LogoutOutlined, PersonOutlined,
  SettingsOutlined, ShieldOutlined, SupportOutlined,
} from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material'
import { checkUsernameAvailability, updateProfile, type PublicProfile } from '@/app/actions/profiles'
import { fetchPremiumStatus, managePremium, startPremiumCheckout, type PremiumStatus } from '@/app/actions/premium'
import { PREMIUM, PREMIUM_BENEFITS } from '@/app/lib/entitlements'
import { formatMembershipDate } from '@/app/lib/display'
import ContactDialog from '@/app/components/ContactDialog'
import SupportDialog from '@/app/components/SupportDialog'
import AppDownloadSection from '@/app/components/home/AppDownloadSection'
import ProfileHeader from '@/app/profile/ProfileHeader'
import ProfilePresetPicker from '@/app/profile/ProfilePresetPicker'
import {presetRefFromUrl,type ProfilePresetBucket} from '@/app/lib/profilePresets'
import { useAuth } from '@/app/AuthContext'
import { usernameSchema } from '@/app/lib/username'

/* Profile layout adapted from the Five Palms account design: dark gradient
   header, sticky sidebar navigation on desktop, fixed bottom tabs on mobile,
   and card-based sections with gold hairline detailing. */

type Section = 'account' | 'awm' | 'settings' | 'support'

const CSS = `
  @keyframes pvFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .pv-fade-up{animation:pvFadeUp 0.5s cubic-bezier(.22,1,.36,1) both;}
  .pv-nav-item{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:2px;cursor:pointer;
    transition:background 0.15s,color 0.15s;font-family:var(--font-sans),sans-serif;font-size:0.88rem;font-weight:500;
    color:var(--awm-muted);border:1px solid transparent;white-space:nowrap;background:transparent;}
  .pv-nav-item:hover{background:rgba(184,134,11,0.05);color:var(--awm-bark);}
  .pv-nav-item.active{background:rgba(184,134,11,0.07);color:var(--awm-bark);border-color:rgba(184,134,11,0.18);font-weight:600;}
  .pv-nav-item.active .pv-nav-icon{color:var(--awm-gold);}
  .pv-mobile-tab{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;
    cursor:pointer;flex:1;border:none;background:transparent;transition:color 0.15s;
    color:var(--awm-muted);font-family:var(--font-sans),sans-serif;font-size:0.62rem;font-weight:500;letter-spacing:0.03em;}
  .pv-mobile-tab.active{color:var(--awm-gold);}
  .pv-order-card{background:var(--awm-white);border:1px solid rgba(184,134,11,0.18);border-radius:4px;overflow:hidden;}
  .pv-gold-shimmer{height:1px;background:linear-gradient(90deg,transparent,var(--awm-gold-light),transparent);}
  .pv-support-card{background:var(--awm-white);border:1px solid rgba(184,134,11,0.18);border-radius:4px;padding:20px;
    transition:box-shadow 0.2s;cursor:pointer;text-decoration:none;display:block;width:100%;
    font:inherit;color:inherit;text-align:left;}
  .pv-support-card:hover{box-shadow:0 8px 32px rgba(44,26,14,0.08);}
  .pv-field .MuiOutlinedInput-root{font-family:var(--font-sans),sans-serif;font-size:0.9rem;border-radius:2px;background:var(--awm-white);}
  .pv-field .MuiOutlinedInput-root fieldset{border-color:rgba(184,134,11,0.18);}
  .pv-field .MuiOutlinedInput-root:hover fieldset{border-color:rgba(184,134,11,0.4);}
  .pv-field .MuiOutlinedInput-root.Mui-focused fieldset{border-color:var(--awm-gold);border-width:1px;}
  .pv-field .MuiInputLabel-root{font-family:var(--font-sans),sans-serif;font-size:0.88rem;color:var(--awm-muted);}
  .pv-field .MuiInputLabel-root.Mui-focused{color:var(--awm-gold);}
`

const GOLD_BUTTON = {
  background: 'linear-gradient(135deg,#b8860b,#d4a843)', color: '#0e2e1f',
  fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, textTransform: 'none', borderRadius: '2px',
  boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg,#d4a843,#b8860b)', boxShadow: 'none' },
} as const

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--awm-gold)', mb: 1 }}>{children}</Typography>
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: '1.4rem', md: '1.6rem' }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.2, mb: 3 }}>{children}</Typography>
}

function FieldShell({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
        <Box sx={{ color: 'var(--awm-gold)', display: 'flex', flexShrink: 0 }}>{icon}</Box>
        <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--awm-muted)' }}>{label}</Typography>
      </Box>
      {children}
    </Box>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 1.2, background: 'var(--awm-white)', border: '1px solid rgba(184,134,11,0.18)', borderRadius: '2px', wordBreak: 'break-word' }}>
      <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.9rem', color: 'var(--awm-bark)' }}>{children}</Typography>
    </Box>
  )
}

function AccountSection({ profile, onSaved }: { profile: PublicProfile; onSaved: (name: string) => void }) {
 const {t:awmT}=useWebsiteLocale()

  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState(profile.displayName)
  const [savedUsername, setSavedUsername] = useState(profile.username)
  const [username, setUsername] = useState(profile.username ?? '')
  const [availability, setAvailability] = useState<{ value: string; message: string; available: boolean } | null>(null)
  const [savedMedia,setSavedMedia]=useState({avatar:profile.avatar,banner:profile.banner??null,crop:profile.avatarCrop})
  const [draftMedia,setDraftMedia]=useState(savedMedia)
  const [presetRefs,setPresetRefs]=useState<{avatarPreset?:string;bannerPreset?:string}>({})
  const [picker,setPicker]=useState<{bucket:ProfilePresetBucket;media:typeof draftMedia;refs:typeof presetRefs}|null>(null)
  function openPicker(bucket:ProfilePresetBucket){setPicker({bucket,media:draftMedia,refs:presetRefs})}
  function cancelPicker(){if(picker){setDraftMedia(picker.media);setPresetRefs(picker.refs)}setPicker(null)}
  function cancelEdit(){setEditing(false);setMessage('');setName(profile.displayName);setUsername(savedUsername??'');setDraftMedia(savedMedia);setPresetRefs({});setPicker(null)}


  useEffect(() => {
    if (!profile.own || !username.trim()) return
    let active = true
    const parsed = usernameSchema.safeParse(username)
    if (!parsed.success) return
    const timer = setTimeout(() => {
      void checkUsernameAvailability(parsed.data)
        .then(available => { if (active) setAvailability({ value: username, message: available ? 'Username available.' : 'That username is already taken.', available }) })
        .catch(() => { if (active) setAvailability({ value: username, message: 'Unable to check availability. Please retry.', available: false }) })
    }, 350)
    return () => { active = false; clearTimeout(timer) }
  }, [username, profile.own])

  const usernameValidation = username.trim() ? usernameSchema.safeParse(username) : null
  const usernameError = usernameValidation && !usernameValidation.success ? usernameValidation.error.issues[0].message : ''
  const usernameStatus = availability?.value === username ? availability : null

  async function save() {
    setSaving(true); setMessage('')
    try {
      // Privacy flags keep their stored values; they are not editable here.
      await updateProfile({ displayName: name, isPublic: profile.isPublic, shareReading: profile.shareReading, ...presetRefs, ...(username.trim() ? { username } : {}) })
      setEditing(false);setSavedMedia(draftMedia);setPresetRefs({})
      const trimmed = name.trim()
      onSaved(trimmed)
      if (username.trim()) { const value = usernameSchema.parse(username); setUsername(value); setSavedUsername(value) }
      // The hero greeting and navbar read user_metadata, not public_profiles —
      // mirror the name there so the whole UI updates in this session.
      try {
        const { supabase } = await import('@/app/lib/supabase/client')
        await supabase.auth.updateUser({ data: { full_name: trimmed } })
      } catch { /* Best effort: the profile table is the source of truth. */ }
      setMessage('Profile saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save profile. Please try again.') }
    finally { setSaving(false) }
  }

  return (
    <Box className="pv-fade-up">
      <SectionLabel><UiText>{"Profile"}</UiText></SectionLabel>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2 }}>
        <SectionTitle><UiText>{"Your Account"}</UiText></SectionTitle>
        {profile.own && !editing && (
          <Button onClick={() => setEditing(true)} variant="contained" size="small" sx={{ ...GOLD_BUTTON, fontSize: '0.75rem', flexShrink: 0, mt: 0.5 }}><UiText>{"Edit"}</UiText></Button>
        )}
      </Box>

      <ProfileHeader name={editing?name:profile.displayName} username={savedUsername} joined={profile.joined} avatar={draftMedia.avatar} banner={draftMedia.banner} avatarCrop={draftMedia.crop} editing={profile.own&&editing&&!saving} onAvatar={()=>openPicker('profile-pictures')} onBanner={()=>openPicker('profile-banners')}/>
      {picker&&<ProfilePresetPicker key={picker.bucket} bucket={picker.bucket} selected={presetRefFromUrl(picker.bucket==='profile-pictures'?draftMedia.avatar:draftMedia.banner)} onSelect={preset=>{
        if(picker.bucket==='profile-pictures'){setDraftMedia(old=>({...old,avatar:preset.url,crop:{x:50,y:50,zoom:1}}));setPresetRefs(old=>({...old,avatarPreset:preset.ref}))}
        else{setDraftMedia(old=>({...old,banner:preset.url}));setPresetRefs(old=>({...old,bannerPreset:preset.ref}))}
      }} onDone={()=>setPicker(null)} onCancel={cancelPicker}/>}

      <div className="pv-gold-shimmer" style={{ marginBottom: 24 }} />

      {/* fields */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {profile.own && user?.email && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FieldShell icon={<EmailOutlined sx={{ fontSize: 16 }} />} label={awmT("Email")}>
              <InfoBox>{user.email}</InfoBox>
            </FieldShell>
          </Box>
        )}

        <Box>
          <FieldShell icon={<PersonOutlined sx={{ fontSize: 16 }} />} label={awmT("Display Name")}>
            {editing ? (
              <TextField className="pv-field" fullWidth size="small" value={name} onChange={e => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 60 } }} />
            ) : <InfoBox>{profile.displayName}</InfoBox>}
          </FieldShell>
        </Box>

        <Box>
          <FieldShell icon={<PersonOutlined sx={{ fontSize: 16 }} />} label={awmT("Username")}>
            {editing ? (
              <TextField
                className="pv-field" fullWidth size="small" value={username}
                onChange={e => setUsername(e.target.value)} error={Boolean(usernameError || usernameStatus && !usernameStatus.available)}
                helperText={usernameError || usernameStatus?.message || '3-24 letters, numbers or underscores. Start with a letter.'}
                slotProps={{ htmlInput: { maxLength: 24, autoCapitalize: 'none', autoCorrect: 'off' } }}
              />
            ) : <InfoBox>{profile.username ? `@${profile.username}` : '—'}</InfoBox>}
          </FieldShell>
        </Box>

        <Box>
          <FieldShell icon={<CalendarMonthOutlined sx={{ fontSize: 16 }} />} label={awmT("Member Since")}>
            <InfoBox>{profile.joined}</InfoBox>
          </FieldShell>
        </Box>

        <Box>
          <FieldShell icon={<LocalFireDepartmentRounded sx={{ fontSize: 16 }} />} label={awmT("Streak")}>
            <InfoBox>{profile.summary.streak}{' '}<UiText>{"day streak"}</UiText></InfoBox>
          </FieldShell>
        </Box>

        <Box sx={{ gridColumn: '1 / -1' }}>
          <FieldShell icon={<ShieldOutlined sx={{ fontSize: 16 }} />} label="AWM+">
            <Box aria-label={profile.premium ? awmT("AWM Plus") : undefined}>
              <InfoBox>{profile.premium ? awmT("AWM+ subscription active") : awmT("Free account")}</InfoBox>
            </Box>
          </FieldShell>
        </Box>
      </Box>

      {profile.own && user?.id===profile.id && <Box sx={{mt:4}}><AppDownloadSection fullWidth /></Box>}

      {editing && (
        <Box sx={{ display: 'flex', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
          <Button onClick={() => void save()} disabled={saving || !name.trim() || Boolean(usernameError) || Boolean(usernameStatus && !usernameStatus.available)} variant="contained" sx={{ ...GOLD_BUTTON, px: 3 }}>
            {saving ? awmT("Saving…") : awmT("Save Changes")}
          </Button>
          <Button onClick={cancelEdit} disabled={saving} variant="outlined"
            sx={{ borderColor: 'rgba(184,134,11,0.18)', color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 500, textTransform: 'none', borderRadius: '2px', px: 3, '&:hover': { borderColor: 'var(--awm-gold)', color: 'var(--awm-gold)' } }}>
            <UiText>{"Cancel"}</UiText></Button>
        </Box>
      )}
      {message && <Alert severity={message === 'Profile saved.' ? 'success' : 'error'} sx={{ mt: 2 }}><UiText>{message}</UiText></Alert>}
    </Box>
  )
}

function AwmSection({ profile }: { profile: PublicProfile }) {
 const {t:awmT,locale}=useWebsiteLocale()

  const [status, setStatus] = useState<PremiumStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusAttempt, setStatusAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!profile.own) return
    let active = true
    const refresh = () => {
      void boundedRead(fetchPremiumStatus(), 8000)
        .then(value => { if (active) { setStatus(value); setError('') } })
        .catch(() => { if (active) setError('Unable to confirm your AWM+ status. Please try again.') })
        .finally(() => { if (active) setStatusLoading(false) })
    }
    /* Re-verify on entry, focus and account changes; the confirmed response is
       required before showing either the active or cancellation view. */
    refresh()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 60_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('account-access-changed', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('account-access-changed', refresh)
    }
  }, [profile.own, statusAttempt])
  const retryStatus = () => { setStatusLoading(true); setError(''); setStatusAttempt(value => value + 1) }

  const cta = async () => {
    setBusy(true); setError('')
    try {
      window.location.assign(await (status?.premium ? managePremium() : startPremiumCheckout()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open billing. Please try again.')
      setBusy(false)
    }
  }
  const [cardBusy, setCardBusy] = useState(false)
  /* Deep link: land directly on the portal's update-payment-method screen
     (the dunning case), not the generic portal home. */
  const updateCard = async () => {
    setCardBusy(true); setError('')
    try {
      window.location.assign(await managePremium('payment-method'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open billing. Please try again.')
      setCardBusy(false)
    }
  }
  const premium = status?.premium ?? false
  const manageable = status?.manageable ?? false
  /* Whole months since the subscription began, counting the current one. */
  const tenureMonths = (() => {
    if (!status?.startedAt) return 0
    const started = new Date(status.startedAt)
    if (Number.isNaN(started.getTime())) return 0
    const now = new Date()
    return Math.max(1, (now.getFullYear() - started.getFullYear()) * 12 + (now.getMonth() - started.getMonth()) + (now.getDate() >= started.getDate() ? 1 : 0))
  })()

  if (!status) return (
    <Box className="pv-fade-up">
      <SectionLabel><UiText>{"Subscription"}</UiText></SectionLabel>
      <SectionTitle>AWM+</SectionTitle>
      <Box sx={{ minHeight: 280, display: 'grid', placeItems: 'center', background: 'var(--awm-white)', border: '1px solid rgba(184,134,11,0.18)', borderRadius: '4px', p: { xs: 2, sm: 3 } }}>
        {statusLoading || !error ? (
          <Box role="status" sx={{ textAlign: 'center' }}>
            <CircularProgress size={30} sx={{ color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1.5, fontFamily: 'var(--font-sans), sans-serif', color: 'var(--awm-muted)' }}><UiText>{"Confirming your AWM+ status…"}</UiText></Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Alert severity="error"><UiText>{error}</UiText></Alert>
            <Button onClick={retryStatus} variant="outlined" sx={{ mt: 2, textTransform: 'none' }}><UiText>{"Retry"}</UiText></Button>
          </Box>
        )}
      </Box>
    </Box>
  )

  return (
    <Box className="pv-fade-up">
      <SectionLabel><UiText>{"Subscription"}</UiText></SectionLabel>
      <SectionTitle>AWM+</SectionTitle>
      <Box sx={{ background: 'var(--awm-white)', border: '1px solid rgba(184,134,11,0.18)', borderRadius: '4px', p: { xs: 2, sm: 3 } }}>
        {premium && manageable && formatMembershipDate(status?.startedAt,locale) && (
          <Typography sx={{ mb: 1.5, fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.82rem', color: 'var(--awm-muted)' }}>
            <UiText>{"Member since"}</UiText>{' '}{formatMembershipDate(status?.startedAt,locale)}
            {tenureMonths > 0 ? ` · ${tenureMonths} month${tenureMonths === 1 ? '' : 's'} a subscriber` : ''}
          </Typography>
        )}
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1, mb: 2.5 }}>
          {PREMIUM_BENEFITS.map((benefit) => (
            <Box component="li" key={benefit.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.1, px: 1.5, py: 1.1, borderRadius: '2px', bgcolor: 'var(--awm-cream-light)' }}>
              <CheckCircleOutlined aria-hidden="true" sx={{ flex: '0 0 auto', color: 'var(--awm-gold)', fontSize: 19 }} />
              <Typography sx={{ minWidth: 0, flex: 1, fontFamily: 'var(--font-sans), sans-serif', color: 'var(--awm-bark)', fontSize: { xs: 13, sm: 14 }, fontWeight: 600 }}><UiText>{benefit.label}</UiText></Typography>
            </Box>
          ))}
        </Box>
        {!premium && (
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--awm-bark)', mb: 2 }}>
            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(PREMIUM.monthlyPence / 100)}
            <Typography component="span" sx={{ ml: 1, fontSize: '0.9rem', color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif' }}><UiText>{"GBP / month"}</UiText></Typography>
          </Typography>
        )}
        {premium && !manageable ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.4, background: 'rgba(46,125,50,0.06)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: '2px' }}>
            <CheckCircleOutlined sx={{ fontSize: 16, color: '#2e7d32', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.82rem', color: '#2e7d32' }}><UiText>{"Your AWM+ subscription is active."}</UiText></Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, width: '100%' }}>
              <Button onClick={() => void cta()} disabled={busy} loading={busy} loadingPosition="start" loadingIndicator={<CircularProgress size={16} thickness={5} sx={{ color: '#fff' }} />} variant="contained" startIcon={<CreditCardOutlined sx={{ fontSize: { xs: 17, sm: 18 } }} />} sx={{ ...GOLD_BUTTON, width: '100%', flex: { sm: '1 1 0' }, minWidth: 0, minHeight: { xs: 46, sm: 42 }, px: { xs: 1, sm: 2.5 }, fontSize: { xs: 12.5, sm: 14 }, whiteSpace: 'nowrap' }}>
                {busy ? awmT("Opening…") : premium ? awmT("Manage AWM+") : awmT('Subscribe — {price}',{price:PREMIUM.label})}
              </Button>
            </Box>
            {premium && manageable && status?.paymentIssue && formatMembershipDate(status?.periodEnd,locale) ? (
              <>
                <Alert severity="error" sx={{ mt: 2, py: 0 }}>
                  <UiText>{"Your last payment didn’t go through — update your payment method. Access continues until"}</UiText>{' '}{formatMembershipDate(status?.periodEnd,locale)}.
                </Alert>
                <Button onClick={() => void updateCard()} disabled={cardBusy} loading={cardBusy} loadingPosition="start" loadingIndicator={<CircularProgress size={16} thickness={5} sx={{ color: '#fff' }} />} variant="outlined" startIcon={<CreditCardOutlined sx={{ fontSize: { xs: 17, sm: 18 } }} />} sx={{ mt: 1.5, width: '100%', minHeight: { xs: 44, sm: 40 }, textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 12.5, sm: 14 }, borderColor: 'rgba(184,134,11,0.5)', color: 'var(--awm-bark)' }}>
                  {cardBusy ? awmT("Opening…") : awmT("Update payment method")}
                </Button>
              </>
            ) : premium && manageable && status?.cancelAtPeriodEnd && formatMembershipDate(status.periodEnd,locale) ? (
              <Alert severity="warning" icon={false} sx={{ mt: 2, py: 0 }}>
                <UiText>{"Cancellation scheduled — your access ends on"}</UiText>{' '}{formatMembershipDate(status.periodEnd,locale)}<UiText>{". You won’t be charged again."}</UiText></Alert>
            ) : premium && manageable && formatMembershipDate(status?.periodEnd,locale) ? (
              <Typography sx={{ mt: 1.5, fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.8rem', color: 'var(--awm-muted)' }}>
                <UiText>{"Renews on"}</UiText>{' '}{formatMembershipDate(status?.periodEnd,locale)} · {PREMIUM.price}.
              </Typography>
            ) : null}
          </>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}><UiText>{error}</UiText></Alert>}
      </Box>
    </Box>
  )
}

function SettingsSection() {
 const {t:awmT}=useWebsiteLocale()

  const { user } = useAuth()
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [signingOut, setSigningOut] = useState(false)

  const sendResetLink = async () => {
    if (!user?.email) { setResetStatus('error'); return }
    setResetStatus('sending')
    try {
      const { supabase } = await import('@/app/lib/supabase/client')
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` })
      if (error) throw error
      setResetStatus('sent')
    } catch { setResetStatus('error') }
  }

  const signOut = async () => {
    setSigningOut(true)
    try {
      const { supabase } = await import('@/app/lib/supabase/client')
      const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) throw error
    } finally { returnToPublicHome() }
  }

  return (
    <Box className="pv-fade-up">
      <SectionLabel><UiText>{"Preferences"}</UiText></SectionLabel>
      <SectionTitle><UiText>{"Settings"}</UiText></SectionTitle>
      <Box sx={{ background: 'var(--awm-white)', border: '1px solid rgba(184,134,11,0.18)', borderRadius: '4px', p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <LockOutlined sx={{ fontSize: 17, color: 'var(--awm-gold)' }} />
          <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.85rem', fontWeight: 600, color: 'var(--awm-bark)' }}><UiText>{"Password"}</UiText></Typography>
        </Box>
        <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.8rem', color: 'var(--awm-muted)', mb: 2.5, lineHeight: 1.6 }}>
          <UiText>{"We'll send a secure reset link to"}</UiText>{' '}<Box component="span" sx={{ color: 'var(--awm-bark)', fontWeight: 500 }}>{user?.email ?? 'your account email'}</Box>
        </Typography>
        {resetStatus === 'sent' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.4, background: 'rgba(46,125,50,0.06)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: '2px' }}>
            <CheckCircleOutlined sx={{ fontSize: 16, color: '#2e7d32', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.82rem', color: '#2e7d32' }}><UiText>{"Reset link sent — check your inbox."}</UiText></Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button onClick={() => void sendResetLink()} disabled={resetStatus === 'sending'} variant="contained" sx={{ ...GOLD_BUTTON, alignSelf: 'flex-start', px: 3, '&:disabled': { background: 'rgba(44,26,14,0.08)', color: 'rgba(44,26,14,0.3)' } }}>
              {resetStatus === 'sending' ? awmT("Sending…") : awmT("Send Reset Link")}
            </Button>
            {resetStatus === 'error' && (
              <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.78rem', color: '#c0392b' }}><UiText>{"Something went wrong. Please try again."}</UiText></Typography>
            )}
          </Box>
        )}
      </Box>

      <Box sx={{ background: 'var(--awm-white)', border: '1px solid rgba(184,134,11,0.18)', borderRadius: '4px', p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <LogoutOutlined sx={{ fontSize: 17, color: 'var(--awm-gold)' }} />
          <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.85rem', fontWeight: 600, color: 'var(--awm-bark)' }}><UiText>{"Sign Out"}</UiText></Typography>
        </Box>
        <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.8rem', color: 'var(--awm-muted)', mb: 2.5, lineHeight: 1.6 }}><UiText>{"You can sign back in anytime with your email."}</UiText></Typography>
        <Button onClick={() => void signOut()} disabled={signingOut} variant="outlined"
          sx={{ alignSelf: 'flex-start', borderColor: 'rgba(184,134,11,0.18)', color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 500, textTransform: 'none', borderRadius: '2px', px: 3, '&:hover': { borderColor: 'var(--awm-gold)', color: 'var(--awm-gold)', background: 'rgba(184,134,11,0.04)' } }}>
          {signingOut ? awmT("Signing out…") : awmT("Sign Out")}
        </Button>
      </Box>
    </Box>
  )
}


function SupportSection() {

  const [dialog, setDialog] = useState<null | 'contact' | 'support'>(null)
  const faqs = [
    { q: 'What is AWM+?', a: 'AWM+ is our subscription: unlimited Memory sessions, audiobook listening, PDF downloads and more. Manage it any time from this profile page.' },
    { q: 'How do I keep my streak going?', a: 'Spend at least a minute learning on any given day — watching, reading or looking up words all count toward your streak.' },
    { q: 'Can other people see my profile?', a: 'Only if you make it public. Use the switches in Account → Edit to control your profile visibility and bookshelf sharing.' },
    { q: 'How do I change my password?', a: 'Open Settings on this page and choose “Send Reset Link” — we will email you a secure link to set a new password.' },
  ]
  const close = () => setDialog(null)
  return (
    <Box className="pv-fade-up">
      <SectionLabel><UiText>{"Help"}</UiText></SectionLabel>
      <SectionTitle><UiText>{"Support"}</UiText></SectionTitle>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 4 }}>
        {[
          { key: 'contact' as const, icon: <EmailOutlined sx={{ fontSize: 22 }} />, title: "Contact Us", body: 'Questions, feedback or suggestions? Contact us on social media or by email.', action: 'Contact us' },
          { key: 'support' as const, icon: <FavoriteRounded sx={{ fontSize: 22 }} />, title: "Support the Project", body: 'Help us create more Arabic learning resources.', action: 'Support us' },
        ].map(({ key, icon, title, body, action }) => (
          <Box key={key} className="pv-support-card" component="button" type="button" onClick={() => setDialog(key)}>
            <Box sx={{ color: 'var(--awm-gold)', mb: 1.5 }}>{icon}</Box>
            <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--awm-bark)', mb: 0.5 }}><UiText>{title}</UiText></Typography>
            <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.82rem', color: 'var(--awm-muted)', lineHeight: 1.6, mb: 1.5 }}><UiText>{body}</UiText></Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.75rem', fontWeight: 600, color: 'var(--awm-gold)', letterSpacing: '0.04em' }}><UiText>{action}</UiText></Typography>
              <ArrowForwardIos sx={{ fontSize: 10, color: 'var(--awm-gold)' }} />
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ background: 'var(--awm-white)', border: '1px solid rgba(184,134,11,0.18)', borderRadius: '4px', p: { xs: 2, sm: 3 } }}>
        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--awm-bark)', mb: 2.5 }}><UiText>{"Common Questions"}</UiText></Typography>
        {faqs.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
      </Box>
      <ContactDialog open={dialog === 'contact'} onClose={close} />
      <SupportDialog open={dialog === 'support'} onClose={close} />
    </Box>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Box sx={{ borderBottom: '1px solid rgba(44,26,14,0.07)', '&:last-child': { borderBottom: 'none' } }}>
      <Box onClick={() => setOpen(o => !o)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.8, cursor: 'pointer', gap: 2 }}>
        <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.88rem', fontWeight: 500, color: 'var(--awm-bark)' }}><UiText>{q}</UiText></Typography>
        <ChevronRight sx={{ fontSize: 16, color: 'var(--awm-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }} />
      </Box>
      {open && <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.82rem', color: 'var(--awm-muted)', lineHeight: 1.7, pb: 2 }}><UiText>{a}</UiText></Typography>}
    </Box>
  )
}

export default function ProfileView({ profile }: { profile: PublicProfile }) {
 const {t:awmT}=useWebsiteLocale()

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account', icon: <PersonOutlined sx={{ fontSize: 18 }} /> },
    ...(profile.own ? [{ id: 'awm' as Section, label: 'AWM+', icon: <DiamondOutlined sx={{ fontSize: 18 }} /> }] : []),
    ...(profile.own ? [{ id: 'settings' as Section, label: 'Settings', icon: <SettingsOutlined sx={{ fontSize: 18 }} /> }] : []),
    { id: 'support', label: 'Support', icon: <SupportOutlined sx={{ fontSize: 18 }} /> },
  ]
  const activeSection = searchParams.get('tab') as Section ?? 'account'
  useEffect(() => {
    if (window.location.hash === '#profile-settings') router.replace(`${pathname}?tab=settings`, { scroll: false })
  }, [pathname, router])
  const [displayName, setDisplayName] = useState(profile.displayName)

  const selectSection = (id: Section) => {
    if (id !== activeSection) router.push(id === 'account' ? pathname : `${pathname}?tab=${id}`, { scroll: false })
  }

  const active = sections.some(s => s.id === activeSection) ? activeSection : 'account'

  return (
    <>
      <style>{CSS}</style>
      {!!profile.warnings?.length && <Alert severity="info" sx={{ mx: 2, mt: 2 }}>{profile.warnings.join(' ')}{' '}<UiText>{"Your profile is still available. Refresh to retry."}</UiText></Alert>}
      {/* body */}
      <Box sx={{ background: 'var(--awm-cream-light)', minHeight: 'calc(100dvh - var(--awm-navbar-height))', transition: 'background-color 180ms ease', pb: { xs: 9, md: 0 } }}>
        <Container data-profile-page maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
          <Box sx={{ display: 'flex', gap: { md: 5 }, flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'flex-start' } }}>
            {/* sidebar (desktop) */}
            <Box component="nav" aria-label={awmT("Profile sections")} sx={{ display: { xs: 'none', md: 'flex' }, width: 220, flexShrink: 0, position: 'sticky', top: 96, flexDirection: 'column', gap: 0.5 }}>
              {sections.map(item => (
                <Box key={item.id} component="button" type="button" aria-current={active === item.id ? 'page' : undefined} className={`pv-nav-item${active === item.id ? ' active' : ''}`} sx={{ width: '100%', background: 'transparent', textAlign: 'start', '&:focus-visible': { outline: '2px solid var(--awm-gold)', outlineOffset: 2 } }} onClick={() => selectSection(item.id)}>
                  <Box className="pv-nav-icon" sx={{ color: active === item.id ? 'var(--awm-gold)' : 'var(--awm-muted)', display: 'flex', transition: 'color 0.15s' }}>{item.icon}</Box>
                  <UiText>{item.label}</UiText>
                </Box>
              ))}
            </Box>

            {/* sections */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={active === 'account' ? undefined : { display: 'none' }}>
                <AccountSection profile={{ ...profile, displayName }} onSaved={setDisplayName} />
              </Box>
              {profile.own && (
                <Box sx={active === 'awm' ? undefined : { display: 'none' }}>
                  <AwmSection profile={profile} />
                </Box>
              )}
              {profile.own && (
                <Box id="profile-settings" sx={active === 'settings' ? undefined : { display: 'none' }}>
                  <SettingsSection />
                </Box>
              )}
              <Box sx={active === 'support' ? undefined : { display: 'none' }}>
                <SupportSection />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* fixed bottom tab bar (mobile) */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--awm-white)', borderTop: '1px solid rgba(184,134,11,0.18)', display: { xs: 'flex', md: 'none' }, flexWrap: 'nowrap', boxShadow: '0 -4px 20px rgba(44,26,14,0.08)' }}>
        {sections.map(item => (
          <Box key={item.id} component="button" type="button" className={`pv-mobile-tab${active === item.id ? ' active' : ''}`} onClick={() => selectSection(item.id)}>
            <Box sx={{ display: 'flex', color: 'inherit' }}>{item.icon}</Box>
            <UiText>{item.label}</UiText>
          </Box>
        ))}
      </Box>
    </>
  )
}
