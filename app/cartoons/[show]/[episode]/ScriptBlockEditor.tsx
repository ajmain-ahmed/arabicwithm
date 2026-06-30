"use client"

import React, { useState } from "react"
import { Box, Typography, Button, IconButton, Paper } from "@mui/material"
import { Save, Cancel, Delete, Add } from "@mui/icons-material"
import { type ScriptBlock, type CartoonWordEntry } from "@/app/lib/cartoons"

interface ScriptBlockEditorProps {
  block: ScriptBlock
  onSave: (updated: ScriptBlock) => void
  onCancel: () => void
  disabled?: boolean
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

function formatTimestamp(seconds: number | null): string {
  if (seconds == null) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function parseTimestamp(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parts = trimmed.split(":")
  if (parts.length === 2) {
    const m = Number(parts[0])
    const s = Number(parts[1])
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s
  }
  const n = Number(trimmed)
  if (!isNaN(n)) return n
  return null
}

const inputStyle: React.CSSProperties = {
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
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Jost, sans-serif",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "6px",
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "Jost, sans-serif",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "8px",
}

function Field({
  label,
  value,
  onChange,
  disabled,
  rtl,
  textarea,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  rtl?: boolean
  textarea?: boolean
  type?: string
}) {
  const props = {
    value,
    disabled,
    type: textarea ? undefined : type,
    style: {
      ...inputStyle,
      direction: rtl ? "rtl" : "ltr",
      minHeight: textarea ? "72px" : undefined,
      resize: textarea ? "vertical" : undefined,
    } as React.CSSProperties,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = "var(--gold)"
      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(184,134,11,0.12)"
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = "rgba(122,110,101,0.25)"
      e.currentTarget.style.boxShadow = "none"
    },
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <label style={labelStyle}>{label}</label>
      {textarea ? <textarea {...props} /> : <input {...props} />}
    </Box>
  )
}

export default function ScriptBlockEditor({ block, onSave, onCancel, disabled }: ScriptBlockEditorProps) {
  const [title, setTitle] = useState(block.title)
  const [arabicDiacritic, setArabicDiacritic] = useState(block.arabicDiacritic)
  const [arabicPlain, setArabicPlain] = useState(block.arabicPlain)
  const [timestamp, setTimestamp] = useState(formatTimestamp(block.timestamp))
  const [notes, setNotes] = useState<string[]>(block.notes.length ? block.notes : [""])
  const [words, setWords] = useState<CartoonWordEntry[]>(block.words.length ? block.words : [])

  const updateNote = (index: number, value: string) => {
    setNotes((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const removeNote = (index: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== index))
  }

  const addNote = () => {
    setNotes((prev) => [...prev, ""])
  }

  const updateWord = (index: number, patch: Partial<CartoonWordEntry>) => {
    setWords((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const removeWord = (index: number) => {
    setWords((prev) => prev.filter((_, i) => i !== index))
  }

  const addWord = () => {
    setWords((prev) => [
      ...prev,
      { arabic: "", plain: "", transliteration: "", english: "", cefr: "A1" },
    ])
  }

  const handleSave = () => {
    const filteredNotes = notes.map((n) => n.trim()).filter(Boolean)
    onSave({
      ...block,
      title: title.trim(),
      english: "",
      arabicDiacritic: arabicDiacritic.trim(),
      arabicPlain: arabicPlain.trim(),
      timestamp: parseTimestamp(timestamp),
      notes: filteredNotes,
      words: words.map((w) => ({
        ...w,
        arabic: w.arabic.trim(),
        plain: w.plain.trim(),
        transliteration: w.transliteration.trim(),
        english: w.english.trim(),
        cefr: w.cefr.trim(),
      })),
    })
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1,
        borderRadius: "8px",
        borderLeft: "3px solid var(--gold)",
        bgcolor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "120px 1fr" }, gap: 2 }}>
          <Field label="Timestamp" value={timestamp} onChange={setTimestamp} disabled={disabled} />
          <Field label="Title / English" value={title} onChange={setTitle} disabled={disabled} />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Field label="Arabic (diacritic)" value={arabicDiacritic} onChange={setArabicDiacritic} disabled={disabled} rtl />
          <Field label="Arabic (plain)" value={arabicPlain} onChange={setArabicPlain} disabled={disabled} rtl />
        </Box>

        <Box>
          <Typography sx={sectionLabelStyle}>Notes</Typography>
          {notes.map((note, idx) => (
            <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Field
                  label={`Note ${idx + 1}`}
                  value={note}
                  onChange={(v) => updateNote(idx, v)}
                  disabled={disabled}
                  textarea
                />
              </Box>
              <IconButton
                size="small"
                disabled={disabled}
                onClick={() => removeNote(idx)}
                sx={{ color: "#c0392b", alignSelf: "flex-start", mt: 2.5 }}
              >
                <Delete sx={{ fontSize: "1.1rem" }} />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<Add />}
            onClick={addNote}
            size="small"
            disabled={disabled}
            sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", color: "var(--gold)" }}
          >
            Add note
          </Button>
        </Box>

        <Box>
          <Typography sx={sectionLabelStyle}>Words</Typography>
          {words.map((word, idx) => (
            <Paper
              key={idx}
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 1,
                borderRadius: "8px",
                borderColor: "rgba(122,110,101,0.15)",
                bgcolor: "rgba(122,110,101,0.02)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", flex: 1 }}>
                  Word {idx + 1}
                </Typography>
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={() => removeWord(idx)}
                  sx={{ color: "#c0392b" }}
                >
                  <Delete sx={{ fontSize: "1.1rem" }} />
                </IconButton>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5 }}>
                <Field label="Arabic" value={word.arabic} onChange={(v) => updateWord(idx, { arabic: v })} disabled={disabled} rtl />
                <Field label="Plain" value={word.plain} onChange={(v) => updateWord(idx, { plain: v })} disabled={disabled} rtl />
                <Field label="DB key" value={word.db ?? ""} onChange={(v) => updateWord(idx, { db: v })} disabled={disabled} />
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
                <Field label="English" value={word.english} onChange={(v) => updateWord(idx, { english: v })} disabled={disabled} />
                <Field label="Transliteration" value={word.transliteration} onChange={(v) => updateWord(idx, { transliteration: v })} disabled={disabled} />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>CEFR</label>
                  <select
                    value={word.cefr}
                    disabled={disabled}
                    onChange={(e) => updateWord(idx, { cefr: e.target.value })}
                    style={{
                      ...inputStyle,
                      height: "42px",
                      padding: "0 10px",
                      appearance: "auto",
                    }}
                  >
                    {CEFR_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </Box>
              </Box>
            </Paper>
          ))}
          <Button
            startIcon={<Add />}
            onClick={addWord}
            size="small"
            disabled={disabled}
            sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", color: "var(--gold)" }}
          >
            Add word
          </Button>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Cancel />}
            onClick={onCancel}
            disabled={disabled}
            sx={{
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              borderColor: "rgba(122,110,101,0.3)",
              color: "#7a6e65",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={disabled}
            sx={{
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              bgcolor: "var(--bark)",
              color: "#f5ede0",
              "&:hover": { bgcolor: "#1a0f08" },
            }}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
