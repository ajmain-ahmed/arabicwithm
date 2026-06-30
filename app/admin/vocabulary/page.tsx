"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  IconButton,
  Pagination,
} from "@mui/material"
import { Edit, Add } from "@mui/icons-material"
import { fetchAllVocabForAdmin, type AdminVocabRow } from "@/app/actions/admin"
import { stripDiacritics, normalizeTransliteration } from "@/app/lib/arabic"
import SearchField from "../components/SearchField"
import VocabEditDialog from "../components/VocabEditDialog"

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong"
}

type SortKey = keyof AdminVocabRow
type SortDir = "asc" | "desc"

const PAGE_SIZE = 100
const SORTABLE_COLUMNS: SortKey[] = [
  "word_id",
  "word_ar",
  "word_di",
  "word_tr",
  "level",
  "theme",
]

export default function VocabularyAdminPage() {
  const [allRows, setAllRows] = useState<AdminVocabRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("word_id")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [editId, setEditId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchAllVocabForAdmin()
      setAllRows(rows)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load vocabulary")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query])

  const normalizedQuery = query.trim().toLowerCase()
  const normalizedQueryNoArabicDiacritics = stripDiacritics(normalizedQuery).toLowerCase()
  const normalizedQueryTranslit = normalizeTransliteration(query)

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) return allRows
    return allRows.filter((row) => {
      const arabicMatch =
        stripDiacritics(row.word_ar).toLowerCase().includes(normalizedQueryNoArabicDiacritics) ||
        stripDiacritics(row.word_di).toLowerCase().includes(normalizedQueryNoArabicDiacritics)
      const translitMatch =
        normalizeTransliteration(row.word_tr).includes(normalizedQueryTranslit)
      const metaMatch =
        row.level.toLowerCase().includes(normalizedQuery) ||
        row.theme.toLowerCase().includes(normalizedQuery) ||
        row.primary_gloss.toLowerCase().includes(normalizedQuery)
      return arabicMatch || translitMatch || metaMatch
    })
  }, [allRows, normalizedQuery, normalizedQueryNoArabicDiacritics, normalizedQueryTranslit])

  const sortedRows = useMemo(() => {
    if (!SORTABLE_COLUMNS.includes(sortKey)) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortKey] ?? ""
      const bVal = b[sortKey] ?? ""
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [filteredRows, sortKey, sortDir])

  const pageCount = Math.ceil(sortedRows.length / PAGE_SIZE)
  const rows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const count = sortedRows.length

  const handleSort = (key: SortKey) => {
    if (!SORTABLE_COLUMNS.includes(key)) return
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const openNew = () => {
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (id: number) => {
    setEditId(id)
    setDialogOpen(true)
  }

  const sortProps = (key: SortKey) => ({
    active: sortKey === key,
    direction: sortDir as "asc" | "desc",
    onClick: () => handleSort(key),
  })

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}>
            Vocabulary
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {count.toLocaleString()} words in the database
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openNew}
          sx={{
            bgcolor: "#2c1a0e",
            color: "#f5ede0",
            textTransform: "none",
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            borderRadius: "10px",
            "&:hover": { bgcolor: "#1a0f08" },
          }}
        >
          New word
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search Arabic, transliteration, level, theme, or English gloss..."
        />
      </Box>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "calc(100vh - 320px)" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel {...sortProps("word_id")}>ID</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("word_di")}>Arabic</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("word_tr")}>Transliteration</TableSortLabel>
                </TableCell>
                <TableCell>Primary gloss</TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("level")}>Level</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("theme")}>Theme</TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    Loading vocabulary…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    No words match your search.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.word_id} hover sx={{ "& td": { fontFamily: "Jost, sans-serif" } }}>
                    <TableCell>{row.word_id}</TableCell>
                    <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.05rem", color: "#2c1a0e", direction: "rtl" }}>
                      {row.word_di || row.word_ar}
                    </TableCell>
                    <TableCell sx={{ color: "#7a6e65", fontStyle: "italic" }}>{row.word_tr}</TableCell>
                    <TableCell>{row.primary_gloss}</TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>{row.theme}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(row.word_id)} sx={{ color: "#b8860b" }}>
                        <Edit sx={{ fontSize: "1.1rem" }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {pageCount > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, value) => setPage(value)}
            shape="rounded"
            sx={{
              "& .MuiPaginationItem-root": {
                fontFamily: "Jost, sans-serif",
              },
              "& .Mui-selected": {
                bgcolor: "#2c1a0e !important",
                color: "#f5ede0",
              },
            }}
          />
        </Box>
      )}

      <VocabEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        wordId={editId}
        onSaved={load}
        onDeleted={load}
      />
    </Box>
  )
}
