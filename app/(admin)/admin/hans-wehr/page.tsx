"use client"

import React, { useState } from "react"
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
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from "@mui/material"
import { Search } from "@mui/icons-material"
import { searchHansWehr, type HansWehrSearchResult } from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"
import AdminTextField from "../components/AdminTextField"

export default function HansWehrAdminPage() {
  const [idQuery, setIdQuery] = useState("")
  const [wordQuery, setWordQuery] = useState("")
  const [definitionQuery, setDefinitionQuery] = useState("")

  const [idExact, setIdExact] = useState(false)
  const [wordExact, setWordExact] = useState(false)
  const [definitionExact, setDefinitionExact] = useState(false)

  const [results, setResults] = useState<HansWehrSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setHasSearched(true)
    setExpandedRows(new Set())

    try {
      const data = await searchHansWehr({
        id: idQuery,
        word: wordQuery,
        definition: definitionQuery,
        idExact,
        wordExact,
        definitionExact,
      })
      setResults(data)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const toggleExpandRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const hasCriteria = Boolean(idQuery.trim() || wordQuery.trim() || definitionQuery.trim())

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}>
          Hans Wehr
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
          Search the Hans Wehr dictionary by ID, word, or definition.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "16px",
          border: "1px solid rgba(122,110,101,0.15)",
          p: { xs: 2, md: 3 },
          mb: 3,
        }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: { xs: 2, md: 3 } }}
        >
          <Box>
            <AdminTextField
              label="Hans ID"
              value={idQuery}
              onChange={(e) => setIdQuery(e.target.value)}
              fullWidth
              size="small"
              placeholder="e.g. 1234"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={idExact}
                  onChange={(e) => setIdExact(e.target.checked)}
                  sx={{ color: "#9e8a7a", "&.Mui-checked": { color: "#b8860b" } }}
                />
              }
              label="Exact match"
              sx={{ mt: 0.5, "& .MuiFormControlLabel-label": { fontFamily: "Jost, sans-serif", fontSize: "0.85rem", color: "#7a6e65" } }}
            />
          </Box>

          <Box>
            <AdminTextField
              label="Word (Hans headword)"
              value={wordQuery}
              onChange={(e) => setWordQuery(e.target.value)}
              fullWidth
              size="small"
              placeholder="Search headword…"
              sx={{
                "& .MuiInputBase-input": {
                  fontFamily: "'EB Garamond', serif",
                  fontSize: "1.1rem",
                  direction: "rtl",
                },
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={wordExact}
                  onChange={(e) => setWordExact(e.target.checked)}
                  sx={{ color: "#9e8a7a", "&.Mui-checked": { color: "#b8860b" } }}
                />
              }
              label="Exact match"
              sx={{ mt: 0.5, "& .MuiFormControlLabel-label": { fontFamily: "Jost, sans-serif", fontSize: "0.85rem", color: "#7a6e65" } }}
            />
          </Box>

          <Box>
            <AdminTextField
              label="Definition"
              value={definitionQuery}
              onChange={(e) => setDefinitionQuery(e.target.value)}
              fullWidth
              size="small"
              placeholder="Search definitions…"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={definitionExact}
                  onChange={(e) => setDefinitionExact(e.target.checked)}
                  sx={{ color: "#9e8a7a", "&.Mui-checked": { color: "#b8860b" } }}
                />
              }
              label="Exact match"
              sx={{ mt: 0.5, "& .MuiFormControlLabel-label": { fontFamily: "Jost, sans-serif", fontSize: "0.85rem", color: "#7a6e65" } }}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} sx={{ color: "#f5ede0" }} /> : <Search />}
            onClick={handleSearch}
            disabled={loading || !hasCriteria}
            sx={{
              bgcolor: "#2c1a0e",
              color: "#f5ede0",
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              borderRadius: "10px",
              "&:hover": { bgcolor: "#1a0f08" },
              "&.Mui-disabled": { bgcolor: "rgba(44,26,14,0.3)", color: "rgba(245,237,224,0.7)" },
            }}
          >
            {loading ? "Searching…" : "Search"}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      {hasSearched && !loading && (
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
          <TableContainer>
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>ID</TableCell>
                  <TableCell sx={headerCellSx}>Word</TableCell>
                  <TableCell sx={{ ...headerCellSx, minWidth: 360 }}>Definition</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 4, textAlign: "center", fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                      No Hans Wehr entries match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((row) => {
                    const isExpanded = expandedRows.has(row.id)
                    return (
                      <TableRow
                        key={row.id}
                        hover
                        onClick={() => toggleExpandRow(row.id)}
                        sx={{
                          cursor: "pointer",
                          "& td": { ...bodyCellSx, py: 1.5 },
                        }}
                      >
                        <TableCell sx={bodyCellSx}>{row.id}</TableCell>
                        <TableCell
                          sx={{
                            ...bodyCellSx,
                            direction: "rtl",
                            fontFamily: "'EB Garamond', serif",
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: "#2c1a0e",
                          }}
                        >
                          {row.word}
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, minWidth: 360, maxWidth: 520 }}>
                          <Typography
                            sx={{
                              fontFamily: "Jost, sans-serif",
                              fontSize: "1rem",
                              color: "#4a3f36",
                              lineHeight: 1.6,
                              whiteSpace: isExpanded ? "pre-line" : "nowrap",
                              ...(isExpanded
                                ? {}
                                : {
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "pre-line",
                                  }),
                            }}
                          >
                            {row.definition}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}

const headerCellSx = {
  fontWeight: 700,
  fontSize: "1rem",
  fontFamily: "Jost, sans-serif",
  backgroundColor: "#f5ede0",
  color: "#2c1a0e",
}

const bodyCellSx = {
  verticalAlign: "middle",
  fontFamily: "Jost, sans-serif",
  fontSize: "1rem",
}
