"use client"

import React from "react"
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
} from "@mui/material"
import {
  MenuBook,
  SmartDisplay,
  VideoLibrary,
  Home,
} from "@mui/icons-material"
import Link from "next/link"
import { usePathname } from "next/navigation"

const DRAWER_WIDTH = 260

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <Home /> },
  { label: "Vocabulary", href: "/admin/vocabulary", icon: <MenuBook /> },
  { label: "Shows", href: "/admin/shows", icon: <SmartDisplay /> },
  { label: "Episodes", href: "/admin/episodes", icon: <VideoLibrary /> },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: "none", md: "block" },
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: "#2c1a0e",
          color: "#f5ede0",
          borderRight: "none",
        },
      }}
    >
      <Toolbar sx={{ px: 3, pt: 2, pb: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontWeight: 700,
            color: "#f5ede0",
            letterSpacing: 0.5,
          }}
        >
          ArabicWithM Admin
        </Typography>
      </Toolbar>

      <Box sx={{ px: 2, pb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "Jost, sans-serif",
            color: "rgba(245,237,224,0.6)",
            px: 2,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Content
        </Typography>
      </Box>

      <List disablePadding>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <ListItem key={item.href} disablePadding sx={{ px: 1.5, mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                sx={{
                  borderRadius: "10px",
                  color: "rgba(245,237,224,0.85)",
                  "&.Mui-selected": {
                    bgcolor: "rgba(184,134,11,0.25)",
                    color: "#f5ede0",
                  },
                  "&:hover": {
                    bgcolor: "rgba(245,237,224,0.08)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                      },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Box sx={{ mt: "auto", p: 3 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "Jost, sans-serif",
            color: "rgba(245,237,224,0.5)",
          }}
        >
          <Link href="/" style={{ color: "inherit" }}>
            ← Back to site
          </Link>
        </Typography>
      </Box>
    </Drawer>
  )
}
