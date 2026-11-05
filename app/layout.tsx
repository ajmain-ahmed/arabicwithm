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

const socialImage = {
  url: 'https://whbxgwucsoguqzpnpzjd.supabase.co/storage/v1/object/public/covers/social/arabicwithm-cinematic-collage-0e25039c3908.jpg',
  width: 1200,
  height: 630,
  alt: 'ArabicWithM — Watch, Read, Learn: cinematic character collage surrounding the ArabicWithM logo.',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://arabicwithm.vercel.app'),
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="awm-gtm-init" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
        `}</Script>
        <Script id="awm-gtm-container" strategy="beforeInteractive" async src="https://www.googletagmanager.com/gtm.js?id=GTM-WLD4QMF2" />
      </head>
      <body
        className={`${ebGaramond.variable} ${jost.variable} ${brandFont.variable} ${headingFont.variable} ${bookNaskhFont.variable} ${bookSansFont.variable} ${bookAmiriFont.variable}`}
      >
        <AppRouterCacheProvider options={{ key: 'css', enableCssLayer: true }}>
          <AuthProvider>
            <ThemeProvider>
              <ScrollReset />
              <SiteShell>{children}</SiteShell>
            </ThemeProvider>
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
