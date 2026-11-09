import localFont from "next/font/local"

/* Only faces the homepage actually paints are preloaded (next/font injects
   <link rel="preload"> by default). The serif and book faces render on
   inner pages, so they load on demand there instead of blocking first paint;
   swap display keeps those transitions graceful. */

export const ebGaramond = localFont({
  src: "../fonts/ebgaramond/EBGaramond-Variable.woff2",
  variable: "--font-serif",
  weight: "400 700",
  display: "swap",
  preload: false,
})

export const jost = localFont({
  src: "../fonts/jost/Jost-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-sans",
  // All fonts are self-hosted: no Google CSS/URL resolution is needed at build time.
})

export const brandFont = localFont({
  src: "../fonts/baloo-bhaijaan-2/BalooBhaijaan2-Variable-latin.woff2",
  variable: "--font-decorative",
  weight: "400 700",
  style: "normal",
  display: "swap",
})

// Bundle Nunito Sans to avoid intermittent Google Fonts URL parsing failures in Turbopack.
export const headingFont = localFont({
  src: "../fonts/nunito-sans/NunitoSans-Variable-latin.woff2",
  variable: "--font-heading",
  weight: "400 600",
  style: "normal",
  display: "swap",
})

export const bookNaskhFont = localFont({
  src: "../fonts/notonaskharabic/NotoNaskhArabic-Variable.woff2",
  variable: "--font-book-naskh",
  weight: "400 700",
  display: "swap",
  preload: false,
})

export const bookSansFont = localFont({
  src: "../fonts/notosansarabic/NotoSansArabic-Variable.woff2",
  variable: "--font-book-sans",
  weight: "400 700",
  display: "swap",
  preload: false,
})

export const bookAmiriFont = localFont({
  src: [{path:"../fonts/amiri/Amiri-Regular.woff2",weight:"400"},{path:"../fonts/amiri/Amiri-Bold.woff2",weight:"700"}],
  variable: "--font-book-amiri",
  display: "swap",
  preload: false,
})
