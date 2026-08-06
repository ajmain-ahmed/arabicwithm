"use client"

import React from "react"
import { ThemeProvider, createTheme } from "@mui/material"
import { type ReactNode } from "react"

const adminTheme = createTheme({
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
        root: {
          fontSize: "0.95rem",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: "0.85rem",
        },
      },
    },
  },
})

export default function AdminThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={adminTheme}>{children}</ThemeProvider>
}
