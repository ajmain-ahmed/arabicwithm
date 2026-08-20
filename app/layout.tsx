import type { Metadata } from "next"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter"
import {
  bookAmiriFont,
  bookNaskhFont,
  bookSansFont,
  brandFont,
  ebGaramond,
  geistMono,
  geistSans,
  headingFont,
  jost,
} from "@/app/lib/fonts"
import "./globals.css"
import ThemeProvider from "./components/ThemeProvider"
import { AuthProvider } from "./AuthContext"
import SiteShell from "./components/SiteShell"

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} ${jost.variable} ${brandFont.variable} ${headingFont.variable} ${bookNaskhFont.variable} ${bookSansFont.variable} ${bookAmiriFont.variable}`}
      >
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AuthProvider>
            <ThemeProvider>
              <SiteShell>{children}</SiteShell>
            </ThemeProvider>
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
