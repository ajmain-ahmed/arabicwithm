"use client"

import React from "react"
import {
  AppBar,
  Toolbar,
  Button,
  Box,
} from "@mui/material"
import {
  SmartDisplay,
  MenuBook,
  Book,
  FormatQuote,
} from "@mui/icons-material"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { label: "Shows", href: "/admin/shows", icon: <SmartDisplay /> },
  { label: "Books", href: "/admin/books", icon: <Book /> },
  { label: "Hans Wehr", href: "/admin/hans-wehr", icon: <MenuBook /> },
  { label: "Phrases", href: "/admin/phrases", icon: <FormatQuote /> },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "#fff",
        color: "#2c1a0e",
        borderBottom: "1px solid rgba(44,26,14,0.08)",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: { xs: 52, md: 60 },
          py: 1,
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                startIcon={item.icon}
                sx={{
                  color: active ? "#2c1a0e" : "rgba(44,26,14,0.75)",
                  bgcolor: active ? "rgba(184,134,11,0.12)" : "transparent",
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  borderRadius: "10px",
                  px: 2,
                  py: 0.75,
                  mt: 1,
                  "&:hover": {
                    bgcolor: active ? "rgba(184,134,11,0.2)" : "rgba(44,26,14,0.06)",
                  },
                }}
              >
                {item.label}
              </Button>
            )
          })}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
