import {
  Amiri,
  Baloo_Bhaijaan_2,
  EB_Garamond,
  Geist,
  Geist_Mono,
  Jost,
  Noto_Naskh_Arabic,
  Noto_Sans_Arabic,
  Nunito_Sans,
} from "next/font/google"

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

export const brandFont = Baloo_Bhaijaan_2({
  variable: "--font-decorative",
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
})

export const headingFont = Nunito_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const bookNaskhFont = Noto_Naskh_Arabic({
  variable: "--font-book-naskh",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
})

export const bookSansFont = Noto_Sans_Arabic({
  variable: "--font-book-sans",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
})

export const bookAmiriFont = Amiri({
  variable: "--font-book-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
})
