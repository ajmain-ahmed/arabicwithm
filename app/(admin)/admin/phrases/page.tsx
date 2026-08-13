"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material"
import { Edit, Check, Launch, Close } from "@mui/icons-material"
import {
  fetchAllPhrasesForAdmin,
  updatePhrase,
  type PhraseRow,
} from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"

type EditablePhraseField = "phrase_ar_di" | "phrase_tr" | "english" | "cefr" | "notes"

export default function PhrasesAdminPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const [phrases, setPhrases] = useState<PhraseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRowId, setEditingRowId] = useState<number | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const [dialogPhrase, setDialogPhrase] = useState<PhraseRow | null>(null)
  const [dialogEditing, setDialogEditing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllPhrasesForAdmin()
      setPhrases(data)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load phrases")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateField = useCallback(
    async (id: number, field: EditablePhraseField, value: string) => {
      const phrase = phrases.find((p) => p.id === id)
      if (!phrase) return
      if (String(phrase[field] ?? "") === value) return

      setSaving((prev) => ({ ...prev, [`${id}-${field}`]: true }))

      try {
        await updatePhrase(id, { [field]: value })
        await load()
      } catch (e: unknown) {
        setError(errorMessage(e) ?? `Failed to update ${field}`)
      } finally {
        setSaving((prev) => ({ ...prev, [`${id}-${field}`]: false }))
      }
    },
    [phrases, load]
  )

  const toggleEditRow = (id: number) => {
    setEditingRowId((current) => (current === id ? null : id))
  }

  const openDialog = (phrase: PhraseRow, editing = false) => {
    setDialogPhrase(phrase)
    setDialogEditing(editing)
  }

  const closeDialog = () => {
    setDialogPhrase(null)
    setDialogEditing(false)
  }

  const handleDialogUpdate = async (field: EditablePhraseField, value: string) => {
    if (!dialogPhrase) return
    await updateField(dialogPhrase.id, field, value)
  }

  const isSavingField = (phrase: PhraseRow, field: EditablePhraseField) => {
    return Boolean(saving[`${phrase.id}-${field}`])
  }

  const renderMobileCard = (phrase: PhraseRow) => {
    return (
      <Paper
        key={phrase.id}
        elevation={0}
        onClick={() => openDialog(phrase)}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "14px",
          border: "1px solid rgba(122,110,101,0.15)",
          backgroundColor: "#fff",
          cursor: "pointer",
          transition: "box-shadow 0.2s",
          "&:hover": { boxShadow: "0 4px 14px rgba(44,26,14,0.08)" },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                direction: "rtl",
                fontFamily: "'EB Garamond', serif",
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "#2c1a0e",
                textAlign: "right",
                lineHeight: 1.3,
              }}
            >
              {phrase.phrase_ar_di || "—"}
            </Typography>
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.15rem", color: "#7a6e65", mt: 0.5 }}>
              {phrase.english || "—"}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              openDialog(phrase, true)
            }}
            sx={{ color: "#7a6e65", flexShrink: 0 }}
          >
            <Launch sx={{ fontSize: "1.3rem" }} />
          </IconButton>
        </Box>
      </Paper>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: "#2c1a0e" }}>
          Phrases
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
          {loading ? "Loading…" : `${phrases.length.toLocaleString()} phrase${phrases.length === 1 ? "" : "s"}`}
        </Typography>
      </Box>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      {loading ? (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          Loading phrases…
        </Typography>
      ) : phrases.length === 0 ? (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          No phrases found.
        </Typography>
      ) : isMobile ? (
        <Box>{phrases.map(renderMobileCard)}</Box>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
          <TableContainer>
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>ID</TableCell>
                  <TableCell sx={headerCellSx}>Phrase AR</TableCell>
                  <TableCell sx={headerCellSx}>Transliteration</TableCell>
                  <TableCell sx={headerCellSx}>English</TableCell>
                  <TableCell sx={headerCellSx}>CEFR</TableCell>
                  <TableCell sx={{ ...headerCellSx, minWidth: 220 }}>Notes</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 60, px: 1 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {phrases.map((phrase) => {
                  const isEditing = editingRowId === phrase.id

                  return (
                    <TableRow
                      key={phrase.id}
                      hover
                      sx={{
                        "& td": { ...bodyCellSx, py: 1.5 },
                      }}
                    >
                      <TableCell sx={bodyCellSx}>{phrase.id}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, direction: "rtl" }}>
                        <EditableCell
                          arabic
                          isEditing={isEditing}
                          value={phrase.phrase_ar_di}
                          onBlur={(value) => updateField(phrase.id, "phrase_ar_di", value)}
                          saving={isSavingField(phrase, "phrase_ar_di")}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx}>
                        <EditableCell
                          isEditing={isEditing}
                          value={phrase.phrase_tr}
                          onBlur={(value) => updateField(phrase.id, "phrase_tr", value)}
                          saving={isSavingField(phrase, "phrase_tr")}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx}>
                        <EditableCell
                          isEditing={isEditing}
                          value={phrase.english}
                          onBlur={(value) => updateField(phrase.id, "english", value)}
                          saving={isSavingField(phrase, "english")}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx}>
                        <EditableCell
                          isEditing={isEditing}
                          value={phrase.cefr}
                          onBlur={(value) => updateField(phrase.id, "cefr", value)}
                          saving={isSavingField(phrase, "cefr")}
                        />
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, minWidth: 220, maxWidth: 360 }}>
                        <EditableCell
                          multiline
                          isEditing={isEditing}
                          value={phrase.notes ?? ""}
                          onBlur={(value) => updateField(phrase.id, "notes", value)}
                          saving={isSavingField(phrase, "notes")}
                        />
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, width: 60, px: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => toggleEditRow(phrase.id)}
                          sx={{ color: isEditing ? "#b8860b" : "#7a6e65" }}
                        >
                          {isEditing ? <Check sx={{ fontSize: "1.1rem" }} /> : <Edit sx={{ fontSize: "1.1rem" }} />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <PhraseDialog
        phrase={dialogPhrase}
        isEditing={dialogEditing}
        onClose={closeDialog}
        onToggleEdit={() => setDialogEditing((v) => !v)}
        onUpdate={handleDialogUpdate}
        saving={saving}
      />
    </Box>
  )
}

interface PhraseDialogProps {
  phrase: PhraseRow | null
  isEditing: boolean
  onClose: () => void
  onToggleEdit: () => void
  onUpdate: (field: EditablePhraseField, value: string) => Promise<void>
  saving: Record<string, boolean>
}

function PhraseDialog({ phrase, isEditing, onClose, onToggleEdit, onUpdate, saving }: PhraseDialogProps) {
  if (!phrase) return null

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
          fontSize: "1.6rem",
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
        Phrase details
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={onToggleEdit} sx={{ color: isEditing ? "#b8860b" : "#7a6e65" }}>
            {isEditing ? <Check sx={{ fontSize: "1.2rem" }} /> : <Edit sx={{ fontSize: "1.2rem" }} />}
          </IconButton>
          <IconButton onClick={onClose} size="small" sx={{ color: "#7a6e65" }}>
            <Close sx={{ fontSize: "1.2rem" }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
        <Box sx={{ display: "grid", gap: 2 }}>
          <DialogField label="ID" value={String(phrase.id)} readOnly />
          <DialogField
            label="Phrase AR"
            value={phrase.phrase_ar_di}
            arabic
            isEditing={isEditing}
            saving={saving[`${phrase.id}-phrase_ar_di`]}
            onBlur={(value) => onUpdate("phrase_ar_di", value)}
          />
          <DialogField
            label="Transliteration"
            value={phrase.phrase_tr}
            isEditing={isEditing}
            saving={saving[`${phrase.id}-phrase_tr`]}
            onBlur={(value) => onUpdate("phrase_tr", value)}
          />
          <DialogField
            label="English"
            value={phrase.english}
            isEditing={isEditing}
            saving={saving[`${phrase.id}-english`]}
            onBlur={(value) => onUpdate("english", value)}
          />
          <DialogField
            label="CEFR"
            value={phrase.cefr}
            isEditing={isEditing}
            saving={saving[`${phrase.id}-cefr`]}
            onBlur={(value) => onUpdate("cefr", value)}
          />
          <DialogField
            label="Notes"
            value={phrase.notes ?? ""}
            multiline
            isEditing={isEditing}
            saving={saving[`${phrase.id}-notes`]}
            onBlur={(value) => onUpdate("notes", value)}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontFamily: "Jost, sans-serif",
            fontSize: "1.05rem",
            fontWeight: 600,
            borderRadius: "10px",
            borderColor: "rgba(122,110,101,0.3)",
            color: "#7a6e65",
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface DialogFieldProps {
  label: string
  value: string
  onBlur?: (value: string) => void
  saving?: boolean
  arabic?: boolean
  multiline?: boolean
  isEditing?: boolean
  readOnly?: boolean
}

function DialogField({ label, value, onBlur, saving, arabic, multiline, isEditing, readOnly }: DialogFieldProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const canEdit = !readOnly && isEditing

  return (
    <Box>
      <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem", color: "#9e8a7a", fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      {canEdit ? (
        <TextField
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onBlur?.(localValue)}
          size="small"
          fullWidth
          multiline={multiline}
          minRows={multiline ? 3 : undefined}
          slotProps={{
            input: {
              endAdornment: saving ? <CircularProgress size={14} sx={{ color: "#b8860b", ml: 0.5 }} /> : undefined,
            },
          }}
          sx={{
            "& .MuiInputBase-root": {
              borderRadius: "8px",
              fontFamily: arabic ? "'EB Garamond', serif" : "Jost, sans-serif",
              fontSize: arabic ? "1.5rem" : "1.15rem",
              ...(arabic && { direction: "rtl" }),
            },
          }}
        />
      ) : (
        <Typography
          sx={{
            fontFamily: arabic ? "'EB Garamond', serif" : "Jost, sans-serif",
            fontSize: arabic ? "1.6rem" : "1.2rem",
            fontWeight: arabic ? 700 : 400,
            color: arabic ? "#2c1a0e" : "#4a3f36",
            direction: arabic ? "rtl" : undefined,
            textAlign: arabic ? "right" : "left",
            lineHeight: 1.5,
            whiteSpace: multiline ? "pre-line" : "normal",
          }}
        >
          {value || "—"}
        </Typography>
      )}
    </Box>
  )
}

const headerCellSx = {
  fontWeight: 700,
  fontSize: "1.15rem",
  fontFamily: "Jost, sans-serif",
  backgroundColor: "#f5ede0",
  color: "#2c1a0e",
}

const bodyCellSx = {
  verticalAlign: "middle",
  fontFamily: "Jost, sans-serif",
  fontSize: "1.1rem",
}

interface EditableCellProps {
  value: string
  onBlur: (value: string) => void
  saving?: boolean
  arabic?: boolean
  multiline?: boolean
  isEditing: boolean
}

function EditableCell({ value, onBlur, saving, arabic, multiline, isEditing }: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  if (!isEditing) {
    return (
      <Typography
        sx={{
          fontFamily: arabic ? "'EB Garamond', serif" : "Jost, sans-serif",
          fontSize: arabic ? "1.5rem" : "1.1rem",
          fontWeight: arabic ? 700 : 400,
          color: arabic ? "#2c1a0e" : "inherit",
          direction: arabic ? "rtl" : undefined,
          textAlign: arabic ? "right" : "left",
          whiteSpace: multiline ? "pre-line" : "nowrap",
        }}
      >
        {value || "—"}
      </Typography>
    )
  }

  return (
    <TextField
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onBlur(localValue)}
      size="small"
      fullWidth
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      slotProps={{
        input: {
          endAdornment: saving ? (
            <CircularProgress size={14} sx={{ color: "#b8860b", ml: 0.5 }} />
          ) : undefined,
        },
      }}
      sx={{
        "& .MuiInputBase-root": {
          borderRadius: "8px",
          fontFamily: arabic ? "'EB Garamond', serif" : "Jost, sans-serif",
          fontSize: arabic ? "1.5rem" : "1.05rem",
          ...(arabic && { direction: "rtl" }),
        },
      }}
    />
  )
}
