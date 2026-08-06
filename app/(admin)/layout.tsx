import { geistSans, geistMono, ebGaramond, jost, cookie } from "@/app/lib/fonts"
import { AuthProvider } from "@/app/AuthContext"
import ErrorBoundary from "@/app/components/ErrorBoundary"

export const metadata = {
  title: "Admin | ArabicWithM",
  description: "Content administration for ArabicWithM",
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} ${jost.variable} ${cookie.variable}`}
      >
        <AuthProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  )
}
