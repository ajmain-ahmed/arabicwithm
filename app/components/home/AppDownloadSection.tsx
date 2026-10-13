import { Box, Button, Typography } from '@mui/material'
import { Apple, QrCodeScanner } from '@mui/icons-material'

/* The Google Play mark (MUI has no brand icon) — single colour via
   currentColor so it follows each button's foreground. */
function GooglePlayIcon({ fontSize = 24 }: { fontSize?: number }) {
  return (
    <svg width={fontSize} height={fontSize} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <path
        fill="currentColor"
        d="M4.3 2.6v18.8c0 .9 1 1.5 1.8 1l15.3-9.4c.7-.4.7-1.5 0-1.9L6.1 1.6c-.8-.5-1.8.1-1.8 1Z"
      />
    </svg>
  )
}

/* Placeholder QR (fake code until the real store link exists). Deterministic
   pattern so server and client render identical modules. */
function FakeQr({ size = 116 }: { size?: number }) {
  const modules = 21
  const cells: boolean[] = []
  let seed = 42
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7)
  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      cells.push(inFinder(x, y) ? false : rand() > 0.52)
    }
  }
  const cell = size / modules
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx * cell} y={fy * cell} width={cell * 7} height={cell * 7} fill="#1a0f08" />
      <rect x={(fx + 1) * cell} y={(fy + 1) * cell} width={cell * 5} height={cell * 5} fill="#fff" />
      <rect x={(fx + 2) * cell} y={(fy + 2) * cell} width={cell * 3} height={cell * 3} fill="#1a0f08" />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code placeholder" style={{ display: 'block' }}>
      <rect width={size} height={size} fill="#fff" />
      {cells.map((on, i) => {
        if (!on) return null
        const x = i % modules
        const y = Math.floor(i / modules)
        return <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill="#1a0f08" />
      })}
      {finder(0, 0)}
      {finder(modules - 7, 0)}
      {finder(0, modules - 7)}
    </svg>
  )
}

function StoreButton({ store, label, sub, dark }: { store: 'apple' | 'google'; label: string; sub: string; dark?: boolean }) {
  /* Colours via inline style: MUI's containedPrimary state class can beat
     sx in dark mode, which produced white-on-white text. */
  const fg = dark ? '#fff' : '#1a0f08'
  const bg = dark ? '#0b0b0c' : '#ffffff'
  return (
    <Button
      component="a"
      href="#download-app"
      onClick={(event) => event.preventDefault()}
      startIcon={store === 'apple' ? <Apple sx={{ fontSize: 26, color: fg }} /> : <Box component="span" sx={{ color: fg, display: 'flex', mr: -0.25 }}><GooglePlayIcon fontSize={22} /></Box>}
      style={{ backgroundColor: bg, color: fg }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2.25,
        py: 1,
        minHeight: 52,
        borderRadius: '12px',
        textTransform: 'none',
        textAlign: 'left',
        border: dark ? '1px solid rgba(255,255,255,0.16)' : 'none',
        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        transition: 'transform .18s ease, box-shadow .18s ease',
        '&:hover': { backgroundColor: dark ? '#17171a' : '#ffffff', transform: 'translateY(-2px)', boxShadow: '0 10px 26px rgba(0,0,0,0.32)' },
      }}
    >
      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <Box component="span" sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10.5, opacity: 0.75, letterSpacing: '0.02em' }}>{label}</Box>
        <Box component="span" sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 15.5, fontWeight: 700 }}>{sub}</Box>
      </Box>
    </Button>
  )
}

/* Shazam-inspired app banner in the ArabicWithM palette: deep forest surface
   with cream type and gold accents. Layout stacks on mobile like the mobile
   reference: copy → scan card → buttons → phone. */
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

          {/* scan card */}
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2, p: 1.5, pr: 2.5, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', maxWidth: 420, mx: { xs: 'auto', md: 0 }, textAlign: 'left' }}>
            <Box sx={{ p: 0.75, borderRadius: '12px', bgcolor: '#fff', flexShrink: 0, lineHeight: 0 }}>
              <FakeQr size={104} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#f5ede0' }}>
                <QrCodeScanner sx={{ fontSize: 19, color: '#d4a843' }} />
                <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600 }}>Get the app</Typography>
              </Box>
              <Typography sx={{ mt: 0.5, color: 'rgba(245,237,224,0.72)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, lineHeight: 1.55 }}>
                Scan the code with your phone camera to download the free app.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
            <StoreButton store="apple" label="Download on the" sub="App Store" dark />
            <StoreButton store="google" label="Get it on" sub="Google Play" />
          </Box>
        </Box>

        {/* phone mockup */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
          <Box
            component="img"
            src="/homepage/app-mockup.png"
            alt="ArabicWithM mobile app home screen"
            sx={{
              width: { xs: 'min(58vw, 240px)', md: 'min(100%, 290px)' },
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
