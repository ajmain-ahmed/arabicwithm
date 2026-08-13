import { Geist, Geist_Mono, EB_Garamond, Jost, Baloo_Bhaijaan_2, Nunito_Sans } from "next/font/google"

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
