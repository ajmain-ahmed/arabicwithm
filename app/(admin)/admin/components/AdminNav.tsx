"use client"

import React from "react"
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material"
import {
  DarkMode,
  SmartDisplay,
  MenuBook,
  Book,
  FormatQuote,
  LightMode,
  People,
  RateReview,
  Menu as MenuIcon,
} from "@mui/icons-material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useColorMode } from "@/app/components/ThemeProvider"

const navItems = [
  { label: "Users", href: "/admin/users", icon: <People /> },
  { label: "Reviews", href: "/admin/reviews", icon: <RateReview /> },
  { label: "Shows", href: "/admin/shows", icon: <SmartDisplay /> },
  { label: "Transcripts", href: "/admin/transcripts", icon: <FormatQuote /> },
  { label: "Books", href: "/admin/books", icon: <Book /> },
  { label: "Hans Wehr", href: "/admin/hans-wehr", icon: <MenuBook /> },
  { label: "Phrases", href: "/admin/phrases", icon: <FormatQuote /> },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const { mode, toggleColorMode } = useColorMode()

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "var(--awm-white)",
        color: "var(--awm-bark)",
        borderBottom: "1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)",
      }}
    >
      <Toolbar
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr) auto", md: "1fr auto 1fr" },
          alignItems: "center",
          gap: 1,
          minHeight: { xs: 52, md: 60 },
          py: 1,
        }}
      >
        <Button component={Link} href="/" sx={{ justifySelf: "start", display: { xs: "none", md: "inline-flex" }, color: "var(--awm-muted)" }}>Back to website</Button>
        <Button startIcon={<MenuIcon />} onClick={event => setAnchor(event.currentTarget)} aria-haspopup="menu" aria-expanded={Boolean(anchor)} aria-controls={anchor ? 'mobile-admin-menu' : undefined} sx={{ display: { xs: 'inline-flex', md: 'none' }, justifySelf: 'start', minHeight: 44 }}>Admin</Button>
        <Menu id="mobile-admin-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 220, maxHeight: 'calc(100dvh - 120px - env(safe-area-inset-bottom))' } } }}>
          {navItems.map(item => <MenuItem key={item.href} component={Link} href={item.href} selected={pathname === item.href || pathname?.startsWith(`${item.href}/`)} onClick={() => setAnchor(null)} sx={{ minHeight: 48 }}><ListItemIcon>{item.icon}</ListItemIcon>{item.label}</MenuItem>)}
          <MenuItem component={Link} href="/" onClick={() => setAnchor(null)} sx={{ minHeight: 48 }}>Back to website</MenuItem>
        </Menu>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, flexWrap: "wrap", justifyContent: "center", alignItems: "center", minWidth: 0 }}>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                startIcon={item.icon}
                sx={{
                  color: active ? "var(--awm-bark)" : "var(--awm-muted)",
                  bgcolor: active ? "color-mix(in srgb, var(--awm-gold) 14%, transparent)" : "transparent",
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  borderRadius: "10px",
                  px: { xs: 1, sm: 2 },
                  py: 0.75,
                  "&:hover": {
                    bgcolor: active ? "color-mix(in srgb, var(--awm-gold) 22%, transparent)" : "color-mix(in srgb, var(--awm-bark) 7%, transparent)",
                  },
                }}
              >
                {item.label}
              </Button>
            )
          })}
        </Box>
        <Tooltip title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}>
          <Button
            onClick={toggleColorMode}
            aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            startIcon={mode === "dark" ? <LightMode /> : <DarkMode />}
            sx={{
              justifySelf: "end",
              minWidth: { xs: 42, sm: 112 },
              px: { xs: 1, sm: 1.75 },
              color: "var(--awm-bark)",
              bgcolor: "var(--awm-cream)",
              border: "1px solid color-mix(in srgb, var(--awm-gold) 35%, transparent)",
              borderRadius: "10px",
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 700,
              "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } },
              "&:hover": { bgcolor: "color-mix(in srgb, var(--awm-gold) 16%, var(--awm-cream))" },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </Box>
          </Button>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}
