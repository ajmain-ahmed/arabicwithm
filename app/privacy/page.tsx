import { Box, Container, Divider, Typography } from '@mui/material'

export const metadata = { title: 'Privacy Policy | ArabicWithM' }

const SECTION_PROPS = { component: 'h2' as const, sx: { mt: 4, mb: 1.25, fontFamily: 'var(--font-heading)', fontSize: { xs: 20, md: 23 }, fontWeight: 600, color: 'var(--awm-bark)' } }
const BODY = { sx: { fontFamily: 'var(--font-sans), sans-serif', fontSize: 15, lineHeight: 1.75, color: 'var(--awm-bark)', mb: 1.25, '& a': { color: 'var(--awm-gold)', textDecoration: 'underline' } } }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section">
      <Typography {...SECTION_PROPS}>{title}</Typography>
      {children}
    </Box>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <Typography {...BODY}>{children}</Typography>
}

export default function PrivacyPolicyPage() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Legal</Typography>
        <Typography component="h1" sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 42 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
          Privacy Policy
        </Typography>
        <Typography {...BODY} sx={{ ...BODY.sx, color: 'var(--awm-muted)', mt: 1 }}>
          Last updated: 14 October 2026 · Contact: <a href="mailto:hello@arabicwithm.com">hello@arabicwithm.com</a>
        </Typography>
        <Divider sx={{ borderColor: 'color-mix(in srgb, var(--awm-gold) 20%, transparent)', my: 3 }} />

        <Section title="1. Who we are">
          <P>ArabicWithM (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a language-learning website that helps you learn Arabic through cartoons with interactive transcripts and original graded books. This policy explains what personal data we collect when you use the service, why, and your rights over it.</P>
        </Section>

        <Section title="2. What we collect">
          <P><strong>Account information.</strong> When you register, we store your email address and a password hash (handled by our authentication provider, Supabase). If you sign in with Google, we receive your name, email address and profile picture from Google. You may optionally add a display name.</P>
          <P><strong>Learning activity.</strong> To power your progress tracking (streaks, XP, levels, weekly goals), we record: time spent actively watching or reading, the number of words you look up, flashcard reviews, word-search puzzle completions and grammar exercise activity. This data is tied to your account.</P>
          <P><strong>Saved content.</strong> Practice words you save, reading positions and bookmarks are stored against your account so they follow you between devices.</P>
          <P><strong>Content you submit.</strong> Feedback you send, corrections or comments you submit for review, and messages you write to us.</P>
          <P><strong>Support payments.</strong> Donations and AWM+ subscriptions are processed by Stripe. We never see or store your card number — only your subscription status and Stripe customer reference.</P>
          <P><strong>Technical data.</strong> We use essential cookies to keep you signed in, and your browser&rsquo;s local storage for interface preferences (such as dark mode) and offline reading position. Requests are rate-limited using your IP address, which is not retained.</P>
        </Section>

        <Section title="3. What we do not do">
          <P>We do not show advertising, we do not use analytics or tracking pixels, and we never sell or rent personal data to anyone.</P>
        </Section>

        <Section title="4. Third-party services">
          <P>Your data is stored and processed by <strong>Supabase</strong> (database and authentication, hosted in the EU) and the site is hosted on <strong>Vercel</strong>. Cartoons are embedded from <strong>YouTube</strong>: when you press play, YouTube&rsquo;s own player and privacy policy apply, and Google may collect interaction data. If you choose &ldquo;Sign in with Google&rdquo;, Google shares your profile information with us as described above. Payments are handled by <strong>Stripe</strong> under Stripe&rsquo;s own privacy terms.</P>
        </Section>

        <Section title="5. Your rights">
          <P>You can ask us at any time to access, correct, export or delete your personal data — including everything listed in section 2 — by emailing <a href="mailto:hello@arabicwithm.com">hello@arabicwithm.com</a>. Deleting your account removes your learning history, saved words and bookmarks. You can opt out of a public learning profile (if you have enabled one) in your settings at any time.</P>
        </Section>

        <Section title="6. Children">
          <P>ArabicWithM is a general-audience educational service and is not directed at children under 13. If you believe a child has created an account, contact us and we will delete it and its associated data.</P>
        </Section>

        <Section title="7. Security and retention">
          <P>Traffic is encrypted in transit (TLS). Database access is restricted to server-side code through row-level security and a privileged key that never reaches your browser. We keep your data for as long as your account exists; if you close your account, associated learning data is deleted within 30 days.</P>
        </Section>

        <Section title="8. Changes">
          <P>If we change this policy, we will update the date above. For significant changes we will notify you by email or a notice on the site.</P>
        </Section>
      </Container>
    </Box>
  )
}
