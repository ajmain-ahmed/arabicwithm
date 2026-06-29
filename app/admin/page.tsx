"use client"

import { Box, Typography, Paper, Grid } from "@mui/material"
import { MenuBook, SmartDisplay, VideoLibrary } from "@mui/icons-material"
import Link from "next/link"

const cards = [
  {
    label: "Vocabulary",
    description: "Search, edit, and manage vocabulary rows.",
    href: "/admin/vocabulary",
    icon: <MenuBook sx={{ fontSize: 32, color: "#b8860b" }} />,
  },
  {
    label: "Shows",
    description: "Manage cartoon shows and their metadata.",
    href: "/admin/shows",
    icon: <SmartDisplay sx={{ fontSize: 32, color: "#b8860b" }} />,
  },
  {
    label: "Episodes",
    description: "Edit episodes, transcripts, and word links.",
    href: "/admin/episodes",
    icon: <VideoLibrary sx={{ fontSize: 32, color: "#b8860b" }} />,
  },
]

export default function AdminDashboardPage() {
  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontWeight: 700,
          color: "#2c1a0e",
          mb: 1,
        }}
      >
        Admin Dashboard
      </Typography>
      <Typography
        sx={{
          fontFamily: "Jost, sans-serif",
          color: "#7a6e65",
          mb: 4,
        }}
      >
        Verify and edit Arabic content for the app and website.
      </Typography>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, md: 4 }} key={card.label}>
            <Paper
              component={Link}
              href={card.href}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "18px",
                bgcolor: "#fff",
                border: "1px solid rgba(122,110,101,0.15)",
                textDecoration: "none",
                display: "block",
                transition: "box-shadow 0.2s, transform 0.2s",
                "&:hover": {
                  boxShadow: "0 12px 32px rgba(44,26,14,0.08)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Box sx={{ mb: 2 }}>{card.icon}</Box>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "'EB Garamond', serif",
                  fontWeight: 700,
                  color: "#2c1a0e",
                  mb: 0.5,
                }}
              >
                {card.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Jost, sans-serif",
                  color: "#7a6e65",
                  fontSize: "0.95rem",
                }}
              >
                {card.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
