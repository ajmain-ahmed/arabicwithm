"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Chip,
  Collapse,
  Divider,
} from "@mui/material"
import {
  PlayArrow,
  Add,
  Cancel,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Replay,
  RemoveCircle,
  AddCircle,
} from "@mui/icons-material"
import {
  fetchVerbConjugationCandidates,
  generateConjugations,
  commitConjugations,
  type VerbCandidate,
  type GeneratedConjugation,
} from "@/app/actions/conjugations"
import AdminTextField from "../components/AdminTextField"

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong"
}

function conjKey(row: GeneratedConjugation): string {
  return `${row.lemma}|${row.root ?? ""}|${row.tense}|${row.pronoun}`
}

export default function ConjugationsPage() {
  const [candidates, setCandidates] = useState<VerbCandidate[] | null>(null)
  const [existingCount, setExistingCount] = useState(0)
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [generatedRows, setGeneratedRows] = useState<GeneratedConjugation[] | null>(null)
  const [skippedVerbs, setSkippedVerbs] = useState<{ lemma: string; reason: string }[]>([])
  const [generating, setGenerating] = useState(false)

  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set())
  const [expandedLemmas, setExpandedLemmas] = useState<Set<string>>(new Set())

  const [inserting, setInserting] = useState(false)
  const [insertedCount, setInsertedCount] = useState<number | null>(null)

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    setError(null)
    try {
      const result = await fetchVerbConjugationCandidates()
      if (result.ok) {
        setCandidates(result.candidates)
        setExistingCount(result.existingCount)
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load verb candidates")
    } finally {
      setLoadingCandidates(false)
    }
  }, [])

  useEffect(() => {
    loadCandidates()
  }, [loadCandidates])

  const handleGenerate = useCallback(async () => {
    if (!candidates || candidates.length === 0) return
    setGenerating(true)
    setError(null)
    try {
      const result = await generateConjugations(candidates)
      if (result.ok) {
        setGeneratedRows(result.rows)
        setSkippedVerbs(result.skipped)
        setExcludedKeys(new Set())
        setExpandedLemmas(new Set())
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to generate conjugations")
    } finally {
      setGenerating(false)
    }
  }, [candidates])

  const toggleExcluded = useCallback((key: string) => {
    setExcludedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const updateConjugationRow = useCallback(
    (key: string, field: keyof GeneratedConjugation, value: string | null) => {
      setGeneratedRows((prev) => {
        if (!prev) return prev
        const idx = prev.findIndex((r) => conjKey(r) === key)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], [field]: value }
        return next
      })
    },
    []
  )

  const toggleLemmaExpanded = useCallback((lemma: string) => {
    setExpandedLemmas((prev) => {
      const next = new Set(prev)
      if (next.has(lemma)) next.delete(lemma)
      else next.add(lemma)
      return next
    })
  }, [])

  const handleInsert = useCallback(async () => {
    if (!generatedRows) return
    const included = generatedRows.filter((row) => !excludedKeys.has(conjKey(row)))
    if (included.length === 0) {
      setError("No rows selected for insertion.")
      return
    }

    setInserting(true)
    setError(null)
    try {
      const result = await commitConjugations(included)
      if (result.ok) {
        setInsertedCount(result.inserted)
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to insert conjugations")
    } finally {
      setInserting(false)
    }
  }, [generatedRows, excludedKeys])

  const handleReset = useCallback(() => {
    setGeneratedRows(null)
    setSkippedVerbs([])
    setExcludedKeys(new Set())
    setExpandedLemmas(new Set())
    setInsertedCount(null)
    setError(null)
    loadCandidates()
  }, [loadCandidates])

  const groupedRows = useMemo(() => {
    if (!generatedRows) return []
    const map = new Map<string, GeneratedConjugation[]>()
    for (const row of generatedRows) {
      const list = map.get(row.lemma) ?? []
      list.push(row)
      map.set(row.lemma, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [generatedRows])

  const includedCount = generatedRows ? generatedRows.length - excludedKeys.size : 0
  const showCandidates = generatedRows === null && insertedCount === null
  const showReview = generatedRows !== null && insertedCount === null
  const showDone = insertedCount !== null

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}>
          Verb Conjugations
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1.1rem" }}>
          Generate conjugation tables for verb lemmas via the remote conjugation service.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
          {error}
        </Alert>
      )}

      {loadingCandidates && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1.1rem" }}>
            Loading verb candidates…
          </Typography>
        </Paper>
      )}

      {showCandidates && !loadingCandidates && candidates && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 2 }}
          >
            Candidates
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Chip
              label={`${candidates.length} verb${candidates.length === 1 ? "" : "s"} without conjugations`}
              sx={{
                bgcolor: "rgba(184,134,11,0.12)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
                fontSize: "1rem",
                py: 0.5,
              }}
            />
            <Chip
              label={`${existingCount} verb${existingCount === 1 ? "" : "s"} already conjugated`}
              sx={{
                bgcolor: "rgba(44,26,14,0.08)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
                fontSize: "1rem",
                py: 0.5,
              }}
            />
          </Box>

          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3, fontSize: "1.1rem" }}>
            There are {candidates.length + existingCount} verb lemma{`s`} in total.
            {candidates.length > 0
              ? ` The ${candidates.length} listed below are not yet in ${" "}
                <strong>verb_conjugations</strong> and will be generated.`
              : " All verb lemmas already have conjugations."}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating || candidates.length === 0}
              startIcon={<PlayArrow />}
              sx={{
                bgcolor: "#2c1a0e",
                color: "#f5ede0",
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                fontSize: "1.1rem",
                borderRadius: "10px",
                px: 3,
                py: 1,
                "&:hover": { bgcolor: "#1a0f08" },
              }}
            >
              {generating
                ? "Generating…"
                : `Generate conjugations for ${candidates.length} verb${
                    candidates.length === 1 ? "" : "s"
                  }`}
            </Button>
          </Box>
        </Paper>
      )}

      {showReview && generatedRows && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 2 }}
          >
            Review generated conjugations
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Chip
              label={`${includedCount} rows to insert`}
              sx={{
                bgcolor: "rgba(184,134,11,0.12)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
                fontSize: "1rem",
                py: 0.5,
              }}
            />
            <Chip
              label={`${excludedKeys.size} excluded`}
              sx={{
                bgcolor: "rgba(44,26,14,0.08)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
                fontSize: "1rem",
                py: 0.5,
              }}
            />
            {skippedVerbs.length > 0 && (
              <Chip
                label={`${skippedVerbs.length} verbs skipped`}
                sx={{
                  bgcolor: "rgba(192,57,43,0.1)",
                  color: "#c0392b",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderRadius: "8px",
                  fontSize: "1rem",
                  py: 0.5,
                }}
              />
            )}
          </Box>

          {skippedVerbs.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
              <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Skipped verbs</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {skippedVerbs.map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.lemma}</strong> — {item.reason}
                  </li>
                ))}
              </Box>
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
            {groupedRows.map(([lemma, rows]) => {
              const expanded = expandedLemmas.has(lemma)
              const allExcluded = rows.every((row) => excludedKeys.has(conjKey(row)))
              const someExcluded = rows.some((row) => excludedKeys.has(conjKey(row))) && !allExcluded

              return (
                <Paper
                  key={lemma}
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: "14px",
                    borderColor: allExcluded ? "rgba(122,110,101,0.1)" : "rgba(122,110,101,0.15)",
                    bgcolor: allExcluded ? "rgba(122,110,101,0.03)" : "#fff",
                    opacity: allExcluded ? 0.7 : 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1.5,
                      cursor: "pointer",
                    }}
                    onClick={() => toggleLemmaExpanded(lemma)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                      <Box
                        sx={{
                          fontFamily: "'EB Garamond', serif",
                          fontSize: "2.25rem",
                          color: "#2c1a0e",
                          lineHeight: 1.2,
                        }}
                      >
                        {lemma}
                      </Box>
                      {rows[0]?.root && (
                        <Chip
                          label={rows[0].root}
                          sx={{
                            fontFamily: "'EB Garamond', serif",
                            borderRadius: "8px",
                            fontSize: "1rem",
                            py: 0.5,
                          }}
                        />
                      )}
                      <Chip
                        label={`${rows.length} forms`}
                        sx={{
                          fontFamily: "Jost, sans-serif",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          py: 0.5,
                        }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          const allKeys = rows.map((row) => conjKey(row))
                          const allCurrentlyExcluded = allKeys.every((k) => excludedKeys.has(k))
                          setExcludedKeys((prev) => {
                            const next = new Set(prev)
                            for (const key of allKeys) {
                              if (allCurrentlyExcluded) next.delete(key)
                              else next.add(key)
                            }
                            return next
                          })
                        }}
                        startIcon={allExcluded ? <AddCircle /> : <RemoveCircle />}
                        sx={{
                          textTransform: "none",
                          fontFamily: "Jost, sans-serif",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          borderRadius: "8px",
                          color: allExcluded ? "#7a6e65" : "#2c1a0e",
                        }}
                      >
                        {allExcluded ? "Include all" : "Exclude all"}
                      </Button>
                      {expanded ? <ExpandLess sx={{ color: "#7a6e65" }} /> : <ExpandMore sx={{ color: "#7a6e65" }} />}
                    </Box>
                  </Box>

                  <Collapse in={expanded}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 2 }}>
                      {rows.map((row) => {
                        const key = conjKey(row)
                        const excluded = excludedKeys.has(key)
                        return (
                          <Paper
                            key={key}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: "10px",
                              borderColor: excluded ? "rgba(122,110,101,0.1)" : "rgba(122,110,101,0.12)",
                              bgcolor: excluded ? "rgba(122,110,101,0.03)" : "rgba(184,134,11,0.04)",
                              opacity: excluded ? 0.6 : 1,
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 2,
                                flexWrap: "wrap",
                                flex: 1,
                              }}
                            >
                              <Box sx={{ flex: "1 1 180px", minWidth: 140 }}>
                                <AdminTextField
                                  label="Conjugation"
                                  value={row.conjugation_diacritic}
                                  onChange={(e) =>
                                    updateConjugationRow(key, "conjugation_diacritic", e.target.value)
                                  }
                                  fullWidth
                                  disabled={excluded}
                                  sx={{
                                    "& .MuiInputBase-input": {
                                      fontFamily: "'EB Garamond', serif",
                                      fontSize: "1.6rem",
                                      direction: "rtl",
                                    },
                                  }}
                                />
                              </Box>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pt: 0.5 }}>
                                <Chip
                                  label={row.pronoun}
                                  sx={{
                                    fontFamily: "Jost, sans-serif",
                                    borderRadius: "6px",
                                    fontSize: "0.9rem",
                                  }}
                                />
                                <Chip
                                  label={row.tense}
                                  sx={{
                                    fontFamily: "Jost, sans-serif",
                                    borderRadius: "6px",
                                    fontSize: "0.9rem",
                                    textTransform: "capitalize",
                                  }}
                                />
                              </Box>
                              <Box sx={{ flex: "1 1 160px", minWidth: 120 }}>
                                <AdminTextField
                                  label="Transliteration"
                                  value={row.transliteration ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value.trim()
                                    updateConjugationRow(key, "transliteration", v || null)
                                  }}
                                  fullWidth
                                  disabled={excluded}
                                  sx={{
                                    "& .MuiInputBase-input": {
                                      fontFamily: "Jost, sans-serif",
                                      fontSize: "1rem",
                                    },
                                  }}
                                />
                              </Box>
                            </Box>
                            <Button
                              size="small"
                              onClick={() => toggleExcluded(key)}
                              startIcon={excluded ? <AddCircle /> : <RemoveCircle />}
                              sx={{
                                textTransform: "none",
                                fontFamily: "Jost, sans-serif",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                borderRadius: "8px",
                                color: excluded ? "#7a6e65" : "#2c1a0e",
                              }}
                            >
                              {excluded ? "Include" : "Exclude"}
                            </Button>
                          </Paper>
                        )
                      })}
                    </Box>
                  </Collapse>
                </Paper>
              )
            })}
          </Box>

          <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleReset}
              startIcon={<Cancel />}
              disabled={inserting}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                fontSize: "1.05rem",
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
                px: 2,
                py: 1,
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleInsert}
              disabled={inserting || includedCount === 0}
              startIcon={<Add />}
              sx={{
                bgcolor: "#2c1a0e",
                color: "#f5ede0",
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                fontSize: "1.05rem",
                borderRadius: "10px",
                px: 2,
                py: 1,
                "&:hover": { bgcolor: "#1a0f08" },
              }}
            >
              {inserting ? "Inserting…" : `Write ${includedCount} rows to Supabase`}
            </Button>
          </Box>
        </Paper>
      )}

      {showDone && insertedCount !== null && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
            textAlign: "center",
          }}
        >
          <CheckCircle sx={{ fontSize: 56, color: "#b8860b", mb: 2 }} />
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}
          >
            Conjugations saved
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3, fontSize: "1.1rem" }}>
            {insertedCount} conjugation row{insertedCount === 1 ? "" : "s"} inserted into{" "}
            <strong>verb_conjugations</strong>.
          </Typography>
          <Button
            variant="contained"
            onClick={handleReset}
            startIcon={<Replay />}
            sx={{
              bgcolor: "#2c1a0e",
              color: "#f5ede0",
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              fontSize: "1.05rem",
              borderRadius: "10px",
              px: 2,
              py: 1,
              "&:hover": { bgcolor: "#1a0f08" },
            }}
          >
            Generate more
          </Button>
        </Paper>
      )}
    </Box>
  )
}
