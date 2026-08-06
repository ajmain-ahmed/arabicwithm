"use client"

import React from "react"
import { TextField, type TextFieldProps } from "@mui/material"

export default function AdminTextField(props: TextFieldProps) {
  const { sx, ...rest } = props
  return (
    <TextField
      {...rest}
      sx={{
        "& .MuiInputBase-root": {
          fontFamily: "Jost, sans-serif",
          fontSize: "0.9rem",
          borderRadius: "8px",
        },
        "& .MuiInputLabel-root": {
          fontFamily: "Jost, sans-serif",
          fontSize: "0.85rem",
        },
        ...sx,
      }}
    />
  )
}
