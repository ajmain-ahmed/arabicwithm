"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
} from "@mui/material"
import { Close, Save, Delete, Add } from "@mui/icons-material"
import {
  fetchRawVocabWord,
  updateVocabWord,
  deleteVocabWord,
  createVocabWord,
  type RawVocabRow,
  type VocabUpdateInput,
} from "@/app/actions/vocab"

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong"
}

type DefinitionItem = {
  english: string
  simpleAr?: string
  simpleArTr?: string
  directEnglish?: string
}

type ExampleItem = {
  ar: string
  arDi?: string
  en: string
  tr?: string
}

interface VocabEditDialogProps {
  open: boolean
  onClose: () => void
  wordId: number | null
  initialData?: Partial<RawVocabRow>
  onSaved?: () => void
  onDeleted?: () => void
}

const fieldSx = {
  "& .MuiInputBase-root": {
    fontFamily: "Jost, sans-serif",
    fontSize: "0.9rem",
    borderRadius: "8px",
  },
  "& .MuiInputLabel-root": {
    fontFamily: "Jost, sans-serif",
    fontSize: "0.85rem",
  },
}

export default function VocabEditDialog({
  open,
  onClose,
  wordId,
  initialData,
  onSaved,
  onDeleted,
}: VocabEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)

  const [wordAr, setWordAr] = useState("")
  const [wordDi, setWordDi] = useState("")
  const [wordTr, setWordTr] = useState("")
  const [root, setRoot] = useState("")
  const [level, setLevel] = useState("")
  const [theme, setTheme] = useState("")
  const [definitions, setDefinitions] = useState<DefinitionItem[]>([])
  const [examples, setExamples] = useState<ExampleItem[]>([])
  const [formsJson, setFormsJson] = useState("[]")

  const isNew = wordId === null

  const applyRaw = (raw: Partial<RawVocabRow>) => {
    setWordAr(raw.word_ar ?? "")
    setWordDi(raw.word_di ?? "")
    setWordTr(raw.word_tr ?? "")
    setRoot(raw.root ?? "")
    setLevel(raw.level ?? "")
    setTheme(raw.theme ?? "")
    setDefinitions(
      Array.isArray(raw.definitions) ? (raw.definitions as DefinitionItem[]) : []
    )
    setExamples(
      Array.isArray(raw.examples) ? (raw.examples as ExampleItem[]) : []
    )
    setFormsJson(JSON.stringify(raw.forms ?? [], null, 2))
  }

  useEffect(() => {
    if (!open) return
    setTab(0)
    setError(null)

    if (isNew) {
      applyRaw(initialData ?? {})
      return
    }

    setLoading(true)
    fetchRawVocabWord(wordId!)
      .then((raw: RawVocabRow | null) => {
        if (!raw) {
          setError("Word not found")
          return
        }
        applyRaw(raw)
      })
      .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to load word"))
      .finally(() => setLoading(false))
  }, [open, wordId, isNew, initialData])

  const updateDefinition = (
    index: number,
    field: keyof DefinitionItem,
    value: string
  ) => {
    setDefinitions((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addDefinition = () => {
    setDefinitions((prev) => [...prev, { english: "" }])
  }

  const removeDefinition = (index: number) => {
    setDefinitions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateExample = (
    index: number,
    field: keyof ExampleItem,
    value: string
  ) => {
    setExamples((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addExample = () => {
    setExamples((prev) => [...prev, { ar: "", en: "" }])
  }

  const removeExample = (index: number) => {
    setExamples((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let forms: unknown = undefined
      try {
        forms = JSON.parse(formsJson)
      } catch {
        throw new Error("Forms JSON is invalid")
      }

      const payload: VocabUpdateInput = {
        word_ar: wordAr,
        word_di: wordDi,
        word_tr: wordTr,
        root: root || null,
        level,
        theme,
        forms,
        definitions,
        examples,
      }

      if (isNew) {
        await createVocabWord(payload as VocabUpdateInput & { word_id?: number })
      } else {
        await updateVocabWord(wordId!, payload)
      }

      onSaved?.()
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isNew) return
    if (!confirm("Are you sure you want to delete this word? This cannot be undone.")) return
    try {
      await deleteVocabWord(wordId!)
      onDeleted?.()
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Delete failed")
    }
  }

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
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#2c1a0e",
          pb: 2,
          pt: 2.5,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {isNew ? "New Word" : `Edit Word ${wordId ?? ""}`}
        <IconButton onClick={onClose} size="small" sx={{ color: "#7a6e65", mr: -0.5 }}>
          <Close sx={{ fontSize: "1.2rem" }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} sx={{ color: "#b8860b" }} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {error && (
              <Typography
                sx={{
                  fontFamily: "Jost, sans-serif",
                  fontSize: "0.85rem",
                  color: "#c0392b",
                  background: "rgba(192,57,43,0.06)",
                  border: "1px solid rgba(192,57,43,0.2)",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 1,
                }}
              >
                {error}
              </Typography>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField label="Arabic (plain)" value={wordAr} onChange={(e) => setWordAr(e.target.value)} fullWidth size="small" sx={fieldSx} />
              <TextField label="Arabic (diacritic)" value={wordDi} onChange={(e) => setWordDi(e.target.value)} fullWidth size="small" sx={fieldSx} />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField label="Transliteration" value={wordTr} onChange={(e) => setWordTr(e.target.value)} fullWidth size="small" sx={fieldSx} />
              <TextField label="Root" value={root} onChange={(e) => setRoot(e.target.value)} fullWidth size="small" sx={fieldSx} />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField label="Level" value={level} onChange={(e) => setLevel(e.target.value)} fullWidth size="small" sx={fieldSx} />
              <TextField label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} fullWidth size="small" sx={fieldSx} />
            </Box>

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ mt: 1 }}
            >
              <Tab label="Definitions" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
              <Tab label="Examples" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
              <Tab label="Forms (JSON)" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
            </Tabs>

            {tab === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {definitions.map((def, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: "12px", bgcolor: "#fafafa" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#7a6e65" }}>
                        Definition {idx + 1}
                      </Typography>
                      <IconButton size="small" onClick={() => removeDefinition(idx)} sx={{ color: "#c0392b" }}>
                        <Delete sx={{ fontSize: "1.1rem" }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <TextField label="English" value={def.english} onChange={(e) => updateDefinition(idx, "english", e.target.value)} fullWidth size="small" sx={fieldSx} />
                      <TextField label="Direct English (optional)" value={def.directEnglish ?? ""} onChange={(e) => updateDefinition(idx, "directEnglish", e.target.value)} fullWidth size="small" sx={fieldSx} />
                      <TextField label="Simple Arabic (optional)" value={def.simpleAr ?? ""} onChange={(e) => updateDefinition(idx, "simpleAr", e.target.value)} fullWidth size="small" sx={fieldSx} />
                      <TextField label="Simple Arabic Transliteration (optional)" value={def.simpleArTr ?? ""} onChange={(e) => updateDefinition(idx, "simpleArTr", e.target.value)} fullWidth size="small" sx={fieldSx} />
                    </Box>
                  </Paper>
                ))}
                <Button
                  startIcon={<Add />}
                  onClick={addDefinition}
                  sx={{ alignSelf: "flex-start", textTransform: "none", fontFamily: "Jost, sans-serif", color: "#2c1a0e" }}
                >
                  Add definition
                </Button>
              </Box>
            )}

            {tab === 1 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {examples.map((ex, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: "12px", bgcolor: "#fafafa" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#7a6e65" }}>
                        Example {idx + 1}
                      </Typography>
                      <IconButton size="small" onClick={() => removeExample(idx)} sx={{ color: "#c0392b" }}>
                        <Delete sx={{ fontSize: "1.1rem" }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <TextField label="Arabic" value={ex.ar} onChange={(e) => updateExample(idx, "ar", e.target.value)} fullWidth size="small" sx={fieldSx} />
                      <TextField label="Arabic Diacritic (optional)" value={ex.arDi ?? ""} onChange={(e) => updateExample(idx, "arDi", e.target.value)} fullWidth size="small" sx={fieldSx} />
                      <TextField label="English" value={ex.en} onChange={(e) => updateExample(idx, "en", e.target.value)} fullWidth size="small" sx={fieldSx} />
                      <TextField label="Transliteration (optional)" value={ex.tr ?? ""} onChange={(e) => updateExample(idx, "tr", e.target.value)} fullWidth size="small" sx={fieldSx} />
                    </Box>
                  </Paper>
                ))}
                <Button
                  startIcon={<Add />}
                  onClick={addExample}
                  sx={{ alignSelf: "flex-start", textTransform: "none", fontFamily: "Jost, sans-serif", color: "#2c1a0e" }}
                >
                  Add example
                </Button>
              </Box>
            )}

            {tab === 2 && (
              <TextField
                label="Forms JSON"
                value={formsJson}
                onChange={(e) => setFormsJson(e.target.value)}
                fullWidth
                multiline
                rows={12}
                size="small"
                sx={fieldSx}
              />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5, flexDirection: { xs: "column", sm: "row" }, gap: 1 }}>
        {!isNew && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleDelete}
            startIcon={<Delete sx={{ fontSize: "1rem" }} />}
            sx={{ fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.9rem", textTransform: "none", borderRadius: "10px", order: { xs: 2, sm: 0 }, width: { xs: "100%", sm: "auto" } }}
          >
            Delete
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={saving}
          sx={{ fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.9rem", textTransform: "none", borderRadius: "10px", borderColor: "rgba(122,110,101,0.3)", color: "#7a6e65", width: { xs: "100%", sm: "auto" } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading}
          startIcon={<Save sx={{ fontSize: "1rem" }} />}
          sx={{ background: "#2c1a0e", color: "#f5ede0", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.9rem", textTransform: "none", borderRadius: "10px", width: { xs: "100%", sm: "auto" }, "&:hover": { background: "#1a0f08" } }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
