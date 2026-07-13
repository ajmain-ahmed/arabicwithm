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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import { Close, Save, Delete } from "@mui/icons-material"
import AdminTextField from "./AdminTextField"
import { stripDiacritics } from "@/app/lib/arabic"
import {
  fetchEpisodeForAdmin,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  fetchMissingDefinitions,
  type ShowRow,
  type EpisodeWithTranscript,
  type EpisodeInput,
  type DefinitionKey,
} from "@/app/actions/admin"
import { updateDefinitionLemma } from "@/app/actions/dictionary"
import UndefinedWordWizardDialog from "./UndefinedWordWizardDialog"
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

type TranscriptWord = {
  arabic?: string
  plain?: string
  english?: string
  transliteration?: string
  cefr?: string
  pos?: string
  root?: string | null
  lemma?: string
  entry_type?: string
}

type ScriptBlock = {
  title?: string
  timestamp?: string
  translation?: string
  words?: TranscriptWord[]
}

function getWordFieldAtPath(
  scriptBlocks: ScriptBlock[],
  path: string,
  field: "pos" | "cefr"
): string | undefined {
  const m = path.match(/\[(\d+)\]\.(words|tokens)\[(\d+)\]$/)
  if (!m) return undefined
  const blockIdx = Number(m[1])
  const wordIdx = Number(m[3])
  return scriptBlocks[blockIdx]?.words?.[wordIdx]?.[field]
}

function getSurfaceArabic(
  scriptBlocks: ScriptBlock[],
  lemma: string,
  root: string | null
): string | undefined {
  for (const block of scriptBlocks) {
    for (const word of block.words ?? []) {
      if ((word.lemma?.trim() || word.arabic?.trim()) === lemma && word.root?.trim() === (root ?? "")) {
        return word.arabic?.trim()
      }
    }
  }
  return undefined
}

function amendTranscriptLemma(
  transcript: unknown,
  oldLemma: string,
  root: string | null,
  newLemma: string
): unknown {
  if (Array.isArray(transcript)) {
    return transcript.map((block) => {
      if (!block || typeof block !== "object") return block
      const b = block as Record<string, unknown>
      const tokens = Array.isArray(b.tokens) ? b.tokens : []
      return {
        ...b,
        tokens: tokens.map((t) => {
          if (!t || typeof t !== "object") return t
          const token = t as Record<string, unknown>
          const tokenLemma = typeof token.lemma === "string" ? token.lemma.trim() : ""
          const tokenRoot = typeof token.root === "string" ? token.root.trim() : null
          if (tokenLemma === oldLemma && tokenRoot === (root ?? "")) {
            return { ...token, lemma: newLemma }
          }
          return token
        }),
      }
    })
  }

  if (transcript && typeof transcript === "object") {
    const obj = transcript as Record<string, unknown>
    const scriptBlocks = Array.isArray(obj.scriptBlocks) ? obj.scriptBlocks : []
    return {
      ...obj,
      scriptBlocks: scriptBlocks.map((block) => {
        if (!block || typeof block !== "object") return block
        const b = block as Record<string, unknown>
        const words = Array.isArray(b.words) ? b.words : []
        return {
          ...b,
          words: words.map((w) => {
            if (!w || typeof w !== "object") return w
            const word = w as Record<string, unknown>
            const wordLemma = typeof word.lemma === "string" ? word.lemma.trim() : ""
            const wordRoot = typeof word.root === "string" ? word.root.trim() : null
            if (wordLemma === oldLemma && wordRoot === (root ?? "")) {
              return { ...word, lemma: newLemma }
            }
            return word
          }),
        }
      }),
    }
  }

  return transcript
}

function normalizeAdminTranscript(
  input: Record<string, unknown> | null
): { scriptBlocks: ScriptBlock[]; grammarPoints: unknown[] } {
  if (Array.isArray(input)) {
    return {
      scriptBlocks: input.map((block) => {
        const b = block as Record<string, unknown>
        const tokens = Array.isArray(b.tokens) ? b.tokens : []
        return {
          title: typeof b.translation === "string" ? b.translation : "",
          timestamp: typeof b.timestamp === "string" ? b.timestamp : undefined,
          translation: typeof b.translation === "string" ? b.translation : undefined,
          words: tokens.map((t) => {
            const token = t as Record<string, unknown>
            const arabic = String(token.arabic ?? "")
            const plain = stripDiacritics(arabic)
            const cefrRaw = (token.cefr as string | undefined) || (token.CEFR as string | undefined)
            return {
              arabic,
              plain,
              english: String(token.english ?? ""),
              transliteration: String(token.transliteration ?? ""),
              cefr: cefrRaw ? cefrRaw.trim().toLowerCase() : undefined,
              pos: typeof token.pos === "string" && token.pos.trim() ? token.pos.trim() : undefined,
              root: typeof token.root === "string" && token.root.trim() ? token.root.trim() : null,
              lemma: String(token.lemma ?? ""),
              entry_type: String(token.entry_type ?? ""),
            }
          }),
        }
      }),
      grammarPoints: [],
    }
  }

  const obj = input ?? {}
  return {
    scriptBlocks: Array.isArray(obj.scriptBlocks) ? (obj.scriptBlocks as ScriptBlock[]) : [],
    grammarPoints: [],
  }
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
  const [cover, setCover] = useState("")
  const [transcriptJson, setTranscriptJson] = useState(defaultTranscript)
  const [undefinedLoading, setUndefinedLoading] = useState(false)
  const [undefinedError, setUndefinedError] = useState<string | null>(null)
  const [undefinedDefs, setUndefinedDefs] = useState<DefinitionKey[]>([])
  const [undefinedLocs, setUndefinedLocs] = useState<
    Record<string, { path: string; timestamp?: string; translation?: string }[]>
  >({})
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardDef, setWizardDef] = useState<DefinitionKey | null>(null)



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
      setCover("")
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
        setCover(row.cover ?? "")
        setTranscriptJson(JSON.stringify(row.transcript ?? [], null, 2))
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

  const normalizedTranscript = useMemo(
    () => normalizeAdminTranscript(parsedTranscript),
    [parsedTranscript]
  )
  const scriptBlocks = normalizedTranscript.scriptBlocks

  useEffect(() => {
    if (!open || tab !== 2 || scriptBlocks.length === 0) return

    const keys: DefinitionKey[] = []
    const seen = new Set<string>()
    for (const block of scriptBlocks) {
      for (const word of block.words ?? []) {
        const lemma = word.lemma?.trim() || word.arabic?.trim()
        const root = word.root?.trim() ?? null
        if (!lemma) continue
        const key = `${lemma}|${root ?? ""}`
        if (seen.has(key)) continue
        seen.add(key)
        keys.push({ lemma, root })
      }
    }

    if (keys.length === 0) {
      setUndefinedDefs([])
      return
    }

    setUndefinedLoading(true)
    setUndefinedError(null)
    fetchMissingDefinitions(keys)
      .then((missing) => {
        const missingSet = new Set(missing.map((d) => `${d.lemma}|${d.root ?? ""}`))
        const isNewFormat = Array.isArray(parsedTranscript)
        const locs: Record<string, { path: string; timestamp?: string; translation?: string }[]> = {}
        scriptBlocks.forEach((block, blockIdx) => {
          ;(block.words ?? []).forEach((word, wordIdx) => {
            const lemma = word.lemma?.trim() || word.arabic?.trim()
            const root = word.root?.trim() ?? null
            if (!lemma) return
            const key = `${lemma}|${root ?? ""}`
            if (!missingSet.has(key)) return
            if (!locs[key]) locs[key] = []
            const path = isNewFormat
              ? `transcript[${blockIdx}].tokens[${wordIdx}]`
              : `transcript.scriptBlocks[${blockIdx}].words[${wordIdx}]`
            locs[key].push({
              path,
              timestamp: block.timestamp,
              translation: block.translation,
            })
          })
        })
        setUndefinedDefs(missing)
        setUndefinedLocs(locs)
      })
      .catch((e: unknown) => setUndefinedError(errorMessage(e) ?? "Failed to load undefined definitions"))
      .finally(() => setUndefinedLoading(false))
  }, [open, tab, scriptBlocks, parsedTranscript])

  const removeResolvedUndefined = (lemma: string, root: string | null) => {
    const key = `${lemma}|${root ?? ""}`
    setUndefinedDefs((prev) => prev.filter((d) => `${d.lemma}|${d.root ?? ""}` !== key))
    setUndefinedLocs((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleUseCandidate = (oldLemma: string, root: string | null, newLemma: string) => {
    try {
      const parsed = JSON.parse(transcriptJson)
      const amended = amendTranscriptLemma(parsed, oldLemma, root, newLemma)
      setTranscriptJson(JSON.stringify(amended, null, 2))
      removeResolvedUndefined(oldLemma, root)
    } catch {
      setError("Transcript JSON is invalid")
    }
  }

  const handleUpdateDefinition = async (
    definitionId: number,
    newLemma: string,
    root: string | null
  ) => {
    await updateDefinitionLemma({ definitionId, newLemma, root })
    removeResolvedUndefined(newLemma, root)
  }

  const openWizard = (def: DefinitionKey) => {
    setWizardDef(def)
    setWizardOpen(true)
  }

  const closeWizard = () => {
    setWizardOpen(false)
    setWizardDef(null)
  }

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
        cover: cover || null,
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
                <Tab label="Undefined" sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600 }} />
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
                  <AdminTextField label="Level" value={level} onChange={(e) => setLevel(e.target.value)} fullWidth size="small" />
                  <AdminTextField label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} fullWidth size="small" />
                  <AdminTextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} size="small" />
                  <AdminTextField label="YouTube ID" value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} fullWidth size="small" />
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
                      Transcript JSON is invalid. Fix it on the Transcript JSON tab to view undefined words.
                    </Typography>
                  ) : scriptBlocks.length === 0 ? (
                    <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                      No script blocks found in this transcript.
                    </Typography>
                  ) : (
                    <>
                      {undefinedError && (
                        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#c0392b" }}>
                          {undefinedError}
                        </Typography>
                      )}
                      {undefinedLoading && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                          <CircularProgress size={28} sx={{ color: "#b8860b" }} />
                        </Box>
                      )}
                      {!undefinedLoading && undefinedDefs.length === 0 && (
                        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                          All word definitions are present.
                        </Typography>
                      )}
                      {undefinedDefs.length > 0 && (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "12px", bgcolor: "#fafafa" }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: "#2c1a0e" }}>Lemma</TableCell>
                                <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: "#2c1a0e" }}>Root</TableCell>
                                <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: "#2c1a0e" }}>POS</TableCell>
                                <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: "#2c1a0e" }}>CEFR</TableCell>
                                <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: "#2c1a0e" }}>JSON location</TableCell>
                                <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: "#2c1a0e" }}>Candidates</TableCell>
                                <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: "#2c1a0e" }}>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {undefinedDefs.map((def, idx) => {
                                const key = `${def.lemma}|${def.root ?? ""}`
                                const locs = undefinedLocs[key] ?? []
                                return (
                                  <TableRow key={idx}>
                                    <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.1rem", color: "#2c1a0e", direction: "rtl" }}>
                                      {def.lemma}
                                    </TableCell>
                                    <TableCell>
                                      {def.root ? (
                                        <Chip
                                          label={def.root}
                                          size="small"
                                          sx={{ fontFamily: "'EB Garamond', serif", fontSize: "0.8rem" }}
                                        />
                                      ) : (
                                        <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#9e8a7a" }}>—</Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65" }}>
                                        {getWordFieldAtPath(scriptBlocks, locs[0]?.path ?? "", "pos") ?? "—"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65" }}>
                                        {getWordFieldAtPath(scriptBlocks, locs[0]?.path ?? "", "cefr") ?? "—"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                        {locs.map((loc, i) => (
                                          <Typography
                                            key={i}
                                            sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#7a6e65" }}
                                          >
                                            {loc.path}
                                            {loc.timestamp && ` · ${loc.timestamp}`}
                                            {loc.translation && ` · "${loc.translation}"`}
                                          </Typography>
                                        ))}
                                        {locs.length === 0 && (
                                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#9e8a7a" }}>
                                            Unknown
                                          </Typography>
                                        )}
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => openWizard(def)}
                                        sx={{
                                          fontFamily: "Jost, sans-serif",
                                          fontSize: "0.8rem",
                                          textTransform: "none",
                                          borderRadius: "8px",
                                          borderColor: "rgba(122,110,101,0.3)",
                                          color: "#7a6e65",
                                          width: "fit-content",
                                        }}
                                      >
                                        Open wizard
                                      </Button>
                                    </TableCell>
                                    <TableCell>
                                      <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.8rem", color: "#c0392b" }}>
                                        Missing from definitions table
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
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

      {wizardDef && (
        <UndefinedWordWizardDialog
          open={wizardOpen}
          onClose={closeWizard}
          lemma={wizardDef.lemma}
          root={wizardDef.root}
          surfaceArabic={getSurfaceArabic(scriptBlocks, wizardDef.lemma, wizardDef.root)}
          pos={getWordFieldAtPath(scriptBlocks, undefinedLocs[`${wizardDef.lemma}|${wizardDef.root ?? ""}`]?.[0]?.path ?? "", "pos")}
          cefr={getWordFieldAtPath(scriptBlocks, undefinedLocs[`${wizardDef.lemma}|${wizardDef.root ?? ""}`]?.[0]?.path ?? "", "cefr")}
          missingTable="definitions"
          locations={undefinedLocs[`${wizardDef.lemma}|${wizardDef.root ?? ""}`] ?? []}
          source={slug}
          onUseCandidate={(newLemma) => handleUseCandidate(wizardDef.lemma, wizardDef.root, newLemma)}
          onUpdateDefinition={(definitionId, newLemma, defRoot) =>
            handleUpdateDefinition(definitionId, newLemma, defRoot)
          }
        />
      )}
    </>
  )
}
