"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  TextField,
  CircularProgress,
  Button,
} from "@mui/material"
import { Close, Edit, Check } from "@mui/icons-material"
import { type TokenRow, type EditableTokenField } from "@/app/lib/admin-headwords"

interface TokenHeadwordDialogProps {
  open: boolean
  row: TokenRow | null
  isEditing: boolean
  onClose: () => void
  onToggleEdit: () => void
  onUpdateToken: (field: EditableTokenField, value: string) => Promise<void>
  onUpdateHansDefinition: (value: string) => Promise<void>
  savingTokenField: string | null
  savingHans: boolean
}

export default function TokenHeadwordDialog({
  open,
  row,
  isEditing,
  onClose,
  onToggleEdit,
  onUpdateToken,
  onUpdateHansDefinition,
  savingTokenField,
  savingHans,
}: TokenHeadwordDialogProps) {
  if (!row) return null
  const { token, entry } = row

  return (
    <Dialog
      open={open}
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
        Word details
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={onToggleEdit}
            sx={{ color: isEditing ? "#b8860b" : "#7a6e65" }}
          >
            {isEditing ? <Check sx={{ fontSize: "1.2rem" }} /> : <Edit sx={{ fontSize: "1.2rem" }} />}
          </IconButton>
          <IconButton onClick={onClose} size="small" sx={{ color: "#7a6e65" }}>
            <Close sx={{ fontSize: "1.2rem" }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
        <Box sx={{ display: "grid", gap: 2 }}>
          <DialogField
            label="Arabic"
            value={token.arabic || token.plain || ""}
            arabic
            isEditing={isEditing}
            saving={savingTokenField === "arabic"}
            onBlur={(value) => onUpdateToken("arabic", value)}
          />
          <DialogField
            label="Headword (content)"
            value={token.headword}
            isEditing={isEditing}
            saving={savingTokenField === "headword"}
            onBlur={(value) => onUpdateToken("headword", value)}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <DialogField
              label="POS"
              value={token.pos ?? ""}
              isEditing={isEditing}
              saving={savingTokenField === "pos"}
              onBlur={(value) => onUpdateToken("pos", value)}
            />
            <DialogField
              label="CEFR"
              value={token.cefr ?? ""}
              isEditing={isEditing}
              saving={savingTokenField === "cefr"}
              onBlur={(value) => onUpdateToken("cefr", value)}
            />
          </Box>
          <DialogField
            label="English"
            value={token.english ?? ""}
            isEditing={isEditing}
            saving={savingTokenField === "english"}
            onBlur={(value) => onUpdateToken("english", value)}
          />
          <DialogField
            label="Transliteration"
            value={token.transliteration}
            isEditing={isEditing}
            saving={savingTokenField === "transliteration"}
            onBlur={(value) => onUpdateToken("transliteration", value)}
          />

          <Box sx={{ borderTop: "1px solid rgba(122,110,101,0.15)", pt: 2, mt: 0.5 }}>
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem", color: "#9e8a7a", fontWeight: 600, mb: 1 }}>
              Hans Wehr
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
              <ReadOnlyField label="Headword (Hans)" value={entry?.word} arabic />
              <ReadOnlyField label="HW ID" value={entry?.id} />
            </Box>
            <DialogField
              label="Hans Definition"
              value={entry?.definition ?? ""}
              isEditing={isEditing && entry != null}
              saving={savingHans}
              onBlur={(value) => entry && onUpdateHansDefinition(value)}
              multiline
            />
          </Box>
        </Box>
      </DialogContent>

      <Box sx={{ px: 2.5, pb: 2.5, display: "flex", justifyContent: "flex-end" }}>
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
      </Box>
    </Dialog>
  )
}

interface DialogFieldProps {
  label: string
  value: string
  onBlur: (value: string) => void
  saving?: boolean
  arabic?: boolean
  multiline?: boolean
  isEditing: boolean
}

function DialogField({ label, value, onBlur, saving, arabic, multiline, isEditing }: DialogFieldProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <Box>
      <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem", color: "#9e8a7a", fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      {isEditing ? (
        <TextField
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onBlur(localValue)}
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

function ReadOnlyField({ label, value, arabic }: { label: string; value?: React.ReactNode; arabic?: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem", color: "#9e8a7a", fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: arabic ? "'EB Garamond', serif" : "Jost, sans-serif",
          fontSize: arabic ? "1.5rem" : "1.2rem",
          fontWeight: arabic ? 700 : 600,
          color: "#2c1a0e",
          direction: arabic ? "rtl" : undefined,
          textAlign: arabic ? "right" : "left",
        }}
      >
        {value ?? "—"}
      </Typography>
    </Box>
  )
}
