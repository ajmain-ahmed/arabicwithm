import type { Metadata } from 'next'
import { CheckCircleRounded, FavoriteRounded, InfoOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material'
import SupportForm from './SupportForm'
import { verifySupportCheckout, type SupportCheckoutStatus } from '@/app/lib/supportPayments'

export const metadata: Metadata = {
  title: 'Support Us — Arabic with M',
  description: 'Support the creation of thoughtful Arabic learning resources.',
}

export const dynamic = 'force-dynamic'

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ support?: string | string[]; session_id?: string | string[] }>
}) {
  const query = await searchParams
  const support = Array.isArray(query.support) ? query.support[0] : query.support
  const sessionId = Array.isArray(query.session_id) ? query.session_id[0] : query.session_id
  let checkoutStatus: SupportCheckoutStatus | null = null
  if (support === 'success' && sessionId) checkoutStatus = await verifySupportCheckout(sessionId)

  return (
    <Box component="main" sx={{ minHeight: '75vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        {checkoutStatus === 'paid' && (
          <Alert icon={<CheckCircleRounded />} severity="success" action={<Button href="/" color="inherit" size="small" sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}>Return home</Button>} sx={{ mb: 3, borderRadius: '12px' }}>
            Thank you. Your contribution was received and will help Arabic with M keep creating useful learning resources.
          </Alert>
        )}
        {checkoutStatus === 'pending' && (
          <Alert icon={<InfoOutlined />} severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
            Your payment is still being confirmed by Stripe. Please check again shortly.
          </Alert>
        )}
        {support === 'success' && checkoutStatus === 'invalid' && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
            We could not verify that Checkout session. No payment confirmation has been recorded on this page.
          </Alert>
        )}
        {support === 'cancelled' && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
            Checkout was cancelled. You have not been charged and can return whenever you are ready.
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(360px, .75fr)' }, gap: { xs: 3, md: 6 }, alignItems: 'center' }}>
          <Box sx={{ py: { xs: 1, md: 4 } }}>
            <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: '14px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', color: 'var(--awm-gold)' }}>
              <FavoriteRounded sx={{ fontSize: 28 }} />
            </Box>
            <Typography component="h1" sx={{ mt: 2, color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 40, sm: 52, md: 60 }, fontWeight: 600, lineHeight: 1.05 }}>
              Support Arabic with M
            </Typography>
            <Typography sx={{ mt: 2, maxWidth: 650, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 16, sm: 18 }, lineHeight: 1.75 }}>
              Arabic with M turns stories, cartoons and carefully graded reading into practical learning experiences. Contributions help fund content production, platform hosting, development, infrastructure and the learning tools behind those resources.
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: 650, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.7 }}>
              Support is entirely optional. Every contribution helps us expand the book and video library, improve the learning experience and keep investing in the services needed to deliver high-quality Arabic content.
            </Typography>
          </Box>

          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '18px', bgcolor: 'var(--awm-white)', boxShadow: '0 18px 50px color-mix(in srgb, var(--awm-bark) 8%, transparent)' }}>
            <SupportForm />
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}
