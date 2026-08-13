"use client"

import React, { useState } from "react"
import { Box, Button, Paper, Typography } from "@mui/material"
import { Save, Cancel, Delete } from "@mui/icons-material"
import { type ShowMeta } from "@/app/lib/cartoons"
import { createShow, updateShow, deleteShow } from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"
import NativeField from "@/app/(admin)/admin/components/NativeField"

interface ShowEditorProps {
  show?: ShowMeta
  onSaved: () => void
  onCancel: () => void
}

const emptyShow: ShowMeta = {
  id: "",
  slug: "",
  title: "",
  titleAr: "",
  description: "",
  cover: "",
  level: "",
  episodeCount: 0,
  category: "",
}

export default function ShowEditor({ show, onSaved, onCancel }: ShowEditorProps) {
  const isNew = !show || !show.id
  const initial = show ?? emptyShow

  const [slug, setSlug] = useState(initial.slug)
  const [title, setTitle] = useState(initial.title)
  const [titleAr, setTitleAr] = useState(initial.titleAr ?? "")
  const [description, setDescription] = useState(initial.description ?? "")
  const [level, setLevel] = useState(initial.level ?? "")
  const [category, setCategory] = useState(initial.category ?? "")
  const [saving, setSaving] = useState(false)

  const buildPayload = () => ({
    slug: slug.trim(),
    title: title.trim(),
    title_ar: titleAr.trim() || null,
    description: description.trim() || null,
    level: level.trim(),
    category: category.trim() || null,
  })

  const handleSave = async () => {
    if (!slug.trim() || !title.trim()) return
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isNew) {
        await createShow(payload)
      } else {
        await updateShow(initial.id, payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isNew) return
    if (!confirm("Are you sure you want to delete this show? This cannot be undone.")) return
    setSaving(true)
    try {
      await deleteShow(initial.id)
      onSaved()
    } catch (e: unknown) {
      alert(errorMessage(e) ?? "Failed to delete show")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: "12px",
        borderLeft: "3px solid #b8860b",
        bgcolor: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: "1.1rem", fontWeight: 600, color: "#2c1a0e" }}>
        {isNew ? "New Show" : "Edit Show"}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <NativeField label="Slug" value={slug} onChange={setSlug} disabled={saving} />
        <NativeField label="Title" value={title} onChange={setTitle} disabled={saving} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <NativeField label="Title Arabic" value={titleAr} onChange={setTitleAr} rtl disabled={saving} />
        <NativeField label="Level" value={level} onChange={setLevel} disabled={saving} />
      </Box>

      <NativeField label="Category" value={category} onChange={setCategory} disabled={saving} />
      <NativeField label="Description" value={description} onChange={setDescription} textarea disabled={saving} />

      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: "auto", pt: 1 }}>
        {!isNew && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Delete />}
            onClick={handleDelete}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              color: "#c0392b",
              borderColor: "rgba(192,57,43,0.3)",
            }}
          >
            Delete
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<Cancel />}
          onClick={onCancel}
          disabled={saving}
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
          disabled={saving || !slug.trim() || !title.trim()}
          sx={{
            textTransform: "none",
            fontFamily: "Jost, sans-serif",
            bgcolor: "#2c1a0e",
            color: "#f5ede0",
            "&:hover": { bgcolor: "#1a0f08" },
          }}
        >
          Save
        </Button>
      </Box>
    </Paper>
  )
}
