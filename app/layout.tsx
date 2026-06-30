import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Box } from "@mui/material";
import "./globals.css";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import MobileBottomNav from "./components/MobileBottomNav";
import FloatingVideoPlayer from "./components/FloatingVideoPlayer";
import { AuthProvider } from './AuthContext'
import GlobalDataInit from '@/app/components/GlobalDataInit'
import ErrorBoundary from './components/ErrorBoundary'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArabicWithM — Learn Arabic with Cartoons",
  description: "Master Arabic through cartoons, flashcards, and interactive reading.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers()
  const nextUrl = headersList.get('next-url') ?? ''
  const isAdminRoute = nextUrl.startsWith('/admin')

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          {isAdminRoute ? (
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          ) : (
            <>
              <Navbar />
              <Box
                component="main"
                sx={{
                  pt: { xs: "56px", md: "64px" },
                  pb: { xs: "56px", md: 0 },
                }}
              >
                <ErrorBoundary>
                  <GlobalDataInit>
                    {children}
                  </GlobalDataInit>
                </ErrorBoundary>
              </Box>
              <Footer />
              <MobileBottomNav />
              <FloatingVideoPlayer />
            </>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
