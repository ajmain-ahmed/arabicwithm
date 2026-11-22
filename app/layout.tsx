import type { Metadata } from "next"
import Script from 'next/script'
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter"
import {
  brandFont,
  headingFont,
  jost,
} from "@/app/lib/fonts"
import "./globals.css"
import ThemeProvider from "./components/ThemeProvider"
import { AuthProvider } from "./AuthContext"
import SiteShell from "./components/SiteShell"
import ScrollReset from "./components/ScrollReset"
import VitalsReporter from "./components/VitalsReporter"
import StructuredData from "./components/StructuredData"
import { SITE_URL } from "./lib/seo"

const socialImage = {
  url: 'https://whbxgwucsoguqzpnpzjd.supabase.co/storage/v1/object/public/covers/social/arabicwithm-cinematic-collage-0e25039c3908.jpg',
  width: 1200,
  height: 630,
  alt: 'ArabicWithM — Watch, Read, Learn: cinematic character collage surrounding the ArabicWithM logo.',
}

export const metadata: Metadata = {
  applicationName: 'ArabicWithM',
  appleWebApp: { capable: true, title: 'ArabicWithM', statusBarStyle: 'default' },
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  title: {
    default: "ArabicWithM — Learn Arabic with Cartoons, Books & Audiobooks",
    template: "%s | ArabicWithM",
  },
  description: "Learn Modern Standard Arabic through interactive cartoon transcripts, graded books, sentence-synced audiobooks, and practical learning activities.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "ArabicWithM — Learn Arabic with Cartoons, Books & Audiobooks",
    description: "Learn Arabic through interactive transcripts, graded books, audiobooks, and practical learning activities.",
    url: "/",
    siteName: "ArabicWithM",
    type: "website",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArabicWithM — Learn Arabic with Cartoons, Books & Audiobooks",
    description: "Learn Arabic through interactive transcripts, graded books, audiobooks, and practical learning activities.",
    images: [{ url: socialImage.url, alt: socialImage.alt }],
  },
}

export const viewport = {
  themeColor: '#046154',
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        {/* Keep these global links present even when page metadata streams. */}
        <link rel="manifest" href="/site.webmanifest" />
        {/* Next 16 emits the standard mobile-web-app-capable tag; iOS also
            needs the Apple form when opening a saved Home Screen bookmark. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Independent of the app bundle so a failed deployment chunk has a recovery UI. */}
        <script src="/startup-recovery.js" defer />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#046154" />
        <Script id="awm-gtm-init" strategy="lazyOnload">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
        `}</Script>
        <Script id="awm-gtm-container" strategy="lazyOnload" src="https://www.googletagmanager.com/gtm.js?id=GTM-WLD4QMF2" />
        <StructuredData data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'ArabicWithM', url: SITE_URL,
              logo: `${SITE_URL}/android-chrome-512x512.png`,
              sameAs: ['https://www.instagram.com/arabicwithem/', 'https://www.tiktok.com/@arabicwithm', 'https://www.youtube.com/@arabicwithm'],
            },
            { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'ArabicWithM', url: SITE_URL, publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'en' },
          ],
        }} />
      </head>
      <body
        className={`${jost.variable} ${brandFont.variable} ${headingFont.variable}`}
      >
        <AppRouterCacheProvider options={{ key: 'css', enableCssLayer: true }}>
          <AuthProvider>
            <ThemeProvider>
              <ScrollReset />
              <VitalsReporter />
              <SiteShell>{children}</SiteShell>
            </ThemeProvider>
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
