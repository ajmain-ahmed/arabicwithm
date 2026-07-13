"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material"
import { searchLemmas, type LemmaRow } from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"
import SearchField from "../components/SearchField"

type SortKey = keyof LemmaRow
type SortDir = "asc" | "desc"

export default function LemmasAdminPage() {
  const [rows, setRows] = useState<LemmaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("lemma")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const load = async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await searchLemmas(search)
      setRows(data)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load lemmas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load("")
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      load(query)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      if (aStr < bStr) return sortDir === "asc" ? -1 : 1
      if (aStr > bStr) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [rows, sortKey, sortDir])

  const headerSx = {
    fontFamily: "Jost, sans-serif",
    fontWeight: 700,
    fontSize: "0.8rem",
    color: "#7a6e65",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  }

  const cellSx = {
    fontFamily: "Jost, sans-serif",
    fontSize: "0.9rem",
    color: "#2c1a0e",
  }

  const arabicCellSx = {
    fontFamily: "'EB Garamond', serif",
    fontSize: "1.2rem",
    color: "#2c1a0e",
    direction: "rtl" as const,
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 0.5 }}
          >
            Lemmas
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "0.9rem" }}>
            Search and browse the <strong>vocab_lemmas</strong> table.
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "0.85rem" }}>
          {rows.length} {rows.length === 1 ? "result" : "results"}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search by lemma, root, source, CEFR, type..."
        />
      </Box>

      {error && (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#c62828", mb: 2 }}>
          {error}
        </Typography>
      )}

      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>
                  <TableSortLabel active={sortKey === "word_id"} direction={sortDir} onClick={() => handleSort("word_id")}>
                    ID
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerSx}>
                  <TableSortLabel active={sortKey === "lemma"} direction={sortDir} onClick={() => handleSort("lemma")}>
                    Lemma
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerSx}>
                  <TableSortLabel active={sortKey === "lemma_plain"} direction={sortDir} onClick={() => handleSort("lemma_plain")}>
                    Lemma plain
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerSx}>
                  <TableSortLabel active={sortKey === "root"} direction={sortDir} onClick={() => handleSort("root")}>
                    Root
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerSx}>
                  <TableSortLabel active={sortKey === "entry_type"} direction={sortDir} onClick={() => handleSort("entry_type")}>
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerSx}>
                  <TableSortLabel active={sortKey === "CEFR"} direction={sortDir} onClick={() => handleSort("CEFR")}>
                    CEFR
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerSx}>
                  <TableSortLabel active={sortKey === "source"} direction={sortDir} onClick={() => handleSort("source")}>
                    Source
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={headerSx}>Active</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 4, textAlign: "center" }}>
                    <CircularProgress size={24} sx={{ color: "#b8860b" }} />
                  </TableCell>
                </TableRow>
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 4, textAlign: "center" }}>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                      No lemmas found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow key={row.word_id} hover>
                    <TableCell sx={cellSx}>{row.word_id}</TableCell>
                    <TableCell sx={arabicCellSx}>{row.lemma}</TableCell>
                    <TableCell sx={arabicCellSx}>{row.lemma_plain}</TableCell>
                    <TableCell sx={cellSx}>{row.root || "—"}</TableCell>
                    <TableCell sx={{ ...cellSx, textTransform: "capitalize" }}>{row.entry_type}</TableCell>
                    <TableCell sx={cellSx}>{row.CEFR || "—"}</TableCell>
                    <TableCell sx={cellSx}>{row.source || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.is_active ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          fontFamily: "Jost, sans-serif",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          bgcolor: row.is_active ? "rgba(14,46,31,0.1)" : "rgba(122,110,101,0.1)",
                          color: row.is_active ? "#0e2e1f" : "#7a6e65",
                          borderRadius: "6px",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
