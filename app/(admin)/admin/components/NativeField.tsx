"use client"

import React from "react"
import { Box } from "@mui/material"

export const nativeInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "0.95rem",
  fontFamily: "Jost, sans-serif",
  color: "#2c1a0e",
  backgroundColor: "#fff",
  border: "1px solid rgba(122,110,101,0.25)",
  borderRadius: "8px",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
}

export const nativeLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Jost, sans-serif",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#7a6e65",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "6px",
}

interface NativeFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  rtl?: boolean
  textarea?: boolean
  type?: string
  placeholder?: string
  minHeight?: number
}

export default function NativeField({
  label,
  value,
  onChange,
  disabled,
  rtl,
  textarea,
  type = "text",
  placeholder,
  minHeight,
}: NativeFieldProps) {
  const style: React.CSSProperties = {
    ...nativeInputStyle,
    direction: rtl ? "rtl" : "ltr",
    minHeight: minHeight ? `${minHeight}px` : textarea ? "72px" : undefined,
    resize: textarea ? "vertical" : undefined,
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#b8860b"
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(184,134,11,0.12)"
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(122,110,101,0.25)"
    e.currentTarget.style.boxShadow = "none"
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <label style={nativeLabelStyle}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          style={style}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <input
          value={value}
          disabled={disabled}
          type={type}
          placeholder={placeholder}
          style={style}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}
    </Box>
  )
}
