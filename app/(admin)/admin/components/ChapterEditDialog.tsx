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
  fetchChapterForAdmin,
  createChapter,
  updateChapter,
  deleteChapter,
  type BookRow,
  type ChapterWithContent,
  type ChapterInput,
} from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"

interface ChapterEditDialogProps {
  open: boolean
  onClose: () => void
  chapterId: string | null
  bookId?: string
  books: BookRow[]
  onSaved?: () => void
  onDeleted?: () => void
}

const defaultContent = JSON.stringify([], null, 2)

export default function ChapterEditDialog({
  open,
  onClose,
  chapterId,
  bookId: initialBookId,
  books,
  onSaved,
  onDeleted,
}: ChapterEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)

  const [bookId, setBookId] = useState("")
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [chapterNumber, setChapterNumber] = useState("")
  const [contentJson, setContentJson] = useState(defaultContent)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const isNew = chapterId === null

  useEffect(() => {
    if (!open) return
    setTab(0)
    setError(null)
    setBookId(initialBookId ?? "")

    if (isNew) {
      setSlug("")
      setTitle("")
      setChapterNumber("")
      setContentJson(defaultContent)
      return
    }

    setLoading(true)
    fetchChapterForAdmin(chapterId!)
      .then((row: ChapterWithContent | null) => {
        if (!row) {
          setError("Chapter not found")
          return
        }
        setBookId(row.book_id)
        setSlug(row.slug)
        setTitle(row.title)
        setChapterNumber(String(row.chapter_number))
        setContentJson(JSON.stringify(row.content ?? [], null, 2))
      })
      .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to load chapter"))
      .finally(() => setLoading(false))
  }, [open, chapterId, isNew, initialBookId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let content: unknown
      try {
        content = JSON.parse(contentJson)
      } catch {
        throw new Error("Chapter content JSON is invalid")
      }

      const chapterNum = Number(chapterNumber)
      if (Number.isNaN(chapterNum)) {
        throw new Error("Chapter number must be a number")
      }

      const input: ChapterInput = {
        book_id: bookId,
        slug,
        title,
        chapter_number: chapterNum,
        content: content as Record<string, unknown>,
      }

      if (isNew) {
        await createChapter(input)
      } else {
        await updateChapter(chapterId!, input)
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
    if (!confirm("Delete this chapter? This cannot be undone.")) return
    try {
      await deleteChapter(chapterId!)
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
        {isNew ? "New Chapter" : "Edit Chapter"}
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
              <Tab label="Content JSON" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.95rem" }} />
            </Tabs>

            {tab === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="book-select-label" shrink sx={{ fontSize: "0.95rem" }}>
                    Book
                  </InputLabel>
                  <Select
                    labelId="book-select-label"
                    value={bookId}
                    label="Book"
                    onChange={(e) => setBookId(e.target.value)}
                    sx={{ fontSize: "1rem" }}
                  >
                    {books.map((b) => (
                      <MenuItem key={b.id} value={b.id} sx={{ fontSize: "1rem" }}>
                        {b.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <AdminTextField label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} fullWidth size="small" />
                  <AdminTextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth size="small" />
                </Box>
                <AdminTextField
                  label="Chapter number"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  fullWidth
                  size="small"
                  type="number"
                />
              </Box>
            )}

            {tab === 1 && (
              <AdminTextField
                label="Chapter content JSON"
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
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
