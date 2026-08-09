"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
} from "@mui/material"
import { Close, Save, Delete } from "@mui/icons-material"
import AdminTextField from "./AdminTextField"
import {
  fetchShowForAdmin,
  createShow,
  updateShow,
  deleteShow,
  type ShowRow,
  type ShowInput,
} from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"


interface ShowEditDialogProps {
  open: boolean
  onClose: () => void
  showId: string | null
  onSaved?: () => void
  onDeleted?: () => void
}

export default function ShowEditDialog({
  open,
  onClose,
  showId,
  onSaved,
  onDeleted,
}: ShowEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [description, setDescription] = useState("")
  const [level, setLevel] = useState("")
  const [category, setCategory] = useState("")

  const isNew = showId === null

  useEffect(() => {
    if (!open) return
    setError(null)

    if (isNew) {
      setSlug("")
      setTitle("")
      setTitleAr("")
      setDescription("")
      setLevel("")
      setCategory("")
      return
    }

    setLoading(true)
    fetchShowForAdmin(showId!)
      .then((row: ShowRow | null) => {
        if (!row) {
          setError("Show not found")
          return
        }
        setSlug(row.slug)
        setTitle(row.title)
        setTitleAr(row.title_ar ?? "")
        setDescription(row.description ?? "")
        setLevel(row.level)
        setCategory(row.category ?? "")
      })
      .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to load show"))
      .finally(() => setLoading(false))
  }, [open, showId, isNew])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const input: ShowInput = {
        slug,
        title,
        title_ar: titleAr || null,
        description: description || null,
        level,
        category: category || null,
      }

      if (isNew) {
        await createShow(input)
      } else {
        await updateShow(showId!, input)
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
    if (!confirm("Delete this show and its episodes? This cannot be undone.")) return
    try {
      await deleteShow(showId!)
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
      maxWidth="sm"
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
        {isNew ? "New Show" : "Edit Show"}
        <IconButton onClick={onClose} size="small" sx={{ color: "#7a6e65", mr: -0.5 }}>
          <Close sx={{ fontSize: "1.2rem" }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
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
              mb: 2,
            }}
          >
            {error}
          </Typography>
        )}

        {!loading && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <AdminTextField label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} fullWidth size="small" />
            <AdminTextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth size="small" />
            <AdminTextField label="Title Arabic" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} fullWidth size="small" />
            <AdminTextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} size="small" />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <AdminTextField label="Level" value={level} onChange={(e) => setLevel(e.target.value)} fullWidth size="small" />
              <AdminTextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth size="small" />
            </Box>
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
