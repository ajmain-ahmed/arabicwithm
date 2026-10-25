import Image from 'next/image'
import { Box, Typography } from '@mui/material'
import AppLaunchSignup from './AppLaunchSignup'

/* Shazam-inspired app banner in the ArabicWithM palette: deep forest surface
   with cream type and gold accents. Layout stacks on mobile like the mobile
   reference: copy → signup → phone. */
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

      <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' }, alignItems: 'center', gap: { xs: 3, md: 5 }, px: { xs: 2.5, sm: 4, md: 6 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Mobile App
          </Typography>
          <Typography component="h2" sx={{ mt: 1, color: '#f5ede0', fontFamily: 'var(--font-heading)', fontSize: { xs: 28, sm: 34, md: 42 }, fontWeight: 600, lineHeight: 1.12 }}>
            Take ArabicWithM anywhere
          </Typography>
          <Typography sx={{ mt: 1.5, color: 'rgba(245,237,224,0.75)', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 14, md: 15.5 }, lineHeight: 1.65, maxWidth: 460, mx: { xs: 'auto', md: 0 } }}>
            Keep your streak alive on the go — episodes, books, flashcards and daily goals, all synced with your account.
          </Typography>

          <AppLaunchSignup />
        </Box>

        {/* phone mockup (webp, sized for its slot) */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
          <Box
            sx={{
              position: 'relative',
              width: { xs: 'min(58vw, 240px)', md: 'min(100%, 290px)' },
              aspectRatio: '1245 / 2359',
              filter: 'drop-shadow(0 26px 40px rgba(0,0,0,0.5))',
            }}
          >
            <Image
              src="/homepage/app-mockup.webp"
              alt="ArabicWithM mobile app home screen"
              fill
              sizes="(max-width: 900px) 58vw, 290px"
              style={{ objectFit: 'contain' }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
