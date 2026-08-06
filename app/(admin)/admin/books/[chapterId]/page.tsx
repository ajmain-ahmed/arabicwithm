"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
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
  fetchChapterForAdmin,
  fetchHansWehrEntries,
  updateChapterContent,
  updateHansWehrDefinition,
  type ChapterWithContent,
} from "@/app/actions/admin"
import {
  extractHeadwordTokens,
  type TokenRow,
  type EditableTokenField,
} from "@/app/lib/admin-headwords"
import { errorMessage } from "@/app/lib/errors"
import TokenHeadwordDialog from "../../components/TokenHeadwordDialog"

export default function ChapterHeadwordsPage() {
  const params = useParams()
  const router = useRouter()
  const chapterId = String(params.chapterId ?? "")
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const [chapter, setChapter] = useState<ChapterWithContent | null>(null)
  const [rows, setRows] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [dialogRowKey, setDialogRowKey] = useState<string | null>(null)
  const [dialogEditing, setDialogEditing] = useState(false)

  const [savingContent, setSavingContent] = useState<Record<string, boolean>>({})
  const [savingHans, setSavingHans] = useState<Record<number, boolean>>({})

  const loadChapter = useCallback(async () => {
    if (!chapterId) return

    setLoading(true)
    setError(null)

    try {
      const ch = await fetchChapterForAdmin(chapterId)
      if (!ch) {
        setError("Chapter not found")
        setLoading(false)
        return
      }
      setChapter(ch)

      const tokens = extractHeadwordTokens(ch.content)
      const headwords = Array.from(new Set(tokens.map((t) => t.headword).filter(Boolean)))
      const entries = headwords.length > 0 ? await fetchHansWehrEntries(headwords) : []

      const entryByWord = new Map(entries.map((e) => [e.word, e]))

      setRows(
        tokens.map((token) => ({
          token,
          entry: token.headword ? (entryByWord.get(token.headword) ?? null) : null,
        }))
      )
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load chapter")
    } finally {
      setLoading(false)
    }
  }, [chapterId])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (cancelled) return
      await loadChapter()
    }

    run()
    return () => {
      cancelled = true
    }
  }, [loadChapter])

  const unmatchedCount = useMemo(() => rows.filter((r) => !r.entry).length, [rows])

  const updateContentToken = useCallback(
    async (rowIndex: number, field: EditableTokenField, value: string) => {
      if (!chapter || !chapter.content) return

      const row = rows[rowIndex]
      if (!row) return

      const { blockIndex, tokenIndex } = row.token
      const content = structuredClone(chapter.content)
      if (!Array.isArray(content)) return

      const block = content[blockIndex]
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

      setSavingContent((prev) => ({ ...prev, [`${rowIndex}-${field}`]: true }))

      try {
        token[field] = value.trim()
        await updateChapterContent(chapterId, content)
        await loadChapter()
      } catch (e: unknown) {
        setError(errorMessage(e) ?? `Failed to update ${field}`)
      } finally {
        setSavingContent((prev) => ({ ...prev, [`${rowIndex}-${field}`]: false }))
      }
    },
    [chapter, chapterId, rows, loadChapter]
  )

  const updateHansDefinition = useCallback(
    async (entryId: number, value: string) => {
      const row = rows.find((r) => r.entry?.id === entryId)
      if (!row || !row.entry) return
      if (row.entry.definition === value) return

      setSavingHans((prev) => ({ ...prev, [entryId]: true }))

      try {
        await updateHansWehrDefinition(entryId, value)
        await loadChapter()
      } catch (e: unknown) {
        setError(errorMessage(e) ?? "Failed to update Hans Wehr definition")
      } finally {
        setSavingHans((prev) => ({ ...prev, [entryId]: false }))
      }
    },
    [rows, loadChapter]
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
    await updateContentToken(index, field, value)
  }

  const handleDialogUpdateHans = async (value: string) => {
    if (!dialogRow || !dialogRow.entry) return
    await updateHansDefinition(dialogRow.entry.id, value)
  }

  const renderMobileCard = (row: TokenRow) => {
    const { token, entry } = row
    const rowKey = `${token.blockIndex}-${token.tokenIndex}`
    const isUnmatched = !entry

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
          backgroundColor: entry ? "#fff" : "rgba(192,57,43,0.03)",
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
              HW: <strong style={{ color: isUnmatched ? "#c0392b" : "#2c1a0e" }}>{entry?.word ?? "—"}</strong>
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
        onClick={() => router.push("/admin/books")}
        sx={{
          mb: 2,
          textTransform: "none",
          fontFamily: "Jost, sans-serif",
          color: "#7a6e65",
          "&:hover": { color: "#b8860b", background: "transparent" },
        }}
      >
        Back to books
      </Button>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}>
            {chapter ? chapter.title : "Chapter headwords"}
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
            {loading
              ? "Loading…"
              : `${rows.length.toLocaleString()} word${rows.length === 1 ? "" : "s"} · ${unmatchedCount} unmatched`}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      {loading ? (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          Loading chapter and headwords…
        </Typography>
      ) : rows.length === 0 ? (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          No word headwords found in this chapter.
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
                        backgroundColor: entry ? "inherit" : "rgba(192,57,43,0.04)",
                        "& td": { ...bodyCellSx, py: 1.5 },
                      }}
                    >
                      <TableCell sx={{ ...bodyCellSx, direction: "rtl" }} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          arabic
                          isEditing={isEditing}
                          value={token.arabic || token.plain || ""}
                          onBlur={(value) => updateContentToken(index, "arabic", value)}
                          saving={savingContent[`${index}-arabic`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.headword}
                          onBlur={(value) => updateContentToken(index, "headword", value)}
                          saving={savingContent[`${index}-headword`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.pos ?? ""}
                          onBlur={(value) => updateContentToken(index, "pos", value)}
                          saving={savingContent[`${index}-pos`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.cefr ?? ""}
                          onBlur={(value) => updateContentToken(index, "cefr", value)}
                          saving={savingContent[`${index}-cefr`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.english ?? ""}
                          onBlur={(value) => updateContentToken(index, "english", value)}
                          saving={savingContent[`${index}-english`]}
                        />
                      </TableCell>
                      <TableCell sx={bodyCellSx} onClick={(e) => e.stopPropagation()}>
                        <EditableCell
                          isEditing={isEditing}
                          value={token.transliteration}
                          onBlur={(value) => updateContentToken(index, "transliteration", value)}
                          saving={savingContent[`${index}-transliteration`]}
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
                            onBlur={(value) => updateHansDefinition(entry.id, value)}
                            saving={savingHans[entry.id]}
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
        onUpdateHansDefinition={handleDialogUpdateHans}
        savingTokenField={dialogRow ? getSavingField(dialogRow, savingContent) : null}
        savingHans={dialogRow && dialogRow.entry ? Boolean(savingHans[dialogRow.entry.id]) : false}
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
