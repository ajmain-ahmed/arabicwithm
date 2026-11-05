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

export const metadata: Metadata = {
  title: "ArabicWithM — Learn Arabic with Cartoons",
  description: "Master Arabic through immersive cartoons with interactive subtitles.",
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
