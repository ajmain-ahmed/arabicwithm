"use client"

import React, { useEffect, useRef, useState } from "react"
import { useAdminListCache } from "@/app/(admin)/admin/components/AdminListCacheProvider"
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
  type ChapterInput,
} from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"
import { deleteChapterAudioForAdmin, fetchChapterAudioForAdmin, saveChapterAudioResult, resolveAudiobookForAdmin } from '@/app/actions/audiobooks'
import { readAudioDuration } from '@/app/lib/audioMetadata'
import { normalizeAudiobookSource } from '@/app/lib/audiobookSource'
import { uploadChapterAudio } from '@/app/lib/uploadChapterAudio'
import { validateAudioFile, type AudioLanguage } from '@/app/lib/audioUpload'
import { normalizeYouTubeId } from '@/app/lib/cartoons'
import { removeAudiobookAudio } from '@/app/actions/storage'
import ChapterAudioFields, { audioDraft, emptyAudioDraft, type AudioDraft, type AudioOperation } from './ChapterAudioFields'

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
  const cache = useAdminListCache()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)

  const [bookId, setBookId] = useState("")
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [chapterNumber, setChapterNumber] = useState("")
  const [contentJson, setContentJson] = useState(defaultContent)
  const [audio, setAudio] = useState<Record<AudioLanguage, AudioDraft>>({ ar: emptyAudioDraft(), en: emptyAudioDraft('en') })
  const busyRef = useRef(false)
  const savedIdRef = useRef<string | null>(chapterId)
  const stagedPaths = useRef(new Set<string>())
  const [operations, setOperations] = useState<Record<AudioLanguage, AudioOperation>>({ ar: { phase: 'idle', percent: 0 }, en: { phase: 'idle', percent: 0 } })
  const laneBusy = useRef({ ar: false, en: false })
  const controllers = useRef<Partial<Record<AudioLanguage, AbortController>>>({})
  const audioBaseline = useRef<Record<AudioLanguage, string>>({ ar: '', en: '' })
  const chapterBaseline = useRef('')
  const audioUploading = operations.ar.phase === 'uploading' || operations.en.phase === 'uploading' || operations.ar.phase === 'saving' || operations.en.phase === 'saving' || operations.ar.phase === 'authorizing' || operations.en.phase === 'authorizing'
  const fingerprint = (draft: AudioDraft) => JSON.stringify([draft.source, draft.sourceInput, draft.youtubeId, draft.duration, draft.narrator, draft.published])
  const setOperation = (language: AudioLanguage, operation: AudioOperation) => setOperations(current => ({ ...current, [language]: operation }))
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const isNew = chapterId === null

  useEffect(() => {
    const paths = stagedPaths.current
    const activeControllers = controllers.current
    return () => {
      for (const controller of Object.values(activeControllers)) controller.abort()
      for (const path of paths) void removeAudiobookAudio(path).catch(() => {
        console.warn('[chapter audio] Unreferenced upload cleanup needs retry.')
      })
      paths.clear()
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setTab(0)
    setLoading(false)
    setError(null)
    setBookId(initialBookId ?? "")
    savedIdRef.current = chapterId
    const empty = { ar: emptyAudioDraft(), en: emptyAudioDraft('en') }
    setAudio(empty)
    audioBaseline.current = { ar: fingerprint(empty.ar), en: fingerprint(empty.en) }
    setOperations({ ar: { phase: 'idle', percent: 0 }, en: { phase: 'idle', percent: 0 } })

    if (isNew) {
      setSlug("")
      setTitle("")
      setChapterNumber("")
      setContentJson(defaultContent)
      return
    }

    let active = true
    setLoading(true)
    Promise.all([fetchChapterForAdmin(chapterId!), fetchChapterAudioForAdmin(chapterId!, 'ar'), fetchChapterAudioForAdmin(chapterId!, 'en')])
      .then(([row, arabic, english]) => {
        if (!active) return
        if (!row) { setError("Chapter not found"); return }
        setBookId(row.book_id); setSlug(row.slug); setTitle(row.title)
        setChapterNumber(String(row.chapter_number)); setContentJson(JSON.stringify(row.content ?? [], null, 2))
        const loaded = { ar: audioDraft(arabic, 'ar'), en: audioDraft(english, 'en') }
        setAudio(loaded)
        audioBaseline.current = { ar: fingerprint(loaded.ar), en: fingerprint(loaded.en) }
        chapterBaseline.current = JSON.stringify([row.book_id, row.slug, row.title, String(row.chapter_number), JSON.stringify(row.content ?? [], null, 2)])
      })
      .catch((e: unknown) => { if (active) setError(errorMessage(e) ?? "Failed to load chapter and audio") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, chapterId, isNew, initialBookId])

  const handleSave = async () => {
    if (busyRef.current || laneBusy.current.ar || laneBusy.current.en) return
    busyRef.current = true
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

      // Normalize locally: a pasted path must not wait for media metadata or upload.
      for (const language of ['ar', 'en'] as const) {
        const draft = audio[language]
        if (draft.source !== 'youtube' && draft.sourceInput.trim() && !draft.file) prepareAudioLink(draft)
        if (draft.file) await validateAudioFile(draft.file, draft.file.name)
        if (draft.source === 'youtube' && draft.youtubeId && !normalizeYouTubeId(draft.youtubeId)) throw new Error(`${language === 'ar' ? 'Arabic' : 'English'} YouTube URL or video ID is invalid.`)
      }
      const detailsChanged = chapterBaseline.current !== JSON.stringify([bookId, slug, title, chapterNumber, contentJson])
      if (!savedIdRef.current) savedIdRef.current = await createChapter(input)
      else if (detailsChanged) await updateChapter(savedIdRef.current, input)
      for (const language of ['ar', 'en'] as const) {
        const draft = audio[language]
        if ((draft.file || fingerprint(draft) !== audioBaseline.current[language]) && (draft.exists || draft.file || draft.sourceInput.trim() || draft.youtubeId.trim())) {
          await persistAudio(language, draft, savedIdRef.current)
        }
      }

      if (detailsChanged || isNew) { cache.invalidate("books"); onSaved?.() }
      cleanupStagedUploads()
      onClose()
    } catch (e: unknown) {
      const message = errorMessage(e) ?? 'Save failed'
      setError(isNew && savedIdRef.current ? `Chapter created; audio is not fully saved. Retry Save in this dialog. ${message}` : message)
    } finally {
      setSaving(false)
      busyRef.current = false
    }
  }

  function cleanupStagedUploads() {
    const paths = [...stagedPaths.current]
    stagedPaths.current.clear()
    for (const path of paths) void removeAudiobookAudio(path).catch(() => {
      console.warn('[chapter audio] Unreferenced upload cleanup needs retry.')
    })
  }

  function handleClose() {
    if (saving || audioUploading || busyRef.current || laneBusy.current.ar || laneBusy.current.en) return
    cleanupStagedUploads()
    if (savedIdRef.current && isNew) { cache.invalidate('books'); onSaved?.() }
    onClose()
  }

  function prepareAudioLink(draft: AudioDraft): AudioDraft {
    if (!draft.sourceInput.trim()) throw new Error('Enter an audio path or URL, or use Remove audiobook to unlink it.')
    const resolved = normalizeAudiobookSource(draft.sourceInput, process.env.NEXT_PUBLIC_SUPABASE_URL!)
    const input = resolved.storagePath ? `${resolved.storageBucket}/${resolved.storagePath}` : resolved.externalUrl!
    return { ...draft, source: resolved.externalUrl ? 'external_url' : 'supabase_storage', path: resolved.storagePath, bucket: resolved.storageBucket, externalUrl: resolved.externalUrl, sourceInput: input, linkedInput: input, file: null, preview: null }
  }

  async function persistAudio(language: AudioLanguage, initial: AudioDraft, id: string) {
    if (laneBusy.current[language]) throw new Error('This language is already saving.')
    laneBusy.current[language] = true
    let draft = initial
    let percent = 0
    try {
      if (draft.file) {
        const controller = new AbortController()
        controllers.current[language] = controller
        setOperation(language, { phase: 'authorizing', percent: 0 })
        const path = await uploadChapterAudio(id, language, draft.file, {
          signal: controller.signal,
          onAuthorized: () => setOperation(language, { phase: 'uploading', percent: 0 }),
          onProgress: value => { percent = value; setOperation(language, { phase: 'uploading', percent: value }) },
        })
        stagedPaths.current.add(path)
        draft = { ...draft, path, bucket: 'audiobooks', source: 'supabase_storage', sourceInput: `audiobooks/${path}`, linkedInput: `audiobooks/${path}`, file: null, externalUrl: null, preview: null }
        // Retain the uploaded key for a metadata-save retry; never upload it twice.
        setAudio(current => ({ ...current, [language]: draft }))
      } else if (draft.source !== 'youtube') draft = prepareAudioLink(draft)
      setOperation(language, { phase: 'saving', percent })
      const result = await saveChapterAudioResult({
        chapterId: id, language, sourceType: draft.source,
        storagePath: draft.source === 'supabase_storage' ? draft.path : null,
        storageBucket: draft.source === 'supabase_storage' ? draft.bucket ?? 'audiobooks' : null,
        externalUrl: draft.source === 'external_url' ? draft.externalUrl : null,
        externalVideoId: draft.source === 'youtube' ? normalizeYouTubeId(draft.youtubeId) ?? null : null,
        durationSeconds: draft.duration.trim() ? Number(draft.duration) : null,
        narrator: draft.narrator.trim() || null, isPublished: draft.published,
      })
      if (!result.ok) throw new Error(result.error)
      if (draft.path) stagedPaths.current.delete(draft.path)
      draft = { ...draft, exists: true, status: 'Audio saved' }
      audioBaseline.current[language] = fingerprint(draft)
      setAudio(current => ({ ...current, [language]: draft }))
      setOperation(language, { phase: 'saved', percent: 100 })
    } catch (cause) {
      const message = `${language === 'ar' ? 'Arabic' : 'English'} audio: ${errorMessage(cause) ?? 'Save failed. Please retry.'}`
      setOperation(language, { phase: 'error', percent, error: message })
      throw new Error(message)
    } finally {
      laneBusy.current[language] = false
      delete controllers.current[language]
    }
  }

  const handleAudioLink = async (language: AudioLanguage) => {
    if (busyRef.current || laneBusy.current[language]) return
    setError(null)
    if (!savedIdRef.current) {
      try {
        const draft = audio[language]
        if (draft.source === 'youtube' && !normalizeYouTubeId(draft.youtubeId)) throw new Error('Enter a valid YouTube URL or video ID.')
        const linked = draft.source === 'youtube' ? draft : prepareAudioLink(draft)
        setAudio(current => ({ ...current, [language]: { ...linked, status: 'Ready. Save the new chapter to attach audio.' } }))
      } catch (cause) { setOperation(language, { phase: 'error', percent: 0, error: errorMessage(cause) ?? 'Invalid source.' }) }
      return
    }
    try { await persistAudio(language, audio[language], savedIdRef.current) }
    catch { /* The language section displays the actionable failure. */ }
  }

  const handleAudioSelection = async (language: AudioLanguage, file: File) => {
    if (busyRef.current || laneBusy.current[language]) return
    laneBusy.current[language] = true
    if (savedIdRef.current) setOperation(language, { phase: 'authorizing', percent: 0 })
    try {
      await validateAudioFile(file, file.name)
      laneBusy.current[language] = false
      const draft = { ...audio[language], file, source: 'supabase_storage' as const, externalUrl: null, bucket: 'audiobooks', preview: null, duration: '', status: 'File ready' }
      setAudio(current => ({ ...current, [language]: draft }))
      // Local metadata is optional and only used for a new chapter's deferred upload.
      if (!savedIdRef.current) {
        const duration = await readAudioDuration(file)
        setAudio(current => current[language].file === file ? ({ ...current, [language]: { ...current[language], duration: duration ? String(duration) : '' } }) : current)
      } else {
        try { await persistAudio(language, draft, savedIdRef.current) }
        catch { /* persistAudio retains the actual progress and failure. */ }
      }
    } catch (cause) {
      laneBusy.current[language] = false
      setOperation(language, { phase: 'error', percent: 0, error: errorMessage(cause) ?? 'Unable to upload audio.' })
    }
  }

  const handlePreview = async (language: AudioLanguage) => {
    try {
      const resolved = await resolveAudiobookForAdmin(audio[language].sourceInput)
      if (!resolved.ok) throw new Error(resolved.error)
      setAudio(current => ({ ...current, [language]: { ...current[language], preview: resolved.url } }))
    } catch (cause) { setOperation(language, { phase: 'error', percent: 0, error: errorMessage(cause) ?? 'Preview unavailable.' }) }
  }

  const handleRemoveAudio = async (language: AudioLanguage) => {
    if (busyRef.current || laneBusy.current.ar || laneBusy.current.en) return
    if (!savedIdRef.current) {
      setAudio(current => ({ ...current, [language]: emptyAudioDraft(language) }))
      return
    }
    if (!confirm(`Remove this ${language === 'ar' ? 'Arabic' : 'English'} audiobook?`)) return
    busyRef.current = true
    setSaving(true); setError(null)
    try {
      await deleteChapterAudioForAdmin(savedIdRef.current, language)
      setAudio(current => ({ ...current, [language]: emptyAudioDraft(language) }))
    } catch (cause) { setError(errorMessage(cause) ?? 'Unable to remove audiobook') }
    finally { setSaving(false); busyRef.current = false }
  }

  const handleDelete = async () => {
    if (busyRef.current || laneBusy.current.ar || laneBusy.current.en) return
    if (!savedIdRef.current) return
    if (!confirm("Delete this chapter? This cannot be undone.")) return
    try {
      await deleteChapter(savedIdRef.current!)
      cache.invalidate("books")
      onDeleted?.()
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Delete failed")
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <IconButton onClick={handleClose} disabled={saving || audioUploading} size="small" sx={{ color: "#7a6e65", mr: -0.5 }}>
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
              <Tab label="Audiobook" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.95rem" }} />
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

            {tab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(['ar', 'en'] as const).map(language => <ChapterAudioFields key={language} language={language} value={audio[language]} disabled={saving || laneBusy.current[language] || loading} operation={operations[language]} onCancel={() => controllers.current[language]?.abort()} onRetry={() => void handleAudioLink(language)} onPreview={() => void handlePreview(language)}
                  onChange={value => { setOperation(language, { phase: 'idle', percent: 0 }); setAudio(current => ({ ...current, [language]: value })) }}
                  onLink={() => void handleAudioLink(language)} onFile={file => void handleAudioSelection(language, file)} onRemove={() => void handleRemoveAudio(language)} />)}
              </Box>
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
            disabled={saving || audioUploading || loading}
            startIcon={<Delete sx={{ fontSize: "1rem" }} />}
            sx={{ fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.9rem", textTransform: "none", borderRadius: "10px", order: { xs: 2, sm: 0 }, width: { xs: "100%", sm: "auto" } }}
          >
            Delete
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={saving || audioUploading || loading}
          sx={{ fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.9rem", textTransform: "none", borderRadius: "10px", borderColor: "rgba(122,110,101,0.3)", color: "#7a6e65", width: { xs: "100%", sm: "auto" } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || audioUploading || loading}
          startIcon={<Save sx={{ fontSize: "1rem" }} />}
          sx={{ background: "#2c1a0e", color: "#f5ede0", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "0.9rem", textTransform: "none", borderRadius: "10px", width: { xs: "100%", sm: "auto" }, "&:hover": { background: "#1a0f08" } }}
        >
          {audioUploading ? "Audio transfer in progress?" : saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
