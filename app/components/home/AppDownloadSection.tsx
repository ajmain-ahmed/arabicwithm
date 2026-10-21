import { Box, Typography } from '@mui/material'
import AppLaunchSignup from '@/app/components/home/AppLaunchSignup'

function StoreButton({ store }: { store: 'apple' | 'google' }) {
  // The Google PNG includes 42px clear space above/below its 166px artwork.
  // Match visible heights without cropping, stretching or rewriting either badge.
  return <Box aria-label={`${store === 'apple' ? 'App Store' : 'Google Play'} - coming soon`} sx={{ width: { xs: 148, md: store === 'apple' ? 120 : 148 }, height: 44, display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: store === 'apple' ? 'flex-start' : 'center' }, flexShrink: 0 }}>
    <Box component="img" src={store === 'apple' ? '/store-badges/app-store.svg' : '/store-badges/google-play.png'} alt={store === 'apple' ? 'Download on the App Store' : 'Get it on Google Play'} sx={{ display: 'block', flexShrink: 0, height: store === 'apple' ? 40 : 'calc(40px * 250 / 166)', maxWidth: 'none', width: 'auto' }} />
  </Box>
}

/* App launch banner, using the existing forest, cream and gold palette. */
export default function AppDownloadSection() {
  return (
    <Box
      id="download-app"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: { xs: '18px', md: '28px' },
        background: 'linear-gradient(135deg, #143a27 0%, #0e2e1f 46%, #0a2116 100%)',
        border: '1px solid rgba(212,168,67,0.22)',
        boxShadow: '0 24px 60px rgba(10,33,22,0.35)',
      }}
    >
      {/* soft gold glow accents */}
      <Box aria-hidden="true" sx={{ position: 'absolute', top: -120, right: -80, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.16), transparent 65%)' }} />
      <Box aria-hidden="true" sx={{ position: 'absolute', bottom: -140, left: '38%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.1), transparent 65%)' }} />

      <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 600px) 220px' }, alignItems: 'center', gap: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2.5, md: 4 } }}>
        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Mobile App
          </Typography>
          <Typography component="h2" sx={{ mt: 1, color: '#f5ede0', fontFamily: 'var(--font-heading)', fontSize: { xs: 26, sm: 30, md: 34 }, fontWeight: 600, lineHeight: 1.12 }}>
            Take ArabicWithM anywhere
          </Typography>
          <Typography sx={{ mt: 1, color: 'rgba(245,237,224,0.75)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 14, lineHeight: 1.5, maxWidth: 460, mx: { xs: 'auto', md: 0 } }}>
            Keep your streak alive on the go — episodes, books, flashcards and daily goals, all synced with your account.
          </Typography>

          <Typography sx={{ mt: 1.25, color: 'var(--awm-gold-light)', fontSize: 13 }}>Coming soon to iOS and Android</Typography>

          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, md: 0 }, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
            <StoreButton store="apple" />
            <StoreButton store="google" />
          </Box>
          <AppLaunchSignup />
        </Box>

        {/* phone mockup */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
          <Box
            component="img"
            src="/homepage/app-mockup.png"
            alt="ArabicWithM mobile app home screen"
            sx={{
              width: 200,
              height: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 26px 40px rgba(0,0,0,0.5))',
            }}
          />
        </Box>
      </Box>
    </Box>
  )
}
