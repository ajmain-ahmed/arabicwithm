import { redirect } from "next/navigation"
import { Box, CssBaseline } from "@mui/material"
import { isAdminUser } from "@/app/actions/vocab"
import AdminNav from "./components/AdminNav"

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
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8f5f0" }}>
      <CssBaseline />
      <AdminNav />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          ml: { md: "260px" },
          maxWidth: { md: "calc(100% - 260px)" },
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
