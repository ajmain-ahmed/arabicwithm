"use client"

import React, { useEffect, useMemo, useState } from "react"
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
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material"
import { Close, Save, Delete, Edit, Add } from "@mui/icons-material"
import AdminTextField from "./AdminTextField"
import {
  fetchEpisodeForAdmin,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  fetchVocabMatchesForWords,
  type ShowRow,
  type EpisodeWithTranscript,
  type EpisodeInput,
} from "@/app/actions/admin"
import { type RawVocabRow } from "@/app/actions/vocab"
import VocabEditDialog from "./VocabEditDialog"

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong"
}

interface EpisodeEditDialogProps {
  open: boolean
  onClose: () => void
  episodeId: string | null
  showId?: string
  shows: ShowRow[]
  onSaved?: () => void
  onDeleted?: () => void
}

const defaultTranscript = JSON.stringify(
  { scriptBlocks: [], vocabList: [], grammarPoints: [] },
  null,
  2
)

type TranscriptWord = {
  db?: string
  arabic?: string
  plain?: string
  english?: string
  transliteration?: string
  cefr?: string
}

type ScriptBlock = {
  title?: string
  words?: TranscriptWord[]
}

type GrammarPoint = {
  number?: number
  pattern: string
  explanation: string
  example: string
}

function primaryGloss(definitions: unknown): string {
  const parsed = Array.isArray(definitions) ? definitions : []
  const first = parsed[0] as Record<string, string> | undefined
  return first?.directEnglish ?? first?.english ?? ""
}

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
  const [youtubeShort, setYoutubeShort] = useState(false)
  const [cover, setCover] = useState("")
  const [episodeNumber, setEpisodeNumber] = useState("")
  const [transcriptJson, setTranscriptJson] = useState(defaultTranscript)
  const [grammarPoints, setGrammarPoints] = useState<GrammarPoint[]>([])

  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)
  const [wordMatches, setWordMatches] = useState<Record<string, RawVocabRow>>({})
  const [vocabDialogOpen, setVocabDialogOpen] = useState(false)
  const [vocabWordId, setVocabWordId] = useState<number | null>(null)
  const [vocabInitialData, setVocabInitialData] = useState<Partial<RawVocabRow> | undefined>()

  const isNew = episodeId === null

  useEffect(() => {
    if (!open) return
    setTab(0)
    setError(null)
    setWordsError(null)
    setWordMatches({})
    setShowId(initialShowId ?? "")

    if (isNew) {
      setSlug("")
      setTitle("")
      setLevel("")
      setTags("")
      setDescription("")
      setYoutubeId("")
      setYoutubeShort(false)
      setCover("")
      setEpisodeNumber("")
      setTranscriptJson(defaultTranscript)
      setGrammarPoints([])
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
        setYoutubeShort(row.youtube_short)
        setCover(row.cover ?? "")
        setEpisodeNumber(String(row.episode_number))
        setTranscriptJson(JSON.stringify(row.transcript ?? { scriptBlocks: [], vocabList: [], grammarPoints: [] }, null, 2))
        setGrammarPoints(Array.isArray(row.transcript?.grammarPoints) ? (row.transcript.grammarPoints as GrammarPoint[]) : [])
      })
      .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to load episode"))
      .finally(() => setLoading(false))
  }, [open, episodeId, isNew, initialShowId])

  const parsedTranscript = useMemo(() => {
    try {
      return JSON.parse(transcriptJson) as Record<string, unknown>
    } catch {
      return null
    }
  }, [transcriptJson])

  const scriptBlocks = useMemo<ScriptBlock[]>(() => {
    const blocks = parsedTranscript?.scriptBlocks
    return Array.isArray(blocks) ? blocks : []
  }, [parsedTranscript])

  useEffect(() => {
    const gp = parsedTranscript?.grammarPoints
    setGrammarPoints(Array.isArray(gp) ? (gp as GrammarPoint[]) : [])
  }, [parsedTranscript])

  const updateGrammarPoint = (index: number, field: keyof GrammarPoint, value: string) => {
    try {
      const obj = JSON.parse(transcriptJson) as Record<string, unknown>
      const current = Array.isArray(obj.grammarPoints) ? [...obj.grammarPoints] : []
      const item = { ...(current[index] as Record<string, unknown>) }
      if (field === "number") {
        item.number = value === "" ? undefined : Number(value)
      } else {
        item[field] = value
      }
      current[index] = item
      obj.grammarPoints = current
      setTranscriptJson(JSON.stringify(obj, null, 2))
    } catch {
      // ignore invalid JSON
    }
  }

  const addGrammarPoint = () => {
    try {
      const obj = JSON.parse(transcriptJson) as Record<string, unknown>
      const current = Array.isArray(obj.grammarPoints) ? [...obj.grammarPoints] : []
      current.push({ pattern: "", explanation: "", example: "" })
      obj.grammarPoints = current
      setTranscriptJson(JSON.stringify(obj, null, 2))
    } catch {
      // ignore invalid JSON
    }
  }

  const removeGrammarPoint = (index: number) => {
    try {
      const obj = JSON.parse(transcriptJson) as Record<string, unknown>
      const current = Array.isArray(obj.grammarPoints) ? [...obj.grammarPoints] : []
      current.splice(index, 1)
      obj.grammarPoints = current
      setTranscriptJson(JSON.stringify(obj, null, 2))
    } catch {
      // ignore invalid JSON
    }
  }

  useEffect(() => {
    if (!open || tab !== 2 || scriptBlocks.length === 0) return

    const keys: { di?: string; plain?: string }[] = []
    for (const block of scriptBlocks) {
      for (const word of block.words ?? []) {
        const di = word.db?.trim() || word.arabic?.trim()
        const plain = word.plain?.trim()
        if (di || plain) keys.push({ di, plain })
      }
    }

    if (keys.length === 0) {
      setWordMatches({})
      return
    }

    setWordsLoading(true)
    setWordsError(null)
    fetchVocabMatchesForWords(keys)
      .then((matches) => setWordMatches(matches))
      .catch((e: unknown) => setWordsError(errorMessage(e) ?? "Failed to load word matches"))
      .finally(() => setWordsLoading(false))
  }, [open, tab, scriptBlocks])

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
        youtube_short: youtubeShort,
        cover: cover || null,
        episode_number: episodeNumber ? Number(episodeNumber) : 0,
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

  const openEditVocab = (row: RawVocabRow) => {
    setVocabWordId(row.word_id)
    setVocabInitialData(undefined)
    setVocabDialogOpen(true)
  }

  const openCreateVocab = (word: TranscriptWord) => {
    setVocabWordId(null)
    setVocabInitialData({
      word_ar: word.plain?.trim() || "",
      word_di: word.db?.trim() || word.arabic?.trim() || "",
      word_tr: word.transliteration?.trim() || "",
    })
    setVocabDialogOpen(true)
  }

  const wordKey = (word: TranscriptWord) =>
    word.db?.trim() || word.arabic?.trim() || word.plain?.trim() || ""

  return (
    <>
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
              <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
                <Tab label="Details" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
                <Tab label="Transcript JSON" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
                <Tab label="Words" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
                <Tab label="Grammar" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
              </Tabs>

              {tab === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="show-select-label" shrink>Show</InputLabel>
                    <Select
                      labelId="show-select-label"
                      value={showId}
                      label="Show"
                      onChange={(e) => setShowId(e.target.value)}
                    >
                      {shows.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <AdminTextField label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} fullWidth size="small" />
                    <AdminTextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth size="small" />
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <AdminTextField label="Level" value={level} onChange={(e) => setLevel(e.target.value)} fullWidth size="small" />
                    <AdminTextField label="Episode number" type="number" value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} fullWidth size="small" />
                  </Box>
                  <AdminTextField label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} fullWidth size="small" />
                  <AdminTextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} size="small" />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <AdminTextField label="YouTube ID" value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} fullWidth size="small" />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={youtubeShort}
                          onChange={(e) => setYoutubeShort(e.target.checked)}
                          sx={{ color: "#7a6e65" }}
                        />
                      }
                      label="YouTube Short"
                      sx={{ fontFamily: "Jost, sans-serif", color: "#2c1a0e" }}
                    />
                  </Box>
                  <AdminTextField label="Cover URL" value={cover} onChange={(e) => setCover(e.target.value)} fullWidth size="small" />
                </Box>
              )}

              {tab === 1 && (
                <AdminTextField
                  label="Transcript JSON"
                  value={transcriptJson}
                  onChange={(e) => setTranscriptJson(e.target.value)}
                  fullWidth
                  multiline
                  rows={18}
                  size="small"
                 
                />
              )}

              {tab === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {!parsedTranscript ? (
                    <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#c0392b" }}>
                      Transcript JSON is invalid. Fix it on the Transcript JSON tab to view words.
                    </Typography>
                  ) : scriptBlocks.length === 0 ? (
                    <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                      No script blocks found in this transcript.
                    </Typography>
                  ) : (
                    <>
                      {wordsError && (
                        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#c0392b" }}>
                          {wordsError}
                        </Typography>
                      )}
                      {wordsLoading && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                          <CircularProgress size={28} sx={{ color: "#b8860b" }} />
                        </Box>
                      )}
                      {scriptBlocks.map((block, blockIdx) => {
                        const words = block.words ?? []
                        if (words.length === 0) return null
                        return (
                          <Box key={blockIdx} sx={{ mb: 2 }}>
                            <Typography
                              sx={{
                                fontFamily: "Jost, sans-serif",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                color: "#7a6e65",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                mb: 1.5,
                              }}
                            >
                              {block.title || `Block ${blockIdx + 1}`}
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                              {words.map((word, wordIdx) => {
                                const key = wordKey(word)
                                const match = key ? wordMatches[key] : undefined
                                return (
                                  <Box
                                    key={wordIdx}
                                    sx={{
                                      p: 1.5,
                                      borderRadius: "12px",
                                      border: "1px solid rgba(122,110,101,0.15)",
                                      bgcolor: "#fafafa",
                                      display: "flex",
                                      flexDirection: { xs: "column", sm: "row" },
                                      gap: 2,
                                      alignItems: { xs: "flex-start", sm: "center" },
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography
                                        sx={{
                                          fontFamily: "'EB Garamond', serif",
                                          fontSize: "1.15rem",
                                          color: "#2c1a0e",
                                          direction: "rtl",
                                          cursor: "pointer",
                                          display: "inline-block",
                                          "&:hover": { color: "#b8860b" },
                                        }}
                                        onClick={() =>
                                          match ? openEditVocab(match) : openCreateVocab(word)
                                        }
                                        title={match ? "Edit vocab entry" : "Create vocab entry"}
                                      >
                                        {word.arabic || word.db || word.plain || "—"}
                                      </Typography>
                                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                                        {word.plain && word.plain !== word.arabic && (
                                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65" }}>
                                            plain: {word.plain}
                                          </Typography>
                                        )}
                                        {word.english && (
                                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65" }}>
                                            en: {word.english}
                                          </Typography>
                                        )}
                                        {word.transliteration && (
                                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65", fontStyle: "italic" }}>
                                            {word.transliteration}
                                          </Typography>
                                        )}
                                        {word.cefr && (
                                          <Chip label={word.cefr} size="small" sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.7rem", height: 20 }} />
                                        )}
                                      </Box>
                                    </Box>

                                    <Box
                                      sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        borderLeft: { xs: "none", sm: "1px solid rgba(122,110,101,0.12)" },
                                        pl: { xs: 0, sm: 2 },
                                        pt: { xs: 1, sm: 0 },
                                        borderTop: { xs: "1px solid rgba(122,110,101,0.12)", sm: "none" },
                                      }}
                                    >
                                      {match ? (
                                        <>
                                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.85rem", color: "#2c1a0e" }}>
                                            <strong>DB:</strong> {match.word_di || match.word_ar}
                                          </Typography>
                                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65" }}>
                                            {match.level} · {match.theme}
                                            {match.root ? ` · root: ${match.root}` : ""}
                                          </Typography>
                                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65" }}>
                                            gloss: {primaryGloss(match.definitions) || "—"}
                                          </Typography>
                                        </>
                                      ) : (
                                        <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.85rem", color: "#c0392b" }}>
                                          Not in vocabulary DB
                                        </Typography>
                                      )}
                                    </Box>

                                    <Box sx={{ flexShrink: 0 }}>
                                      <Button
                                        size="small"
                                        startIcon={match ? <Edit sx={{ fontSize: "0.9rem" }} /> : <Add sx={{ fontSize: "0.9rem" }} />}
                                        onClick={() => (match ? openEditVocab(match) : openCreateVocab(word))}
                                        sx={{
                                          textTransform: "none",
                                          fontFamily: "Jost, sans-serif",
                                          fontWeight: 600,
                                          fontSize: "0.8rem",
                                          color: "#2c1a0e",
                                          borderRadius: "8px",
                                          border: "1px solid rgba(122,110,101,0.25)",
                                          px: 1.5,
                                        }}
                                      >
                                        {match ? "Edit vocab" : "Create vocab"}
                                      </Button>
                                    </Box>
                                  </Box>
                                )
                              })}
                            </Box>
                          </Box>
                        )
                      })}
                    </>
                  )}
                </Box>
              )}

              {tab === 3 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {!parsedTranscript ? (
                    <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#c0392b" }}>
                      Transcript JSON is invalid. Fix it on the Transcript JSON tab to edit grammar notes.
                    </Typography>
                  ) : (
                    <>
                      {grammarPoints.length === 0 && (
                        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                          No grammar points yet.
                        </Typography>
                      )}
                      {grammarPoints.map((gp, idx) => (
                        <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: "12px", bgcolor: "#fafafa" }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                            <Typography sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#7a6e65" }}>
                              Grammar point {idx + 1}
                            </Typography>
                            <IconButton size="small" onClick={() => removeGrammarPoint(idx)} sx={{ color: "#c0392b" }}>
                              <Delete sx={{ fontSize: "1.1rem" }} />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            <AdminTextField
                              label="Pattern"
                              value={gp.pattern}
                              onChange={(e) => updateGrammarPoint(idx, "pattern", e.target.value)}
                              fullWidth
                              size="small"
                            />
                            <AdminTextField
                              label="Explanation"
                              value={gp.explanation}
                              onChange={(e) => updateGrammarPoint(idx, "explanation", e.target.value)}
                              fullWidth
                              multiline
                              rows={3}
                              size="small"
                            />
                            <AdminTextField
                              label="Example"
                              value={gp.example}
                              onChange={(e) => updateGrammarPoint(idx, "example", e.target.value)}
                              fullWidth
                              multiline
                              rows={2}
                              size="small"
                            />
                          </Box>
                        </Paper>
                      ))}
                      <Button
                        startIcon={<Add />}
                        onClick={addGrammarPoint}
                        sx={{ alignSelf: "flex-start", textTransform: "none", fontFamily: "Jost, sans-serif", color: "#2c1a0e" }}
                      >
                        Add grammar point
                      </Button>
                    </>
                  )}
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

      <VocabEditDialog
        open={vocabDialogOpen}
        onClose={() => setVocabDialogOpen(false)}
        wordId={vocabWordId}
        initialData={vocabInitialData}
        onSaved={() => {
          // refresh matches if still on words tab
          if (tab === 2) {
            setWordsLoading(true)
            const keys: { di?: string; plain?: string }[] = []
            for (const block of scriptBlocks) {
              for (const word of block.words ?? []) {
                const di = word.db?.trim() || word.arabic?.trim()
                const plain = word.plain?.trim()
                if (di || plain) keys.push({ di, plain })
              }
            }
            fetchVocabMatchesForWords(keys)
              .then((matches) => setWordMatches(matches))
              .catch((e: unknown) => setWordsError(errorMessage(e) ?? "Failed to refresh matches"))
              .finally(() => setWordsLoading(false))
          }
        }}
      />
    </>
  )
}
