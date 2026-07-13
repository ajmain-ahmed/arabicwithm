"use client"

import React, { useState, useMemo } from "react"
import { Box, Typography, Button, IconButton, Paper } from "@mui/material"
import { Save, Cancel, Delete, Add, Code } from "@mui/icons-material"
import { type ScriptBlock, type CartoonWordEntry } from "@/app/lib/cartoons"
import { stripDiacritics } from "@/app/lib/arabic"

interface ScriptBlockEditorProps {
  block: ScriptBlock
  onSave: (updated: ScriptBlock) => void
  onCancel: () => void
  disabled?: boolean
}

export function formatTimestamp(seconds: number | null): string {
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
  const [timestamp, setTimestamp] = useState(formatTimestamp(block.timestamp))
  const [notes, setNotes] = useState<string[]>(block.notes.length ? block.notes : [""])
  const [words, setWords] = useState<CartoonWordEntry[]>(block.words.length ? block.words : [])
  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui')
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const derivedDiacritic = useMemo(() => words.map((w) => w.arabic.trim()).join(' '), [words])
  const derivedPlain = useMemo(() => words.map((w) => w.plain.trim()).join(' '), [words])

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
      { arabic: "", plain: "", transliteration: "", english: "", root: null, lemma: "", entry_type: "word", pos: "", cefr: "" },
    ])
  }

  function cleanWord(w: CartoonWordEntry): CartoonWordEntry {
    const arabic = w.arabic.trim()
    return {
      ...w,
      arabic,
      plain: stripDiacritics(arabic),
      transliteration: w.transliteration.trim(),
      english: w.english.trim(),
      root: w.root?.trim() || null,
      lemma: w.lemma?.trim() || arabic,
      entry_type: w.entry_type || "word",
      pos: w.pos?.trim() || "",
      cefr: w.cefr?.trim().toLowerCase() || "",
    }
  }

  function buildBlock(title: string, timestamp: string, notes: string[], words: CartoonWordEntry[]): ScriptBlock {
    const filteredNotes = notes.map((n) => n.trim()).filter(Boolean)
    const cleanedWords = words.map(cleanWord)
    return {
      ...block,
      title: title.trim(),
      english: "",
      arabicDiacritic: cleanedWords.map((w) => w.arabic).join(' '),
      arabicPlain: cleanedWords.map((w) => w.plain).join(' '),
      timestamp: parseTimestamp(timestamp),
      notes: filteredNotes,
      words: cleanedWords,
    }
  }

  function buildBlockFromState(): ScriptBlock {
    return buildBlock(title, timestamp, notes, words)
  }

  const buildJsonPayload = React.useCallback(() => {
    return {
      title: title.trim(),
      timestamp: parseTimestamp(timestamp),
      notes: notes.map((n) => n.trim()).filter(Boolean),
      words,
    }
  }, [title, timestamp, notes, words])

  const parseJsonPayload = React.useCallback((source: string): { title: string; timestamp: string; notes: string[]; words: CartoonWordEntry[] } | null => {
    try {
      const parsed = JSON.parse(source)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON must be an object')
      }
      if ('title' in parsed && typeof parsed.title !== 'string') {
        throw new Error('title must be a string')
      }
      if ('timestamp' in parsed && parsed.timestamp !== null && typeof parsed.timestamp !== 'number' && typeof parsed.timestamp !== 'string') {
        throw new Error('timestamp must be a number, string, or null')
      }
      if ('notes' in parsed && !Array.isArray(parsed.notes)) {
        throw new Error('notes must be an array')
      }
      if ('words' in parsed && !Array.isArray(parsed.words)) {
        throw new Error('words must be an array')
      }
      const nextTitle = typeof parsed.title === 'string' ? parsed.title : title
      let nextTimestamp = timestamp
      if (typeof parsed.timestamp === 'number') {
        nextTimestamp = formatTimestamp(parsed.timestamp)
      } else if (typeof parsed.timestamp === 'string') {
        nextTimestamp = parsed.timestamp
      }
      const nextNotes = Array.isArray(parsed.notes)
        ? (parsed.notes.filter((n: unknown) => typeof n === 'string') as string[]).length
          ? (parsed.notes.filter((n: unknown) => typeof n === 'string') as string[])
          : [""]
        : notes
      const nextWords: CartoonWordEntry[] = Array.isArray(parsed.words)
        ? parsed.words.map((w: unknown, i: number) => {
            if (!w || typeof w !== 'object') {
              throw new Error(`word ${i + 1} must be an object`)
            }
            const ww = w as Record<string, unknown>
            const arabic = typeof ww.arabic === 'string' ? ww.arabic.trim() : ''
            return {
              arabic,
              plain: typeof ww.plain === 'string' ? ww.plain.trim() : stripDiacritics(arabic),
              transliteration: typeof ww.transliteration === 'string' ? ww.transliteration.trim() : '',
              english: typeof ww.english === 'string' ? ww.english.trim() : '',
              root: typeof ww.root === 'string' && ww.root.trim() ? ww.root.trim() : null,
              lemma: typeof ww.lemma === 'string' && ww.lemma.trim() ? ww.lemma.trim() : arabic,
              entry_type: ww.entry_type === 'phrase' ? 'phrase' : 'word',
              pos: typeof ww.pos === 'string' ? ww.pos.trim() : '',
              cefr: typeof ww.cefr === 'string' ? ww.cefr.trim().toLowerCase() : '',
            }
          })
        : words
      return { title: nextTitle, timestamp: nextTimestamp, notes: nextNotes, words: nextWords }
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
      return null
    }
  }, [title, timestamp, notes, words])

  const applyJsonToState = React.useCallback(() => {
    const result = parseJsonPayload(jsonValue)
    if (!result) return false
    setTitle(result.title)
    setTimestamp(result.timestamp)
    setNotes(result.notes)
    setWords(result.words)
    setJsonError(null)
    return true
  }, [jsonValue, parseJsonPayload])

  const toggleViewMode = () => {
    if (viewMode === 'ui') {
      setJsonValue(JSON.stringify(buildJsonPayload(), null, 2))
      setJsonError(null)
      setViewMode('json')
    } else {
      const ok = applyJsonToState()
      if (!ok) return
      setViewMode('ui')
    }
  }

  const handleSave = () => {
    if (viewMode === 'json') {
      const result = parseJsonPayload(jsonValue)
      if (!result) return
      setTitle(result.title)
      setTimestamp(result.timestamp)
      setNotes(result.notes)
      setWords(result.words)
      onSave(buildBlock(result.title, result.timestamp, result.notes, result.words))
    } else {
      onSave(buildBlockFromState())
    }
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
        {viewMode === 'json' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {jsonError && (
              <Box
                sx={{
                  py: 1.5,
                  px: 2,
                  background: 'rgba(198,40,40,0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(198,40,40,0.15)',
                }}
              >
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: '#c62828' }}>
                  {jsonError}
                </Typography>
              </Box>
            )}
            <textarea
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              disabled={disabled}
              style={{
                ...inputStyle,
                minHeight: 320,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </Box>
        )}
        {viewMode === 'ui' && (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "120px 1fr" }, gap: 2 }}>
              <Field label="Timestamp" value={timestamp} onChange={setTimestamp} disabled={disabled} />
              <Field label="Title / English" value={title} onChange={setTitle} disabled={disabled} />
            </Box>

        <Box>
          <Typography sx={sectionLabelStyle}>Arabic sentence (preview)</Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: "8px",
              border: "1px solid rgba(122,110,101,0.15)",
              bgcolor: "rgba(122,110,101,0.03)",
              direction: "rtl",
              textAlign: "right",
              fontFamily: "'EB Garamond', serif",
              fontSize: "1.25rem",
              color: "#2c1a0e",
              lineHeight: 1.5,
              minHeight: 48,
            }}
          >
            {derivedDiacritic || "—"}
          </Box>
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              borderRadius: "8px",
              border: "1px solid rgba(122,110,101,0.15)",
              bgcolor: "rgba(122,110,101,0.03)",
              direction: "rtl",
              textAlign: "right",
              fontFamily: "'EB Garamond', serif",
              fontSize: "1.1rem",
              color: "#7a6e65",
              lineHeight: 1.5,
              minHeight: 44,
            }}
          >
            {derivedPlain || "—"}
          </Box>
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
                <Field label="Arabic" value={word.arabic} onChange={(v) => updateWord(idx, { arabic: v, plain: stripDiacritics(v) })} disabled={disabled} rtl />
                <Field label="English" value={word.english} onChange={(v) => updateWord(idx, { english: v })} disabled={disabled} />
                <Field label="Transliteration" value={word.transliteration} onChange={(v) => updateWord(idx, { transliteration: v })} disabled={disabled} />
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
                <Field label="Root" value={word.root ?? ""} onChange={(v) => updateWord(idx, { root: v || null })} disabled={disabled} rtl />
                <Field label="Lemma" value={word.lemma ?? ""} onChange={(v) => updateWord(idx, { lemma: v })} disabled={disabled} rtl />
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>Entry type</label>
                  <select
                    value={word.entry_type || "word"}
                    disabled={disabled}
                    onChange={(e) => updateWord(idx, { entry_type: e.target.value as 'word' | 'phrase' })}
                    style={{
                      ...inputStyle,
                      height: "42px",
                      padding: "0 10px",
                      appearance: "auto",
                    }}
                  >
                    <option value="word">word</option>
                    <option value="phrase">phrase</option>
                  </select>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
                <Field label="POS" value={word.pos ?? ""} onChange={(v) => updateWord(idx, { pos: v })} disabled={disabled} />
                <Field label="CEFR" value={word.cefr ?? ""} onChange={(v) => updateWord(idx, { cefr: v })} disabled={disabled} />
                <Field label="Plain (auto)" value={word.plain} onChange={() => {}} disabled rtl />
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
        </>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Code sx={{ fontSize: '1.1rem' }} />}
            onClick={toggleViewMode}
            disabled={disabled}
            sx={{
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              borderColor: "rgba(122,110,101,0.3)",
              color: "#7a6e65",
            }}
          >
            {viewMode === 'json' ? 'UI' : 'JSON'}
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
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
      </Box>
    </Paper>
  )
}
