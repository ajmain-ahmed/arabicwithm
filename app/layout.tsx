import type { Metadata } from "next"
import { Box } from "@mui/material"
import { geistSans, geistMono, ebGaramond, jost, cookie } from "@/app/lib/fonts"
import "./globals.css"
import Navbar from "./components/navbar/index"
import Footer from "./components/footer"
import MobileBottomNav from "./components/MobileBottomNav"
import ThemeProvider from "./components/ThemeProvider"
import LazyFloatingVideoPlayer from "./components/LazyFloatingVideoPlayer"
import { AuthProvider } from "./AuthContext"
import GlobalDataInit from "@/app/components/GlobalDataInit"
import ErrorBoundary from "./components/ErrorBoundary"

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} ${jost.variable} ${cookie.variable}`}
      >
        <AuthProvider>
          <ThemeProvider>
            <Navbar />
            <Box
              component="main"
              sx={{
                pt: { xs: "56px", md: "64px" },
                pb: { xs: "56px", md: 0 },
              }}
            >
              <ErrorBoundary>
                <GlobalDataInit>{children}</GlobalDataInit>
              </ErrorBoundary>
            </Box>
            <Footer />
            <MobileBottomNav />
            <LazyFloatingVideoPlayer />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
