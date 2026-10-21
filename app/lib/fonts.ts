import {
  Amiri,
  EB_Garamond,
  Geist,
  Geist_Mono,
  Jost,
  Noto_Naskh_Arabic,
  Noto_Sans_Arabic,
} from "next/font/google"
import localFont from "next/font/local"

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
  // Use Jost's variable font; fixed-weight Google URLs intermittently break Turbopack's query parser.
})

export const brandFont = localFont({
  src: "../fonts/baloo-bhaijaan-2/BalooBhaijaan2-Variable.ttf",
  variable: "--font-decorative",
  weight: "400 700",
  style: "normal",
  display: "swap",
})

// Bundle Nunito Sans to avoid intermittent Google Fonts URL parsing failures in Turbopack.
export const headingFont = localFont({
  src: "../fonts/nunito-sans/NunitoSans-Variable.ttf",
  variable: "--font-heading",
  weight: "400 600",
  style: "normal",
  display: "swap",
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
