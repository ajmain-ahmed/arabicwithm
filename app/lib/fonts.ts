import localFont from "next/font/local"

/* Only UI faces use next/font. The deployed vinext local-font shim ignores
   preload:false, so reading faces are declared in app/fonts/reading.css. */

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
