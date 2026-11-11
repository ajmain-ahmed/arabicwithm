'use client'

import {HOME_PROMO_MAX_WIDTH} from './promoLayout'
import { useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { AutorenewRounded, CheckCircleRounded, DiamondOutlined } from '@mui/icons-material'
import { managePremium, startPremiumCheckout, type PremiumStatus } from '@/app/actions/premium'
import { PREMIUM, PREMIUM_BENEFITS } from '@/app/lib/entitlements'
import { formatMembershipDate } from '@/app/lib/display'
import { refreshPremiumStatus } from '@/app/lib/premiumStatusCache'

/* Shared AWM+ card, in the AppDownloadSection shell: deep forest
   surface, cream type, gold accents, artwork on the right. Free members see
   the upgrade pitch + checkout CTA; subscribers see an active membership state
   with their benefits and renewal/cancellation dates; cancelled members get a
   management button into the existing billing portal. */
export default function AwmPromoSection({ userId, placement='home' }: { userId?: string; placement?:'home'|'profile' }) {
  const [snapshot,setSnapshot]=useState<{userId:string;status:PremiumStatus}|null>(null)
  const [busy, setBusy] = useState(false)
  const [resumeBusy, setResumeBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if(!userId)return
    let current = true, revision = 0
    const refresh=()=>{const request=++revision;void refreshPremiumStatus(userId).then(status=>{if(current&&request===revision)setSnapshot({userId,status})}).catch(()=>{if(current&&request===revision)setSnapshot(null)})}
    refresh()
    const visible=()=>{if(document.visibilityState==='visible')refresh()}
    window.addEventListener('focus',refresh)
    window.addEventListener('account-access-changed',refresh)
    document.addEventListener('visibilitychange',visible)
    return () => {current=false;window.removeEventListener('focus',refresh);window.removeEventListener('account-access-changed',refresh);document.removeEventListener('visibilitychange',visible)}
  }, [userId])
  const status=userId?(snapshot?.userId===userId?snapshot.status:null):{premium:false,admin:false,signedIn:false,manageable:false,cancelAtPeriodEnd:false,periodEnd:null,paymentIssue:false,startedAt:null}
  if (!status) return null
  const active = status.premium || status.admin
  if(placement!=='home')return null

  async function upgrade() {
    if(!userId){window.dispatchEvent(new CustomEvent('open-auth-dialog',{detail:{mode:'signin'}}));return}
    setBusy(true); setError('')
    try { window.location.assign(await startPremiumCheckout()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to open billing. Please try again.'); setBusy(false) }
  }

  /* Cancelled members resume through the Stripe portal, which is where
     cancel-at-period-end subscriptions can be switched back on. */
  async function resume() {
    setResumeBusy(true); setError('')
    try { window.location.assign(await managePremium()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to open billing. Please try again.'); setResumeBusy(false) }
  }

  const endDate = formatMembershipDate(status.periodEnd)
  const statusLine = active ? (
    status.paymentIssue && endDate ? (
      <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13, md: 14 }, color: '#f0a3a3' }}>
        Your last payment didn&rsquo;t go through — update your payment method in your profile to keep AWM+ after {endDate}.
      </Typography>
    ) : status.cancelAtPeriodEnd && endDate ? (
      <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13, md: 14 }, color: 'rgba(245,237,224,0.75)' }}>
        Cancellation scheduled —<br />you have access until {endDate}.
      </Typography>
    ) : endDate ? (
      <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13, md: 14 }, color: 'rgba(245,237,224,0.75)' }}>
        Renews on {endDate}.
      </Typography>
    ) : null
  ) : null

  return (
    <Box data-awm-plus-placement={placement} sx={{mx:'auto',maxWidth:HOME_PROMO_MAX_WIDTH,mt:{xs:6,md:8},mb:placement==='home'?{xs:6,md:8}:0,px:placement==='home'?{xs:2,sm:3}:0}}>
    <Box
      id="awm-plus-promo"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: { xs: '18px', md: '28px' },
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4a843' fill-opacity='0.08' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\"), linear-gradient(135deg, #143a27 0%, #0e2e1f 46%, #0a2116 100%)",
        border: '1px solid rgba(212,168,67,0.22)',
        boxShadow: '0 24px 60px rgba(10,33,22,0.35)',
        mx: 'auto',
        width: { md: 'fit-content' },
        maxWidth: '100%',
      }}
    >
      {/* soft gold glow accents */}
      <Box aria-hidden="true" sx={{ position: 'absolute', top: -120, right: -80, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.16), transparent 65%)' }} />
      <Box aria-hidden="true" sx={{ position: 'absolute', bottom: -140, left: '38%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.1), transparent 65%)' }} />

      {/* Columns hug their content inside a narrower, centered card; the pair
         sits centered so the text and artwork read as one unit. */}
      <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto auto' }, justifyContent: 'center', alignItems: 'center', gap: { xs: 3, md: 12 }, px: { xs: 5, sm: 6, md: 8 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            AWM+
          </Typography>
          <Typography component="h2" sx={{ mt: 1, color: '#f5ede0', fontFamily: 'var(--font-heading)', fontSize: { xs: 28, sm: 34, md: 42 }, fontWeight: 600, lineHeight: 1.12 }}>
            {active ? 'AWM+' : 'Upgrade to AWM+'}
          </Typography>
          {!active && (
            <Typography sx={{ mt: 1.5, color: 'rgba(245,237,224,0.75)', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 14, md: 15.5 }, lineHeight: 1.65, maxWidth: 460, mx: 'auto' }}>
              Support ArabicWithM and unlock exclusive benefits with AWM+!<br />Your support enables us to continue maintaining and expanding our library of interactive Arabic learning resources.<br />Cancel anytime with just a click in your account settings.
            </Typography>
          )}          {active && (
            <Typography sx={{ mt: 1.5, color: 'rgba(245,237,224,0.75)', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 14, md: 15.5 }, lineHeight: 1.65, maxWidth: 460, mx: 'auto' }}>
              Your AWM+ membership is active. Thank you for supporting ArabicWithM.
            </Typography>
          )}

          <Box component="ul" sx={{ m: 0, p: 0, mt: 2.25, listStyle: 'none', display: 'grid', gap: 1, maxWidth: 460, mx: 'auto' }}>
            {PREMIUM_BENEFITS.map(benefit => (
              <Box component="li" key={benefit.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.1, px: 1.5, py: 1.1, borderRadius: '10px', bgcolor: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.22)' }}>
                <CheckCircleRounded aria-hidden="true" sx={{ flex: '0 0 auto', fontSize: 19, color: '#d4a843' }} />
                <Typography sx={{ minWidth: 0, flex: 1, fontFamily: 'var(--font-sans), sans-serif', fontSize: 13.5, fontWeight: 600, color: '#f5ede0', whiteSpace: 'normal' }}>{benefit.label}</Typography>
              </Box>
            ))}
          </Box>

          {active ? (
            <Box sx={{ mt: 2.25 }}>
              {statusLine}
              {status.manageable && (
                <Button
                  onClick={() => void resume()}
                  disabled={resumeBusy}
                  loading={resumeBusy}
                  loadingPosition="start"
                  loadingIndicator={<CircularProgress size={16} thickness={5} sx={{ color: '#fff' }} />}
                  variant="contained"
                  startIcon={<AutorenewRounded sx={{ fontSize: 18 }} />}
                  sx={{
                    mt: 1.75, width: '100%', maxWidth: 460, mx: 'auto', minHeight: 44, px: 3, textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 14,
                    color: '#0e2e1f', background: 'linear-gradient(135deg, #d4a843, #b8860b)', borderRadius: '9999px', boxShadow: '0 10px 26px rgba(184,134,11,0.35)',
                    '&:hover': { background: 'linear-gradient(135deg, #e2b95c, #c8962a)', boxShadow: '0 12px 30px rgba(184,134,11,0.45)' },
                  }}
                >
                  {resumeBusy ? 'Opening…' : 'Manage membership'}
                </Button>
              )}
            </Box>
          ) : (
            <>
              <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'baseline', gap: 1, justifyContent: 'center' }}>
                <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 30, md: 36 }, fontWeight: 700, color: '#d4a843', lineHeight: 1 }}>{PREMIUM.price}</Typography>
                <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: 'rgba(245,237,224,0.7)' }}>/ month · cancel anytime</Typography>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 1.25, maxWidth: 460, mx: 'auto' }}>
                <Button
                  onClick={() => void upgrade()}
                  disabled={busy}
                  loading={busy}
                  loadingPosition="start"
                  loadingIndicator={<CircularProgress size={16} thickness={5} sx={{ color: '#fff' }} />}
                  variant="contained"
                  startIcon={<DiamondOutlined sx={{ fontSize: 18 }} />}
                  sx={{
                    flex: 1, minHeight: 48, px: 3, textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 15,
                    color: '#0e2e1f', background: 'linear-gradient(135deg, #d4a843, #b8860b)', borderRadius: '9999px', boxShadow: '0 10px 26px rgba(184,134,11,0.35)',
                    '&:hover': { background: 'linear-gradient(135deg, #e2b95c, #c8962a)', boxShadow: '0 12px 30px rgba(184,134,11,0.45)' },
                  }}
                >
                  {busy ? 'Opening…' : 'Get AWM+'}
                </Button>
              </Box>
              {error && <Typography sx={{ mt: 1.25, fontFamily: 'var(--font-sans), sans-serif', fontSize: 12.5, color: '#f0a3a3' }}>{error}</Typography>}
            </>
          )}
          {active && error && <Typography sx={{ mt: 1.25, fontFamily: 'var(--font-sans), sans-serif', fontSize: 12.5, color: '#f0a3a3' }}>{error}</Typography>}
        </Box>

        {/* artwork: transparent cutout — natural aspect, silhouette shadow
            (static asset, plain img so nothing touches the image optimizer) */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
          <Box
            component="img"
            src="/homepage/vegeta.avif"
            alt={active ? 'Your AWM+ membership is active' : 'Upgrade to AWM+'}
            sx={{
              height: { xs: 340, md: 520 },
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 26px 36px rgba(0,0,0,0.45))',
            }}
          />
        </Box>
      </Box>
    </Box>
    </Box>
  )
}
