"use client"

import React from "react"
import { Paper } from "@mui/material"

interface JsonPreviewProps {
  value: unknown
  height?: number | string
}

export default function JsonPreview({ value, height = 360 }: JsonPreviewProps) {
  const json = React.useMemo(() => {
    return JSON.stringify(value, null, 2)
  }, [value])

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: "12px",
        bgcolor: "#f5f5f5",
        borderColor: "rgba(122,110,101,0.2)",
        height,
        overflow: "auto",
      }}
    >
      <pre
        style={{
          margin: 0,
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: "0.85rem",
          lineHeight: 1.6,
          color: "#2c1a0e",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {json}
      </pre>
    </Paper>
  )
}
