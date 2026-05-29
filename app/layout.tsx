import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import MobileBottomNav from "./components/MobileBottomNav";
import WordBankWidget from "./components/WordBankWidget";
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
  description: "Master Arabic through cartoons, flashcards, and spaced repetition.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <Navbar />
          <ErrorBoundary>
            <GlobalDataInit>
              {children}
            </GlobalDataInit>
          </ErrorBoundary>
          <Footer />
          <MobileBottomNav />
          <WordBankWidget />
        </AuthProvider>
      </body>
    </html>
  );
}