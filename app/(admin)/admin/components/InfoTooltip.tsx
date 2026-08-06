"use client"

import React from "react"
import { IconButton, Tooltip } from "@mui/material"
import { HelpOutlined } from "@mui/icons-material"

export default function InfoTooltip({ title }: { title: string }) {
  return (
    <Tooltip
      title={
        <span style={{ fontFamily: "Jost, sans-serif", fontSize: "0.9rem", lineHeight: 1.5 }}>
          {title}
        </span>
      }
      arrow
      placement="top"
    >
      <IconButton size="small" sx={{ color: "#9e8a7a", p: 0.5, ml: 0.5 }}>
        <HelpOutlined sx={{ fontSize: "1.1rem" }} />
      </IconButton>
    </Tooltip>
  )
}
