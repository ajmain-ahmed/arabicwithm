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
    <Box component="div" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Legal</Typography>
        <Typography component="h1" sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 42 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
          Privacy Policy
        </Typography>
        <Typography {...BODY} sx={{ ...BODY.sx, color: 'var(--awm-muted)', mt: 1 }}>
          Last updated: 11 November 2026 · Contact: <a href="mailto:support@arabicwithm.com">support@arabicwithm.com</a>
        </Typography>
        <Divider sx={{ borderColor: 'color-mix(in srgb, var(--awm-gold) 20%, transparent)', my: 3 }} />

        <Section title="1. Who we are">
          <P>ArabicWithM (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a language-learning website offering interactive cartoons, graded books, audio and learning activities. This policy explains what personal data we collect when you use the service, why we use it, and the choices and rights you have.</P>
        </Section>

        <Section title="2. Information we collect">
          <P><strong>Account information.</strong> When you register, we store your email address and authentication credentials. Passwords are handled by our authentication provider and are not stored by us in plain text. If you sign in with a social account, we may receive your name, email address and profile picture.</P>
          <P><strong>Profile information.</strong> You may provide a display name, username, avatar and banner image. Your profile visibility and reading-sharing preferences are also stored.</P>
          <P><strong>Learning and saved content.</strong> We record active learning time, word lookups, flashcard reviews, grammar and puzzle activity, streaks and goals. We store your saved words, My List selections, reading positions, bookmarks and audiobook progress so they can follow you between devices.</P>
          <P><strong>Content and communications.</strong> We retain feedback, reviews, corrections and other content you submit, as well as messages you send to us and our responses.</P>
          <P><strong>Payment information.</strong> Our payment processor handles your card and billing details. We do not see or store your full card number. We may receive your customer reference, payment and subscription status, amounts paid, and renewal or cancellation dates.</P>
          <P><strong>Technical and usage information.</strong> We may process your IP address, browser and device information, pages visited, interactions, diagnostic events and security logs. Essential cookies keep you signed in and protect the service. Browser storage also holds preferences, playback settings, guest usage allowances and temporary reading or feed state.</P>
        </Section>

        <Section title="3. How we use information">
          <P>We use information to provide and personalise the service, maintain your learning history, process payments, deliver account and service messages, respond to enquiries, improve content and features, keep the service secure, prevent abuse, and meet legal or accounting obligations.</P>
          <P>Depending on the activity and your location, our legal bases include performing our contract with you, our legitimate interests in operating and improving the service, compliance with legal obligations, and consent where the law requires it.</P>
        </Section>

        <Section title="4. Public profiles and sharing">
          <P>You can control whether your learning profile is public and whether reading activity is shared. A public profile may show your display name, username, avatar, banner, learning summary and any bookshelf content you choose to share. Your email address and private learning history are not made public through this feature.</P>
          <P>Public information can be viewed, shared or indexed by others. You can turn off public visibility or reading sharing in your profile settings.</P>
        </Section>

        <Section title="5. Service providers and external content">
          <P>We use service providers for hosting, authentication, data storage, email delivery, payment processing, security and analytics. They receive only the information needed to perform their services for us and under their own legal obligations.</P>
          <P>When an embedded video or other external media loads, the external platform may receive your IP address, device information and interaction data under its own privacy terms. Social sign-in is similarly governed by the provider you choose.</P>
          <P>We do not sell or rent your personal data. We do not show third-party advertising profiles based on your learning activity.</P>
        </Section>

        <Section title="6. International processing">
          <P>Some service providers may process information outside your country, including outside the United Kingdom or European Economic Area. Where required, international transfers use an appropriate legal safeguard, such as an adequacy decision or approved contractual protections.</P>
        </Section>

        <Section title="7. Security and retention">
          <P>We use encrypted connections, access controls and server-side permission checks to protect information. No online service is completely secure, so we cannot guarantee absolute security.</P>
          <P>We generally keep account and learning information while your account is active. When you ask us to delete your account, we delete or anonymise associated profile and learning data, subject to anything we must retain for legal, accounting, fraud-prevention or security reasons. Payment records may be retained separately for those purposes. Operational logs and backups may take a limited additional period to expire.</P>
        </Section>

        <Section title="8. Your rights and choices">
          <P>Depending on your location, you may have rights to access, correct, export, delete, restrict or object to our use of your personal data, and to withdraw consent where processing is based on consent. You can also complain to your local data-protection authority.</P>
          <P>You can manage profile visibility and several preferences on the site. For access, export, correction or deletion requests, email <a href="mailto:support@arabicwithm.com">support@arabicwithm.com</a>. We may need to verify that the request relates to your account before acting on it.</P>
        </Section>

        <Section title="9. Children">
          <P>ArabicWithM is a general-audience educational service and is not directed at children under 13. If you believe a child under 13 has created an account, contact us so we can review and delete the account and associated data.</P>
        </Section>

        <Section title="10. Changes and contact">
          <P>If we change this policy, we will update the date above. For significant changes, we may notify you by email or display a notice on the site. Questions about this policy or your data can be sent to <a href="mailto:support@arabicwithm.com">support@arabicwithm.com</a>.</P>
        </Section>
      </Container>
    </Box>
  )
}
