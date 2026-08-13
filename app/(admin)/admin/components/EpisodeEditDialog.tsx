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
  Tabs,
  Tab,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  useMediaQuery,
} from "@mui/material"
import { useTheme } from "@mui/material/styles"
import { Close, Save, Delete } from "@mui/icons-material"
import AdminTextField from "./AdminTextField"
import {
  fetchEpisodeForAdmin,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  type ShowRow,
  type EpisodeWithTranscript,
  type EpisodeInput,
} from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"


interface EpisodeEditDialogProps {
  open: boolean
  onClose: () => void
  episodeId: string | null
  showId?: string
  shows: ShowRow[]
  onSaved?: () => void
  onDeleted?: () => void
}

const defaultTranscript = JSON.stringify([], null, 2)

export default function EpisodeEditDialog({
  open,
  onClose,
  episodeId,
  showId: initialShowId,
  shows,
  onSaved,
  onDeleted,
}: EpisodeEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)

  const [showId, setShowId] = useState("")
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [level, setLevel] = useState("")
  const [tags, setTags] = useState("")
  const [description, setDescription] = useState("")
  const [youtubeId, setYoutubeId] = useState("")
  const [transcriptJson, setTranscriptJson] = useState(defaultTranscript)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const isNew = episodeId === null

  useEffect(() => {
    if (!open) return
    setTab(0)
    setError(null)
    setShowId(initialShowId ?? "")

    if (isNew) {
      setSlug("")
      setTitle("")
      setLevel("")
      setTags("")
      setDescription("")
      setYoutubeId("")
      setTranscriptJson(defaultTranscript)
      return
    }

    setLoading(true)
    fetchEpisodeForAdmin(episodeId!)
      .then((row: EpisodeWithTranscript | null) => {
        if (!row) {
          setError("Episode not found")
          return
        }
        setShowId(row.show_id)
        setSlug(row.slug)
        setTitle(row.title)
        setLevel(row.level)
        setTags(row.tags.join(", "))
        setDescription(row.description ?? "")
        setYoutubeId(row.youtube_id ?? "")
        setTranscriptJson(JSON.stringify(row.transcript ?? [], null, 2))
      })
      .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to load episode"))
      .finally(() => setLoading(false))
  }, [open, episodeId, isNew, initialShowId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let transcript: unknown
      try {
        transcript = JSON.parse(transcriptJson)
      } catch {
        throw new Error("Transcript JSON is invalid")
      }

      const input: EpisodeInput = {
        show_id: showId,
        slug,
        title,
        level,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: description || null,
        youtube_id: youtubeId || null,
        transcript: transcript as Record<string, unknown>,
      }

      if (isNew) {
        await createEpisode(input)
      } else {
        await updateEpisode(episodeId!, input)
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
    if (!confirm("Delete this episode? This cannot be undone.")) return
    try {
      await deleteEpisode(episodeId!)
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
      fullScreen={isMobile}
      maxWidth="xl"
      fullWidth={!isMobile}
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : "16px",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(44,26,14,0.2)",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: 'var(--font-heading)',
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#2c1a0e",
          pb: 2,
          pt: 2.5,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {isNew ? "New Episode" : "Edit Episode"}
        <IconButton onClick={onClose} size="small" sx={{ color: "#7a6e65", mr: -0.5 }}>
          <Close sx={{ fontSize: "1.2rem" }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        {error && (
          <Typography
            sx={{
              fontFamily: "Jost, sans-serif",
              fontSize: "0.95rem",
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
            <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
              <Tab label="Details" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.95rem" }} />
              <Tab label="Transcript JSON" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.95rem" }} />
            </Tabs>

            {tab === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="show-select-label" shrink sx={{ fontSize: "0.95rem" }}>
                    Show
                  </InputLabel>
                  <Select
                    labelId="show-select-label"
                    value={showId}
                    label="Show"
                    onChange={(e) => setShowId(e.target.value)}
                    sx={{ fontSize: "1rem" }}
                  >
                    {shows.map((s) => (
                      <MenuItem key={s.id} value={s.id} sx={{ fontSize: "1rem" }}>
                        {s.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <AdminTextField label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} fullWidth size="small" sx={{ "& .MuiInputBase-root": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "0.95rem" } }} />
                  <AdminTextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth size="small" sx={{ "& .MuiInputBase-root": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "0.95rem" } }} />
                </Box>
                <AdminTextField label="Level" value={level} onChange={(e) => setLevel(e.target.value)} fullWidth size="small" sx={{ "& .MuiInputBase-root": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "0.95rem" } }} />
                <AdminTextField label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} fullWidth size="small" sx={{ "& .MuiInputBase-root": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "0.95rem" } }} />
                <AdminTextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} size="small" sx={{ "& .MuiInputBase-root": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "0.95rem" } }} />
                <AdminTextField label="YouTube ID" value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} fullWidth size="small" sx={{ "& .MuiInputBase-root": { fontSize: "1rem" }, "& .MuiInputLabel-root": { fontSize: "0.95rem" } }} />
              </Box>
            )}

            {tab === 1 && (
              <AdminTextField
                label="Transcript JSON"
                value={transcriptJson}
                onChange={(e) => setTranscriptJson(e.target.value)}
                fullWidth
                multiline
                rows={isMobile ? 20 : 30}
                size="small"
                sx={{
                  "& .MuiInputBase-root": {
                    alignItems: "flex-start",
                    fontSize: "1.1rem",
                    overflow: "auto",
                  },
                  "& .MuiInputBase-input": {
                    fontSize: "1.1rem",
                    lineHeight: 1.5,
                    py: 1.5,
                  },
                }}
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
