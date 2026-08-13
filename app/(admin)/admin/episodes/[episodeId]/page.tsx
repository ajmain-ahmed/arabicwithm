"use client"

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material"
import { ArrowBack, Edit, Check, Launch } from "@mui/icons-material"
import {
  fetchEpisodeForAdmin,
  fetchHansWehrEntries,
  fetchPhrases,
  updateEpisodeTranscript,
  updateHansWehrDefinition,
  updatePhrase,
  type EpisodeWithTranscript,
} from "@/app/actions/admin"
import {
  extractHeadwordTokens,
  type TokenRow,
  type EditableTokenField,
} from "@/app/lib/admin-headwords"
import { errorMessage } from "@/app/lib/errors"
import TokenHeadwordDialog from "../../components/TokenHeadwordDialog"

export default function EpisodeHeadwordsPage() {
  const params = useParams()
  const router = useRouter()
  const episodeId = String(params.episodeId ?? "")
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const [episode, setEpisode] = useState<EpisodeWithTranscript | null>(null)
  const [rows, setRows] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [dialogRowKey, setDialogRowKey] = useState<string | null>(null)
  const [dialogEditing, setDialogEditing] = useState(false)

  const [savingTranscript, setSavingTranscript] = useState<Record<string, boolean>>({})
  const [savingDefinition, setSavingDefinition] = useState<Record<number, boolean>>({})
  const cancelledRef = useRef(false)

  const loadEpisode = useCallback(async () => {
    if (!episodeId) return

    setLoading(true)
    setError(null)

    try {
      const ep = await fetchEpisodeForAdmin(episodeId)
      if (cancelledRef.current) return
      if (!ep) {
        setError("Episode not found")
        setLoading(false)
        return
      }
      setEpisode(ep)

      const tokens = extractHeadwordTokens(ep.transcript, { includePhrases: true })

      const wordHeadwords = tokens
        .filter((t) => t.entryType === "word")
        .map((t) => t.headword)
        .filter(Boolean)
      const phraseIds = tokens
        .filter((t) => t.entryType === "phrase")
        .map((t) => Number(t.headword))
        .filter((id) => !Number.isNaN(id))

      const [hansEntries, phraseRows] = await Promise.all([
        wordHeadwords.length > 0 ? fetchHansWehrEntries(wordHeadwords) : [],
        phraseIds.length > 0 ? fetchPhrases(phraseIds) : [],
      ])

      if (cancelledRef.current) return

      const entryByWord = new Map(hansEntries.map((e) => [e.word, e]))
      const phraseById = new Map(phraseRows.map((p) => [p.id, p]))

      setRows(
        tokens.map((token) => {
          if (token.entryType === "phrase") {
            const phraseId = Number(token.headword)
            const phrase = phraseById.get(phraseId)
            return {
              token,
              entry: phrase
                ? {
                    id: phrase.id,
                    word: phrase.phrase_ar_di,
                    definition: phrase.english,
                    isPhrase: true,
                  }
                : null,
            }
          }
          return {
            token,
            entry: token.headword ? (entryByWord.get(token.headword) ?? null) : null,
          }
        })
      )
    } catch (e: unknown) {
      if (cancelledRef.current) return
      setError(errorMessage(e) ?? "Failed to load episode")
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [episodeId])

  useEffect(() => {
    cancelledRef.current = false
    loadEpisode()
    return () => {
      cancelledRef.current = true
    }
  }, [loadEpisode])

  const unmatchedCount = useMemo(() => rows.filter((r) => !r.entry).length, [rows])
  const phraseCount = useMemo(() => rows.filter((r) => r.entry?.isPhrase).length, [rows])

  const updateTranscriptToken = useCallback(
    async (rowIndex: number, field: EditableTokenField, value: string) => {
      if (!episode || !episode.transcript) return

      const row = rows[rowIndex]
      if (!row) return

      const { blockIndex, tokenIndex } = row.token
      const transcript = structuredClone(episode.transcript)
      if (!Array.isArray(transcript)) return

      const block = transcript[blockIndex]
      if (!isPlainObject(block)) return

      const tokenArray = Array.isArray(block.tokens)
        ? block.tokens
        : Array.isArray(block.words)
          ? block.words
          : null
      if (!tokenArray) return

      const token = tokenArray[tokenIndex]
      if (!isPlainObject(token)) return

      const currentValue = String(token[field] ?? "")
      if (currentValue === value) return

      setSavingTranscript((prev) => ({ ...prev, [`${rowIndex}-${field}`]: true }))

      try {
        token[field] = value.trim()
        await updateEpisodeTranscript(episodeId, transcript)
        await loadEpisode()
      } catch (e: unknown) {
        setError(errorMessage(e) ?? `Failed to update ${field}`)
      } finally {
        setSavingTranscript((prev) => ({ ...prev, [`${rowIndex}-${field}`]: false }))
      }
    },
    [episode, episodeId, rows, loadEpisode]
  )

  const updateDefinition = useCallback(
    async (entryId: number, value: string) => {
      const row = rows.find((r) => r.entry?.id === entryId)
      if (!row || !row.entry) return
      if (row.entry.definition === value) return

      setSavingDefinition((prev) => ({ ...prev, [entryId]: true }))

      try {
        if (row.entry.isPhrase) {
          await updatePhrase(entryId, { english: value })
        } else {
          await updateHansWehrDefinition(entryId, value)
        }
        await loadEpisode()
      } catch (e: unknown) {
        setError(errorMessage(e) ?? "Failed to update definition")
      } finally {
        setSavingDefinition((prev) => ({ ...prev, [entryId]: false }))
      }
    },
    [rows, loadEpisode]
  )

  const toggleEditRow = (rowKey: string) => {
    setEditingRowKey((current) => (current === rowKey ? null : rowKey))
  }

  const toggleExpandRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowKey)) {
        next.delete(rowKey)
      } else {
        next.add(rowKey)
      }
      return next
    })
  }

  const openDialog = (rowKey: string, editing = false) => {
    setDialogRowKey(rowKey)
    setDialogEditing(editing)
  }

  const closeDialog = () => {
    setDialogRowKey(null)
    setDialogEditing(false)
  }

  const dialogRow = useMemo(() => {
    if (!dialogRowKey) return null
    return rows.find((r) => `${r.token.blockIndex}-${r.token.tokenIndex}` === dialogRowKey) ?? null
  }, [dialogRowKey, rows])

  const handleDialogUpdateToken = async (field: EditableTokenField, value: string) => {
    if (!dialogRow) return
    const index = rows.indexOf(dialogRow)
    if (index === -1) return
    await updateTranscriptToken(index, field, value)
  }

  const handleDialogUpdateDefinition = async (value: string) => {
    if (!dialogRow || !dialogRow.entry) return
    await updateDefinition(dialogRow.entry.id, value)
  }

  const rowBackgroundColor = (row: TokenRow) => {
    if (row.entry?.isPhrase) return "rgba(184,134,11,0.08)"
    if (!row.entry) return "rgba(192,57,43,0.04)"
    return "inherit"
  }

  const renderMobileCard = (row: TokenRow) => {
    const { token, entry } = row
    const rowKey = `${token.blockIndex}-${token.tokenIndex}`
    const isUnmatched = !entry
    const isPhrase = entry?.isPhrase

    return (
      <Paper
        key={rowKey}
        elevation={0}
        onClick={() => openDialog(rowKey)}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "14px",
          border: "1px solid rgba(122,110,101,0.15)",
          backgroundColor: rowBackgroundColor(row),
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
              {token.arabic || token.plain || "—"}
            </Typography>
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.15rem", color: "#7a6e65", mt: 0.5 }}>
              {isPhrase ? "Phrase" : "HW"}:{" "}
              <strong style={{ color: isUnmatched ? "#c0392b" : "#2c1a0e" }}>{entry?.word ?? "—"}</strong>
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              openDialog(rowKey, true)
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
      <Button
        startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
        onClick={() => router.push("/admin/shows")}
        sx={{
          mb: 2,
          textTransform: "none",
          fontFamily: "Jost, sans-serif",
          color: "#7a6e65",
          "&:hover": { color: "#b8860b", background: "transparent" },
        }}
      >
        Back to shows
      </Button>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: "#2c1a0e" }}>
            {episode ? episode.title : "Episode headwords"}
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
            {loading
              ? "Loading…"
              : `${rows.length.toLocaleString()} word${rows.length === 1 ? "" : "s"} · ${unmatchedCount} unmatched${phraseCount > 0 ? ` · ${phraseCount} phrase${phraseCount === 1 ? "" : "s"}` : ""}`}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      {loading ? (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          Loading episode and headwords…
        </Typography>
      ) : rows.length === 0 ? (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          No word headwords found in this transcript.
        </Typography>
      ) : isMobile ? (
        <Box>{rows.map(renderMobileCard)}</Box>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
          <TableContainer>
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Arabic</TableCell>
                  <TableCell sx={headerCellSx}>Headword</TableCell>
                  <TableCell sx={headerCellSx}>POS</TableCell>
                  <TableCell sx={headerCellSx}>CEFR</TableCell>
                  <TableCell sx={headerCellSx}>English</TableCell>
                  <TableCell sx={headerCellSx}>Transliteration</TableCell>
                  <TableCell sx={headerCellSx}>Headword (Hans)</TableCell>
                  <TableCell sx={headerCellSx}>HW ID</TableCell>
                  <TableCell sx={{ ...headerCellSx, minWidth: 260 }}>Hans Definition</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 60, px: 1 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => {
                  const { token, entry } = row
                  const rowKey = `${token.blockIndex}-${token.tokenIndex}`
                  const isEditing = editingRowKey === rowKey
                  const isExpanded = expandedRows.has(rowKey)

                  return (
                    <TableRow
                      key={rowKey}
                      hover
                      onClick={() => toggleExpandRow(rowKey)}
                      sx={{
                        cursor: "pointer",
                        backgroundColor: rowBackgroundColor(row),
                        "& td": { ...bodyCellSx, py: 1.5 },
                      }}
                    >
                      <TableCell sx={{ ...bodyCellSx, direction: "rtl" }} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          arabic
                          isEditing={isEditing}
                          value={token.arabic || token.plain || ""}
                          onBlur={(value) => updateTranscriptToken(index, "arabic", value)}
                          saving={savingTranscript[`${index}-arabic`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.headword}
                          onBlur={(value) => updateTranscriptToken(index, "headword", value)}
                          saving={savingTranscript[`${index}-headword`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.pos ?? ""}
                          onBlur={(value) => updateTranscriptToken(index, "pos", value)}
                          saving={savingTranscript[`${index}-pos`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.cefr ?? ""}
                          onBlur={(value) => updateTranscriptToken(index, "cefr", value)}
                          saving={savingTranscript[`${index}-cefr`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.english ?? ""}
                          onBlur={(value) => updateTranscriptToken(index, "english", value)}
                          saving={savingTranscript[`${index}-english`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.transliteration}
                          onBlur={(value) => updateTranscriptToken(index, "transliteration", value)}
                          saving={savingTranscript[`${index}-transliteration`]}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          ...bodyCellSx,
                          direction: "rtl",
                          fontFamily: "'EB Garamond', serif",
                          fontSize: "1.5rem",
                          fontWeight: 600,
                          color: "#2c1a0e",
                        }}
                      >
                        {entry?.word ?? "—"}
                      </TableCell>
                      <TableCell sx={bodyCellSx}>{entry?.id ?? "—"}</TableCell>
                      <TableCell
                        sx={{ ...bodyCellSx, minWidth: 260, maxWidth: 400 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry ? (
                          <EditableCell
                            multiline
                            isEditing={isEditing}
                            isExpanded={isExpanded}
                            value={entry.definition}
                            onBlur={(value) => updateDefinition(entry.id, value)}
                            saving={savingDefinition[entry.id]}
                          />
                        ) : (
                          <Typography sx={{ color: "#7a6e65", fontSize: "1rem" }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, width: 60, px: 1 }} onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={() => toggleEditRow(rowKey)}
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

      <TokenHeadwordDialog
        open={dialogRow != null}
        row={dialogRow}
        isEditing={dialogEditing}
        onClose={closeDialog}
        onToggleEdit={() => setDialogEditing((v) => !v)}
        onUpdateToken={handleDialogUpdateToken}
        onUpdateHansDefinition={handleDialogUpdateDefinition}
        savingTokenField={dialogRow ? getSavingField(dialogRow, savingTranscript) : null}
        savingHans={dialogRow && dialogRow.entry ? Boolean(savingDefinition[dialogRow.entry.id]) : false}
      />
    </Box>
  )
}

function getSavingField(row: TokenRow, saving: Record<string, boolean>): string | null {
  const key = `${row.token.blockIndex}-${row.token.tokenIndex}`
  for (const field of ["arabic", "headword", "pos", "cefr", "english", "transliteration"] as const) {
    if (saving[`${key}-${field}`]) return field
  }
  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
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
  isExpanded?: boolean
}

function EditableCell({ value, onBlur, saving, arabic, multiline, isEditing, isExpanded }: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !multiline) {
      e.currentTarget.blur()
    }
  }

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
          whiteSpace: multiline && isExpanded ? "pre-line" : "nowrap",
          ...(multiline && !isExpanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "pre-line",
              }
            : {}),
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
      onKeyDown={handleKeyDown}
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
