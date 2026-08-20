"use client"

import React, { type ReactNode, useMemo } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { useColorMode } from "@/app/components/ThemeProvider"
import { createAwmTheme } from "@/app/theme"

export default function AdminThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useColorMode()
  const adminTheme = useMemo(() => createTheme(createAwmTheme(mode), {
    typography: {
      fontSize: 16,
      fontFamily: "Jost, 'EB Garamond', sans-serif",
      h4: { fontSize: "2rem" },
      h5: { fontSize: "1.5rem" },
      h6: { fontSize: "1.25rem" },
      body1: { fontSize: "1rem" },
      body2: { fontSize: "0.95rem" },
      button: { fontSize: "0.95rem" },
      caption: { fontSize: "0.85rem" },
    },
    components: {
      MuiTableCell: {
        styleOverrides: {
          root: { fontSize: "0.95rem" },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontSize: "0.85rem" },
        },
      },
    },
  }), [mode])

  return <ThemeProvider theme={adminTheme}>{children}</ThemeProvider>
}
