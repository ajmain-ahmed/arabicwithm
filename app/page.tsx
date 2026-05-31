import { getAllLevels } from './lib/study'
import Navbar from './components/navbar'
import HomeHero from './components/HomeHero'
import CefrLevelsSection from './components/CefrLevelsSection'
import ChooseYourPath from './components/ChooseYourPath'
import CartoonSection from './components/CartoonSection'
import StudySection from './components/StudySection'

/* ─────────────────────────────────────────────
   Global CSS — system fonts only
───────────────────────────────────────────── */
const PAGE_CSS = `
  :root {
    --bark:   #2c1a0e;
    --forest: #0e2e1f;
    --gold:   #b8860b;
    --gold-lt:#d4a843;
    --muted:  #7a6e65;
    --font-serif: Georgia, "Times New Roman", serif;
    --font-sans:  system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  html, body { background: #fff; margin: 0; }

  @keyframes heroZoom {
    from { transform: scale(1.04); }
    to   { transform: scale(1); }
  }

  /* Pill shape for every MUI button on this page */
  .MuiButton-root {
    border-radius: 9999px !important;
  }
`

export default async function HomePage() {
  const levels = await getAllLevels()

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Navbar />

      <main style={{ background: '#fff', minHeight: '100vh' }}>
        <HomeHero />
        <CefrLevelsSection levels={levels} />
        <ChooseYourPath />
        <CartoonSection />
        <StudySection />
      </main>
    </>
  )
}
