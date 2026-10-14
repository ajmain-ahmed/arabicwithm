import { Box, Container, Divider, Typography } from '@mui/material'

export const metadata = { title: 'Terms of Service | ArabicWithM' }

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

export default function TermsOfServicePage() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Legal</Typography>
        <Typography component="h1" sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 42 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
          Terms of Service
        </Typography>
        <Typography {...BODY} sx={{ ...BODY.sx, color: 'var(--awm-muted)', mt: 1 }}>
          Last updated: 14 October 2026 · Contact: <a href="mailto:hello@arabicwithm.com">hello@arabicwithm.com</a>
        </Typography>
        <Divider sx={{ borderColor: 'color-mix(in srgb, var(--awm-gold) 20%, transparent)', my: 3 }} />

        <Section title="1. Acceptance">
          <P>By creating an account or using ArabicWithM you agree to these terms. If you do not agree, please do not use the service.</P>
        </Section>

        <Section title="2. The service">
          <P>ArabicWithM provides Arabic-learning tools: interactive transcripts, vocabulary aids and grammar exercises built around cartoon episodes, original graded books with audio, flashcards and word-search puzzles. Some features (such as downloads and extended practice) require a paid AWM+ subscription or administrator grant.</P>
        </Section>

        <Section title="3. Intellectual property">
          <P><strong>Our content.</strong> The graded books, transcripts and subtitles, translations, vocabulary lists, grammar exercises, illustrations and puzzle data on ArabicWithM are original works owned by ArabicWithM. We grant you a personal, non-exclusive, non-transferable licence to use them for your own learning. You may not copy, redistribute, republish, sell or create derivative works from them without our written permission.</P>
          <P><strong>Cartoon videos.</strong> The cartoon episodes themselves are the property of their respective owners and licensors. They are embedded from YouTube for educational commentary and language instruction; we do not host video files and claim no ownership of, or affiliation with, the underlying shows or their rights holders. Embedding is not endorsement by the rights holder.</P>
          <P><strong>Availability of third-party videos.</strong> Because videos stream from YouTube, an episode may become unavailable, region-locked or removed at any time by its uploader or rights holder, and we cannot guarantee continued availability of any specific episode.</P>
        </Section>

        <Section title="4. Acceptable use">
          <P>You agree not to: scrape, crawl or bulk-download the site or its data (including transcripts and word lists) by automated means; probe, disrupt or overload the service; share your account; use the service for anything unlawful; or submit feedback, corrections or comments that are unlawful, abusive or infringe someone else&rsquo;s rights. We may suspend accounts that abuse the service.</P>
        </Section>

        <Section title="5. Accounts">
          <P>Keep your sign-in credentials confidential and provide an accurate email address. You are responsible for activity under your account. You can delete your account at any time by contacting us.</P>
        </Section>

        <Section title="6. Your submissions">
          <P>Feedback, corrections and comments you submit may be reviewed by our team and used to improve the service. You grant us a perpetual, royalty-free licence to use your submissions for that purpose. You retain ownership of your submissions, but do not submit material you have no right to share.</P>
        </Section>

        <Section title="7. Payments and subscriptions">
          <P>AWM+ subscriptions and support payments are processed by Stripe and are also subject to Stripe&rsquo;s terms. Subscriptions renew automatically until cancelled; you can cancel at any time and keep access until the end of the paid period. Refunds are handled case by case — contact us.</P>
        </Section>

        <Section title="8. Disclaimer and liability">
          <P>The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind. We do not warrant that learning outcomes will be achieved or that any content will remain available. To the extent permitted by law, our total liability for any claim relating to the service is limited to the amount you have paid us in the 12 months before the claim, or £10 if you have paid nothing.</P>
        </Section>

        <Section title="9. Copyright complaints">
          <P>Rights holders who believe their work is used on ArabicWithM in a way that infringes their rights (including embedded videos) can contact <a href="mailto:hello@arabicwithm.com">hello@arabicwithm.com</a> with the details and we will review and act on valid requests promptly, including removing access to the relevant material.</P>
        </Section>

        <Section title="10. Changes and governing law">
          <P>We may update these terms from time to time; the date above shows the current version. Continued use after changes means you accept the updated terms. These terms are governed by the laws of England and Wales, and disputes are subject to the jurisdiction of its courts.</P>
        </Section>
      </Container>
    </Box>
  )
}
