import Link from 'next/link'
import { ArrowBack, OpenInNew } from '@mui/icons-material'
import { Box, Button, Container, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { PuzzleVocabularySource } from '@/app/lib/transcriptPuzzles'

export default function GamePageShell({ title, intro, source, controls, children }: { title: string; intro: string; source: PuzzleVocabularySource | null; controls?: ReactNode; children: ReactNode }) {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 8, md: 10 } }}>
      <Box sx={{ bgcolor: 'var(--awm-forest)', color: '#fff', pt: { xs: 3, md: 5 }, pb: { xs: 4, md: 5 } }}>
        <Container maxWidth="lg">
          <Button component={Link} href="/" startIcon={<ArrowBack />} sx={{ color: 'rgba(255,255,255,.82)', px: 0, textTransform: 'none' }}>Back home</Button>
          <Typography component="h1" sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: { xs: 36, md: 52 }, fontWeight: 600 }}>{title}</Typography>
          <Typography sx={{ mt: 0.75, maxWidth: 720, color: 'rgba(255,255,255,.72)', fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>{intro}</Typography>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 4 } }}>
        {source && (
          <Paper elevation={0} sx={{ mb: 2.5, p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '12px', bgcolor: 'var(--awm-white)' }}>
            <Box>
              <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Based on a real transcript</Typography>
              <Typography sx={{ mt: 0.25, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600 }}>{source.showTitle} · {source.episodeTitle}</Typography>
            </Box>
            <Button component={Link} href={`/cartoons/${encodeURIComponent(source.showSlug)}/${encodeURIComponent(source.episodeSlug)}`} endIcon={<OpenInNew />} sx={{ color: 'var(--awm-forest)', textTransform: 'none', flexShrink: 0 }}>Open episode</Button>
          </Paper>
        )}
        {controls}
        {children}
      </Container>
    </Box>
  )
}
