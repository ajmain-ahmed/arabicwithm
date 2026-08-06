"use client"

import React from "react"
import { TextField, InputAdornment } from "@mui/material"
import { Search } from "@mui/icons-material"

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchField({
  value,
  onChange,
  placeholder = "Search...",
}: SearchFieldProps) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={{
        maxWidth: 420,
        "& .MuiInputBase-root": {
          bgcolor: "#fff",
          borderRadius: "12px",
          fontFamily: "Jost, sans-serif",
          fontSize: "0.95rem",
        },
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: "#9e8a7a" }} />
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
