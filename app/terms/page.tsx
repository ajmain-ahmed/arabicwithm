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
    <Box component="div" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Legal</Typography>
        <Typography component="h1" sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 42 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
          Terms of Service
        </Typography>
        <Typography {...BODY} sx={{ ...BODY.sx, color: 'var(--awm-muted)', mt: 1 }}>
          Last updated: 11 November 2026 · Contact: <a href="mailto:support@arabicwithm.com">support@arabicwithm.com</a>
        </Typography>
        <Divider sx={{ borderColor: 'color-mix(in srgb, var(--awm-gold) 20%, transparent)', my: 3 }} />

        <Section title="1. Acceptance">
          <P>By creating an account or using ArabicWithM, you agree to these terms. If you do not agree, please do not use the service.</P>
        </Section>

        <Section title="2. The service">
          <P>ArabicWithM provides Arabic-learning tools including interactive transcripts, vocabulary aids, grammar exercises, graded books, optional audio, flashcards and puzzles. Some features require an account, a paid AWM+ subscription or a complimentary access grant. Features and content may change as the service develops.</P>
        </Section>

        <Section title="3. Accounts and profiles">
          <P>Keep your sign-in credentials confidential, provide an accurate email address and do not share your account. You are responsible for activity under your account and for content you choose to make public.</P>
          <P>You can manage your public-profile and reading-sharing settings on the site. You may ask us to delete your account by contacting <a href="mailto:support@arabicwithm.com">support@arabicwithm.com</a>. Account deletion does not by itself stop future subscription payments, so cancel any active renewal in your billing settings first or contact us for assistance.</P>
        </Section>

        <Section title="4. Acceptable use">
          <P>You agree not to scrape, crawl or bulk-download the site or its data (including transcripts and word lists) by automated means; bypass access controls or usage limits; probe, disrupt or overload the service; use it for anything unlawful; or submit content that is unlawful, abusive, misleading or infringes someone else&rsquo;s rights. We may restrict or suspend accounts that abuse the service or put other users at risk.</P>
        </Section>

        <Section title="5. Content and intellectual property">
          <P><strong>Content we create.</strong> Our original books, transcripts, translations, vocabulary lists, grammar exercises, illustrations, branding and puzzle data are owned by ArabicWithM or used under licence. We grant you a personal, non-exclusive, non-transferable licence to use them for your own learning. You may not copy, redistribute, republish, sell or create derivative works from them without written permission.</P>
          <P><strong>External media.</strong> Cartoon episodes and other embedded media belong to their respective owners and licensors. They are provided through external platforms for educational commentary and language instruction. We claim no ownership of, affiliation with, or endorsement by the underlying shows or rights holders.</P>
          <P><strong>Availability.</strong> External media may become unavailable, region-locked or removed by its uploader, platform or rights holder. We cannot guarantee continued availability of any particular episode or third-party feature.</P>
        </Section>

        <Section title="6. Your submissions and public content">
          <P>Feedback, reviews, corrections and other content you submit may be reviewed by our team and used to improve the service. You grant us a perpetual, royalty-free licence to use submissions for that purpose. You retain ownership of your submissions, but must have the right to share them.</P>
          <P>If you make a profile or reading activity public, you allow that information to be viewed and shared by others. Do not publish personal or confidential information that you do not want visible.</P>
        </Section>

        <Section title="7. Payments, subscriptions and support contributions">
          <P>AWM+ subscriptions and one-time support contributions are processed by our payment provider under its own terms. The price and billing interval are shown before you pay. Subscriptions renew automatically until cancelled.</P>
          <P>You can cancel the next renewal at any time through your billing settings and keep AWM+ access until the end of the paid period. Turning renewal back on restores future billing for the same subscription. If a renewal payment fails, you may need to update your payment method; access after the paid period depends on the confirmed subscription status.</P>
          <P>One-time support contributions are not subscriptions. Refund requests are reviewed case by case and are subject to any rights you have under applicable consumer law. Contact <a href="mailto:support@arabicwithm.com">support@arabicwithm.com</a> for billing help.</P>
        </Section>

        <Section title="8. Disclaimer and liability">
          <P>The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind. We do not warrant particular learning outcomes, uninterrupted operation or continued availability of any content.</P>
          <P>To the extent permitted by law, our total liability for a claim relating to the service is limited to the amount you paid us in the 12 months before the claim, or £10 if you paid nothing. Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot lawfully be excluded. Your statutory consumer rights are not affected.</P>
        </Section>

        <Section title="9. Copyright complaints">
          <P>Rights holders who believe their work is used on ArabicWithM in a way that infringes their rights, including through embedded media, can contact <a href="mailto:support@arabicwithm.com">support@arabicwithm.com</a> with the relevant work, location and evidence. We will review valid requests promptly and may remove or disable access to the relevant material.</P>
        </Section>

        <Section title="10. Changes and governing law">
          <P>We may update these terms from time to time, and the date above shows the current version. Material changes may be communicated by email or a notice on the site. Continued use after changes means you accept the updated terms.</P>
          <P>These terms are governed by the laws of England and Wales, and disputes are subject to the jurisdiction of its courts, subject to any mandatory rights you have as a consumer in your place of residence.</P>
        </Section>
      </Container>
    </Box>
  )
}
