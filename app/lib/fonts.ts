import {
  Amiri,
  Baloo_Bhaijaan_2,
  EB_Garamond,
  Jost,
  Noto_Naskh_Arabic,
  Noto_Sans_Arabic,
  Nunito_Sans,
} from "next/font/google"

/* Only faces the homepage actually paints are preloaded (next/font injects
   <link rel="preload"> by default). The serif and book faces render on
   inner pages, so they load on demand there instead of blocking first paint;
   swap display keeps those transitions graceful. */

export const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
})

export const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  // Use Jost's variable font; fixed-weight Google URLs intermittently break Turbopack's query parser.
})

export const brandFont = Baloo_Bhaijaan_2({
  variable: "--font-decorative",
  subsets: ["latin"],
  weight: ["400", "700"],
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
  preload: false,
})

export const bookSansFont = Noto_Sans_Arabic({
  variable: "--font-book-sans",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
})

export const bookAmiriFont = Amiri({
  variable: "--font-book-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  preload: false,
})
