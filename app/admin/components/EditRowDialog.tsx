"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  Tabs,
  Tab,
} from "@mui/material"
import { Close, Save, Cancel } from "@mui/icons-material"
import { errorMessage } from "@/app/lib/errors"

export type EditField = {
  key: string
  label: string
  type: "text" | "select" | "boolean" | "textarea"
  options?: { value: string; label: string }[]
  arabic?: boolean
  required?: boolean
}

export type EditRowDialogProps = {
  open: boolean
  title: string
  fields: EditField[]
  initialValues: Record<string, string | boolean>
  onClose: () => void
  onSave: (values: Record<string, string | boolean>) => Promise<void>
}

const BARK = "#2c1a0e"
const MUTED = "#7a6e65"
const CREAM = "#f5ede0"
const DARK_GREEN = "#1B4D3E"

export default function EditRowDialog({
  open,
  title,
  fields,
  initialValues,
  onClose,
  onSave,
}: EditRowDialogProps) {
  const [mode, setMode] = useState<"form" | "json">("form")
  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues)
  const [jsonText, setJsonText] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(initialValues)
    setJsonText(JSON.stringify(initialValues, null, 2))
    setMode("form")
    setError(null)
  }, [open, initialValues])

  const handleFieldChange = (key: string, value: string | boolean) => {
    const next = { ...values, [key]: value }
    setValues(next)
    setJsonText(JSON.stringify(next, null, 2))
  }

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const next: Record<string, string | boolean> = {}
        for (const field of fields) {
          const raw = parsed[field.key]
          if (field.type === "boolean") {
            next[field.key] = Boolean(raw)
          } else {
            next[field.key] = typeof raw === "string" ? raw : String(raw ?? "")
          }
        }
        setValues(next)
        setError(null)
      }
    } catch {
      // ignore while typing
    }
  }

  const handleSave = async () => {
    if (mode === "json") {
      try {
        JSON.parse(jsonText)
      } catch (e: unknown) {
        setError(errorMessage(e) ?? "Invalid JSON")
        return
      }
    }

    for (const field of fields) {
      if (field.required && !String(values[field.key]).trim()) {
        setError(`${field.label} is required`)
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(values)
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const textFieldSx = useMemo(
    () => ({
      "& .MuiInputBase-root": {
        borderRadius: "10px",
        bgcolor: "#fff",
        fontFamily: "Jost, sans-serif",
      },
    }),
    []
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(44,26,14,0.2)",
            bgcolor: CREAM,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: "1.6rem",
          fontWeight: 700,
          color: BARK,
          pb: 2,
          pt: 2.5,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {title}
        <IconButton onClick={onClose} size="small" sx={{ color: MUTED, mr: -0.5 }}>
          <Close sx={{ fontSize: "1.4rem" }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 2 }}>
        {error && (
          <Typography
            sx={{
              fontFamily: "Jost, sans-serif",
              fontSize: "1rem",
              color: "#c0392b",
              background: "rgba(192,57,43,0.06)",
              border: "1px solid rgba(192,57,43,0.2)",
              borderRadius: "8px",
              px: 2,
              py: 1.5,
              mb: 2,
            }}
          >
            {error}
          </Typography>
        )}

        <Tabs
          value={mode}
          onChange={(_, v) => setMode(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab
            value="form"
            label="Form"
            sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }}
          />
          <Tab
            value="json"
            label="JSON"
            sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }}
          />
        </Tabs>

        {mode === "form" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {fields.map((field) => {
              const value = values[field.key]
              if (field.type === "boolean") {
                return (
                  <Box key={field.key}>
                    <Typography
                      sx={{
                        fontFamily: "Jost, sans-serif",
                        fontSize: "0.85rem",
                        color: MUTED,
                        fontWeight: 600,
                        mb: 0.5,
                      }}
                    >
                      {field.label}
                    </Typography>
                    <TextField
                      select
                      value={String(value)}
                      onChange={(e) => handleFieldChange(field.key, e.target.value === "true")}
                      size="small"
                      fullWidth
                      slotProps={{ select: { native: true } }}
                      sx={textFieldSx}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </TextField>
                  </Box>
                )
              }
              if (field.type === "select") {
                return (
                  <Box key={field.key}>
                    <Typography
                      sx={{
                        fontFamily: "Jost, sans-serif",
                        fontSize: "0.85rem",
                        color: MUTED,
                        fontWeight: 600,
                        mb: 0.5,
                      }}
                    >
                      {field.label}
                    </Typography>
                    <TextField
                      select
                      value={String(value)}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      size="small"
                      fullWidth
                      slotProps={{ select: { native: true } }}
                      sx={textFieldSx}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </TextField>
                  </Box>
                )
              }
              return (
                <Box key={field.key}>
                  <Typography
                    sx={{
                      fontFamily: "Jost, sans-serif",
                      fontSize: "0.85rem",
                      color: MUTED,
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    {field.label}
                  </Typography>
                  <TextField
                    value={value}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    size="small"
                    fullWidth
                    multiline={field.type === "textarea"}
                    minRows={field.type === "textarea" ? 3 : undefined}
                    sx={{
                      ...textFieldSx,
                      ...(field.arabic
                        ? {
                            "& .MuiInputBase-input": {
                              fontFamily: "'EB Garamond', serif",
                              fontSize: "1.3rem",
                              direction: "rtl",
                            },
                          }
                        : {
                            "& .MuiInputBase-input": {
                              fontFamily: "Jost, sans-serif",
                            },
                          }),
                    }}
                  />
                </Box>
              )
            })}
          </Box>
        ) : (
          <Box>
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.9rem", color: MUTED, mb: 1 }}>
              Edit the raw JSON. Only the known fields will be saved.
            </Typography>
            <Box
              component="textarea"
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              sx={{
                width: "100%",
                minHeight: 320,
                fontFamily: "'Geist Mono', monospace",
                fontSize: "0.9rem",
                lineHeight: 1.5,
                p: 2,
                borderRadius: "10px",
                border: "1px solid rgba(122,110,101,0.25)",
                bgcolor: "#fff",
                color: BARK,
                resize: "vertical",
                outline: "none",
                "&:focus": {
                  borderColor: "#b8860b",
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
        <Button
          variant="outlined"
          startIcon={<Cancel />}
          disabled={saving}
          onClick={onClose}
          sx={{
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            fontSize: "1rem",
            textTransform: "none",
            borderRadius: "10px",
            borderColor: "rgba(122,110,101,0.4)",
            color: BARK,
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          disabled={saving}
          onClick={handleSave}
          sx={{
            background: DARK_GREEN,
            color: "#fff",
            fontFamily: "Jost, sans-serif",
            fontSize: "1rem",
            fontWeight: 600,
            textTransform: "none",
            borderRadius: "10px",
            "&:hover": { background: "#143d30" },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
