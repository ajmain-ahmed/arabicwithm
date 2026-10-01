import { ArrowBack, OpenInNew } from '@mui/icons-material'
import { Box, Button, Container, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { PuzzleVocabularySource } from '@/app/lib/transcriptPuzzles'

export default function GamePageShell({ title, intro, source, controls, children }: { title: string; intro: string; source: PuzzleVocabularySource | null; controls?: ReactNode; children: ReactNode }) {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 8, md: 10 } }}>
      <Box sx={(theme) => ({ color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#fff', pt: { xs: 3, md: 5 }, pb: { xs: 4, md: 5 }, bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.awm.forest, backgroundImage: theme.palette.mode === 'dark' ? `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.background.default})` : `linear-gradient(135deg, ${theme.palette.awm.forest}, ${theme.palette.awm.barkDark})`, borderBottom: '1px solid', borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : 'rgba(255,255,255,.08)', boxShadow: theme.palette.mode === 'dark' ? '0 10px 28px rgba(0,0,0,.22)' : 'none' })}>
        <Container maxWidth="xl">
          <Button href="/" startIcon={<ArrowBack />} sx={(theme) => ({ color: theme.palette.mode === 'dark' ? theme.palette.text.secondary : 'rgba(255,255,255,.82)', px: 0 })}>Back home</Button>
          <Typography component="h1" sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: { xs: 36, md: 52 }, fontWeight: 600 }}>{title}</Typography>
          <Typography sx={(theme) => ({ mt: 0.75, maxWidth: 720, color: theme.palette.mode === 'dark' ? theme.palette.text.secondary : 'rgba(255,255,255,.72)', fontFamily: 'Jost, sans-serif', lineHeight: 1.6 })}>{intro}</Typography>
        </Container>
      </Box>
      <Container maxWidth="xl" sx={{ pt: { xs: 2.5, md: 4 } }}>
        {source && (
          <Paper elevation={0} sx={{ mb: 2.5, p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}>
            <Box>
              <Typography sx={{ color: 'primary.main', fontFamily: 'Jost, sans-serif', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Based on a real {source.type === 'book' ? 'book chapter' : 'transcript'}</Typography>
              <Typography sx={{ mt: 0.25, color: 'text.primary', fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 600 }}>{source.title} · {source.subtitle}</Typography>
            </Box>
            <Button color="secondary" href={source.href} endIcon={<OpenInNew />} sx={{ flexShrink: 0 }}>Open {source.type === 'book' ? 'chapter' : 'episode'}</Button>
          </Paper>
        )}
        {controls}
        {children}
      </Container>
    </Box>
  )
}
