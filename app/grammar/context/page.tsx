import { Box, Container, Typography } from '@mui/material'
import Button from '@/app/components/RouteButton'
export const metadata = { title: 'Grammar in Context | ArabicWithM' }
export default function Page() {
  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Button href="/grammar">Back to Grammar</Button>
    <Typography component="h1" variant="h3" sx={{ my: 3 }}>Grammar in Context</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
      {['A1','A2','B1','B2','C1','C2'].map(level => <Button href={`/grammar/context/${level}`} key={level} variant="outlined" sx={{ minHeight: 64 }}>{level}</Button>)}
    </Box>
  </Container>
}
