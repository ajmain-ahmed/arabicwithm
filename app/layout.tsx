import type { Metadata } from "next"
import Script from 'next/script'
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter"
import {
  bookAmiriFont,
  bookNaskhFont,
  bookSansFont,
  brandFont,
  ebGaramond,
  headingFont,
  jost,
} from "@/app/lib/fonts"
import "./globals.css"
import ThemeProvider from "./components/ThemeProvider"
import { AuthProvider } from "./AuthContext"
import SiteShell from "./components/SiteShell"
import ScrollReset from "./components/ScrollReset"
import VitalsReporter from "./components/VitalsReporter"

const socialImage = {
  url: 'https://whbxgwucsoguqzpnpzjd.supabase.co/storage/v1/object/public/covers/social/arabicwithm-cinematic-collage-0e25039c3908.jpg',
  width: 1200,
  height: 630,
  alt: 'ArabicWithM — Watch, Read, Learn: cinematic character collage surrounding the ArabicWithM logo.',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.arabicwithm.com'),
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
  title: "ArabicWithM — Learn Arabic with Cartoons",
  description: "Master Arabic through immersive cartoons with interactive subtitles.",
  openGraph: {
    title: "ArabicWithM — Learn Arabic with Cartoons",
    description: "Master Arabic through immersive cartoons with interactive subtitles.",
    siteName: "ArabicWithM",
    type: "website",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArabicWithM — Learn Arabic with Cartoons",
    description: "Master Arabic through immersive cartoons with interactive subtitles.",
    images: [{ url: socialImage.url, alt: socialImage.alt }],
  },
}

export const viewport = {
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
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#046154" />
        <Script id="awm-gtm-init" strategy="lazyOnload">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
        `}</Script>
        <Script id="awm-gtm-container" strategy="lazyOnload" src="https://www.googletagmanager.com/gtm.js?id=GTM-WLD4QMF2" />
      </head>
      <body
        className={`${ebGaramond.variable} ${jost.variable} ${brandFont.variable} ${headingFont.variable} ${bookNaskhFont.variable} ${bookSansFont.variable} ${bookAmiriFont.variable}`}
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
