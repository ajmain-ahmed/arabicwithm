import { redirect } from "next/navigation"
import { Box, Container, CssBaseline } from "@mui/material"
import { isAdminUser } from "@/app/actions/vocab"
import AdminNav from "./components/AdminNav"
import AdminThemeProvider from "./components/AdminThemeProvider"

export const metadata = {
  title: "Admin | ArabicWithM",
  description: "Content administration for ArabicWithM",
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await isAdminUser()
  if (!admin) {
    redirect("/")
  }

  return (
    <AdminThemeProvider>
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#f8f5f0" }}>
        <CssBaseline />
        <AdminNav />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: "100%",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
            {children}
          </Container>
        </Box>
      </Box>
    </AdminThemeProvider>
  )
}
