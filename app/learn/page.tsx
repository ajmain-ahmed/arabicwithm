import Link from 'next/link'
import { Box, Container, Typography } from '@mui/material'
import { AccountTreeOutlined, GridOnRounded, PsychologyOutlined } from '@mui/icons-material'
import { LEARN_ITEMS } from '@/app/lib/navigation'

export const metadata = { title: 'Learn | ArabicWithM' }
const icons = [PsychologyOutlined, AccountTreeOutlined, GridOnRounded]

export default function LearnPage() {
  return <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
    <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 42 }, mb: 3 }}>Learn</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
      {LEARN_ITEMS.map((item, index) => { const Icon = icons[index]; return <Link key={item.route} href={item.route} style={{ color: 'inherit', textDecoration: 'none' }}><Box sx={{ height: '100%', boxSizing: 'border-box', p: 3, borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-forest) 20%, transparent)', bgcolor: 'var(--awm-white)', color: 'var(--awm-bark)', textDecoration: 'none', '&:hover, &:focus-visible': { outline: '2px solid var(--awm-forest)', outlineOffset: 2 } }}>
        <Icon sx={{ color: 'var(--awm-forest)', fontSize: 30, mb: 2 }} />
        <Typography component="h2" sx={{ fontSize: 22, mb: 1 }}>{item.label}</Typography>
        <Typography sx={{ fontSize: 14, color: 'var(--awm-muted)' }}>{item.description}</Typography>
      </Box></Link> })}
    </Box>
  </Container>
}
