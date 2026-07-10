"use client"

import React, { useState } from "react"
import { Box, Button, Paper, Typography } from "@mui/material"
import { Save, Cancel, Delete } from "@mui/icons-material"
import { type EpisodeMeta } from "@/app/lib/cartoons"
import { createEpisode, updateEpisode, deleteEpisode } from "@/app/actions/admin"
import NativeField from "@/app/admin/components/NativeField"

interface EpisodeEditorProps {
  showId: string
  episode?: EpisodeMeta
  onSaved: () => void
  onCancel: () => void
}

export default function EpisodeEditor({ showId, episode, onSaved, onCancel }: EpisodeEditorProps) {
  const isNew = !episode || !episode.id

  const [slug, setSlug] = useState(episode?.slug ?? "")
  const [title, setTitle] = useState(episode?.title ?? "")
  const [level, setLevel] = useState(episode?.level ?? "")
  const [description, setDescription] = useState(episode?.description ?? "")
  const [youtubeId, setYoutubeId] = useState(episode?.youtubeId ?? "")
  const [tags, setTags] = useState(episode?.tags.join(", ") ?? "")
  const [saving, setSaving] = useState(false)

  const buildPayload = () => ({
    show_id: showId,
    slug: slug.trim(),
    title: title.trim(),
    level: level.trim(),
    description: description.trim() || null,
    youtube_id: youtubeId.trim() || null,
    cover: null,
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
  })

  const handleSave = async () => {
    if (!slug.trim() || !title.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        await createEpisode(buildPayload())
      } else {
        await updateEpisode(episode.id, buildPayload())
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isNew || !episode) return
    if (!confirm("Are you sure you want to delete this episode? This cannot be undone.")) return
    setSaving(true)
    try {
      await deleteEpisode(episode.id)
      onSaved()
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
      <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.1rem", fontWeight: 700, color: "#2c1a0e" }}>
        {isNew ? "New Episode" : "Edit Episode"}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <NativeField label="Slug" value={slug} onChange={setSlug} disabled={saving} />
        <NativeField label="Title" value={title} onChange={setTitle} disabled={saving} />
      </Box>

      <NativeField label="Level" value={level} onChange={setLevel} disabled={saving} />

      <NativeField label="YouTube ID" value={youtubeId} onChange={setYoutubeId} disabled={saving} />
      <NativeField label="Tags (comma separated)" value={tags} onChange={setTags} disabled={saving} />
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
