"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  TextField,
} from "@mui/material"
import { Close, ContentCopy, ExpandMore, ExpandLess } from "@mui/icons-material"
import {
  findDefinitionCandidates,
  findLemmaCandidates,
  findConjugationCandidates,
  type DefinitionCandidate,
  type LemmaCandidate,
  type ConjugationCandidate,
} from "@/app/actions/admin"
import {
  buildSingleConjugationPromptData,
  validateConjugationRows,
  commitConjugations,
  type GeneratedConjugation,
} from "@/app/actions/conjugations"
import { errorMessage } from "@/app/lib/errors"
import { stripDiacritics } from "@/app/lib/arabic"

export type UndefinedWordWizardDialogProps = {
  open: boolean
  onClose: () => void
  lemma: string
  root: string | null
  surfaceArabic: string | undefined
  pos: string | undefined
  cefr: string | undefined
  missingTable: "lemmas" | "definitions" | "conjugations"
  locations: { path: string; timestamp?: string; translation?: string; tokenJson?: string; source?: string }[]
  source?: string | null
  onUseCandidate: (newLemma: string, newRoot?: string | null) => void
  onUpdateDefinition?: (definitionId: number, newLemma: string, root: string | null) => void
  onUpdateLemma?: (wordId: number, newLemma: string) => void
  onUpdateConjugationLemma?: (oldLemma: string, root: string | null, newLemma: string) => void
  onCommitConjugations?: () => void
}

const GOLD = "#b8860b"
const BARK = "#2c1a0e"
const CREAM = "#f5ede0"
const MUTED = "#7a6e65"
const DARK_GREEN = "#1B4D3E"

function CandidateCard({ children }: { children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: "12px", bgcolor: CREAM }}>
      {children}
    </Paper>
  )
}

function buildLlmPrompt(
  missingTable: "lemmas" | "definitions" | "conjugations",
  lemma: string,
  root: string | null,
  surfaceArabic: string | undefined,
  pos: string | undefined,
  cefr: string | undefined,
  candidates: DefinitionCandidate[] | LemmaCandidate[] | ConjugationCandidate[]
): string {
  const tokenBlock = `Transcript token:
- lemma: ${lemma}
- arabic (surface form): ${surfaceArabic ?? "(not provided)"}
- arabic_plain: ${surfaceArabic ? stripDiacritics(surfaceArabic) : "(not provided)"}
- root: ${root ?? "(none)"}
- pos: ${pos ?? "(not provided)"}
- cefr: ${cefr ?? "(not provided)"}`

  if (missingTable === "lemmas") {
    const candidateText = (candidates as LemmaCandidate[])
      .map(
        (c, i) => `Candidate ${i + 1}:
- lemma: ${c.lemma}
- lemma_plain: ${c.lemma_plain}
- root: ${c.root ?? "(none)"}
- entry_type: ${c.entry_type}
- CEFR: ${c.CEFR ?? "(none)"}
- match_strategy: ${c.strategy}`
      )
      .join("\n\n")

    return `I am reconciling an Arabic transcript token with the \`vocab_lemmas\` table. The transcript lemma does not exactly match any active lemma row.

${tokenBlock}

${candidateText}

Which lemma is the correct canonical form? Please tell me whether I should:

A) Update the transcript lemma to match one of the candidate lemmas.
B) Update the database lemma row's lemma to match the transcript.
C) None of these candidates match; the word needs a new lemma row.

For your chosen option, specify the exact corrected strings and a one-sentence reason.`
  }

  if (missingTable === "conjugations") {
    const candidateText = (candidates as ConjugationCandidate[])
      .map(
        (c, i) => `Candidate ${i + 1}:
- lemma: ${c.lemma}
- root: ${c.root ?? "(none)"}
- type: ${c.type}
- conjugation_ar: ${c.conjugation_ar}
- conjugation_diacritic: ${c.conjugation_diacritic}
- english_translation: ${c.english_translation ?? "(none)"}
- match_strategy: ${c.strategy}`
      )
      .join("\n\n")

    return `I am reconciling an Arabic verb from a transcript with the \`verb_conjugations\` table. The verb lemma does not exactly match any active conjugation row.

${tokenBlock}

${candidateText}

Which lemma is the correct canonical form for this verb? Please tell me whether I should:

A) Update the transcript lemma to match one of the candidate conjugation lemmas.
B) Update the database conjugation rows' lemma to match the transcript.
C) None of these candidates match; the verb needs new conjugation rows.

For your chosen option, specify the exact corrected lemma string and a one-sentence reason.`
  }

  const candidateText = (candidates as DefinitionCandidate[])
    .map(
      (c, i) => `Candidate ${i + 1}:
- lemma: ${c.lemma}
- lemma_plain: ${c.lemma_plain}
- root: ${c.root ?? "(none)"}
- gloss: ${c.gloss}
- part_of_speech: ${c.part_of_speech}
- definition_en: ${c.definition_en ?? "(none)"}
- match_strategy: ${c.strategy}`
    )
    .join("\n\n")

  return `I am reconciling an Arabic transcript token with dictionary definitions in a language-learning database. The word was flagged as "missing from definitions" because the transcript lemma does not exactly match any \`vocab_definitions.lemma\` row.

${tokenBlock}

${candidateText}

Which lemma is the correct canonical form for this Arabic word? Please tell me whether I should:

A) Update the transcript lemma to match one of the candidate definition lemmas.
B) Update the database definition's lemma to match the transcript lemma.
C) None of these candidates match; the word needs a new definition.

For your chosen option, specify the exact corrected lemma string and a one-sentence reason.`
}

export default function UndefinedWordWizardDialog({
  open,
  onClose,
  lemma,
  root,
  surfaceArabic,
  pos,
  cefr,
  missingTable,
  locations,
  source,
  onUseCandidate,
  onUpdateDefinition,
  onUpdateLemma,
  onUpdateConjugationLemma,
  onCommitConjugations,
}: UndefinedWordWizardDialogProps) {
  const [candidates, setCandidates] = useState<DefinitionCandidate[] | LemmaCandidate[] | ConjugationCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)

  // Conjugation-generation paste flow
  const [conjugationPrompt, setConjugationPrompt] = useState<string>("")
  const [conjugationJson, setConjugationJson] = useState<string>("")
  const [validatedConjugations, setValidatedConjugations] = useState<{
    rows: GeneratedConjugation[]
    count: number
  } | null>(null)
  const [conjugationActionLoading, setConjugationActionLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setCandidates([])
      setError(null)
      setCopied(false)
      setConjugationPrompt("")
      setConjugationJson("")
      setValidatedConjugations(null)
      return
    }

    setLoading(true)
    setError(null)

    let fetcher: Promise<DefinitionCandidate[] | LemmaCandidate[] | ConjugationCandidate[]>
    if (missingTable === "definitions") {
      fetcher = findDefinitionCandidates(lemma, root, surfaceArabic)
    } else if (missingTable === "lemmas") {
      fetcher = findLemmaCandidates(lemma, root, surfaceArabic)
    } else {
      fetcher = findConjugationCandidates(lemma, root, surfaceArabic)
    }

    fetcher
      .then((rows) => setCandidates(rows))
      .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to load candidates"))
      .finally(() => setLoading(false))

    if (missingTable === "conjugations") {
      buildSingleConjugationPromptData(lemma, root, surfaceArabic, source)
        .then((res) => {
          if (res.ok) {
            setConjugationPrompt(res.prompt)
          } else {
            setError(res.error)
          }
        })
        .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to build conjugation prompt"))
    }
  }, [open, lemma, root, surfaceArabic, missingTable, source])

  const llmPrompt = useMemo(
    () => buildLlmPrompt(missingTable, lemma, root, surfaceArabic, pos, cefr, candidates),
    [missingTable, lemma, root, surfaceArabic, pos, cefr, candidates]
  )

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(missingTable === "conjugations" ? conjugationPrompt : llmPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Could not copy to clipboard")
    }
  }

  const handleValidateConjugationJson = async () => {
    setConjugationActionLoading(true)
    setError(null)
    setValidatedConjugations(null)
    try {
      let parsed: unknown
      try {
        parsed = JSON.parse(conjugationJson)
      } catch {
        setError("The pasted text is not valid JSON.")
        return
      }
      const result = await validateConjugationRows(parsed)
      if (result.ok) {
        setValidatedConjugations({ rows: result.rows, count: result.rows.length })
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to validate conjugations")
    } finally {
      setConjugationActionLoading(false)
    }
  }

  const handleCommitConjugations = async () => {
    if (!validatedConjugations || validatedConjugations.rows.length === 0) return
    setConjugationActionLoading(true)
    setError(null)
    try {
      const result = await commitConjugations(validatedConjugations.rows)
      if (result.ok) {
        onCommitConjugations?.()
        onClose()
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to commit conjugations")
    } finally {
      setConjugationActionLoading(false)
    }
  }

  const handleUse = (newLemma: string, newRoot?: string | null) => {
    onUseCandidate(newLemma, newRoot)
    onClose()
  }

  const handleUpdateDefinition = async (definitionId: number, newLemma: string, defRoot: string | null) => {
    const key = `${definitionId}|${newLemma}`
    setActionLoading((prev) => new Set(prev).add(key))
    try {
      await onUpdateDefinition?.(definitionId, newLemma, defRoot)
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to update definition")
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleUpdateLemmaRow = async (wordId: number, newLemma: string) => {
    const key = `${wordId}|${newLemma}`
    setActionLoading((prev) => new Set(prev).add(key))
    try {
      await onUpdateLemma?.(wordId, newLemma)
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to update lemma")
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleUpdateConjugationRow = async (oldLemma: string, conjRoot: string | null, newLemma: string) => {
    const key = `${oldLemma}|${newLemma}`
    setActionLoading((prev) => new Set(prev).add(key))
    try {
      await onUpdateConjugationLemma?.(oldLemma, conjRoot, newLemma)
      onClose()
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to update conjugations")
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(44,26,14,0.2)",
            bgcolor: CREAM,
            maxHeight: "calc(100vh - 64px)",
            width: { md: "900px", lg: "1100px" },
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: "1.75rem",
          fontWeight: 700,
          color: BARK,
          pb: 2,
          pt: 2.5,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {missingTable === "definitions" && "Resolve missing definition"}
        {missingTable === "lemmas" && "Resolve missing lemma"}
        {missingTable === "conjugations" && "Resolve missing conjugation"}
        <IconButton onClick={onClose} size="small" sx={{ color: MUTED, mr: -0.5 }}>
          <Close sx={{ fontSize: "1.4rem" }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 2 }}>
        {error && (
          <Typography
            sx={{
              fontFamily: "Jost, sans-serif",
              fontSize: "1rem",
              color: "#c0392b",
              background: "rgba(192,57,43,0.06)",
              border: "1px solid rgba(192,57,43,0.2)",
              borderRadius: "8px",
              px: 2,
              py: 1.5,
              mb: 3,
            }}
          >
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Explanation */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", bgcolor: "#fff" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setExplainOpen((prev) => !prev)}
            >
              <Typography
                sx={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: BARK,
                }}
              >
                What this wizard does
              </Typography>
              <Button
                size="small"
                endIcon={explainOpen ? <ExpandLess /> : <ExpandMore />}
                sx={{
                  fontFamily: "Jost, sans-serif",
                  textTransform: "none",
                  color: MUTED,
                }}
              >
                {explainOpen ? "Hide" : "Show"}
              </Button>
            </Box>
            <Collapse in={explainOpen}>
              <Box sx={{ pt: 1.5 }}>
                {missingTable === "definitions" && (
                  <>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.05rem", color: MUTED, lineHeight: 1.6 }}>
                      The transcript token does not have an exact matching row in the <code>vocab_definitions</code> table.
                      This usually happens because of a tiny diacritic difference or a different spelling.
                    </Typography>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.05rem", color: MUTED, lineHeight: 1.6, mt: 1.5 }}>
                      The wizard searches for existing definitions and lets you either update the transcript to match a
                      candidate, or update the definition to match the transcript.
                    </Typography>
                  </>
                )}
                {missingTable === "lemmas" && (
                  <>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.05rem", color: MUTED, lineHeight: 1.6 }}>
                      The transcript token does not have a matching row in the <code>vocab_lemmas</code> table. A lemma row
                      is the canonical record that links an Arabic word to its root, CEFR level, and entry type.
                    </Typography>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.05rem", color: MUTED, lineHeight: 1.6, mt: 1.5 }}>
                      Use the prompt below to ask an LLM to generate the lemma row, then create it in the Data Review page
                      or through the pipeline.
                    </Typography>
                  </>
                )}
                {missingTable === "conjugations" && (
                  <>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.05rem", color: MUTED, lineHeight: 1.6 }}>
                      This verb does not have matching rows in the <code>verb_conjugations</code> table. Conjugation rows
                      cover past, present, imperative, and other verbal forms.
                    </Typography>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.05rem", color: MUTED, lineHeight: 1.6, mt: 1.5 }}>
                      Use the prompt below to ask an LLM to generate the conjugation rows, then create them through the
                      pipeline or Data Review page.
                    </Typography>
                  </>
                )}
                <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.05rem", color: MUTED, lineHeight: 1.6, mt: 1.5 }}>
                  If you are unsure what the correct row should look like, copy the prompt at the bottom and paste it into an LLM.
                </Typography>
              </Box>
            </Collapse>
          </Paper>

          {/* Transcript token */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", bgcolor: "#fff" }}>
            <Typography
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: BARK,
                mb: 2,
              }}
            >
              Transcript token
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem" }}>
                      Lemma
                    </TableCell>
                    {root && (
                      <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem" }}>
                        Root
                      </TableCell>
                    )}
                    {surfaceArabic && (
                      <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem" }}>
                        Surface form
                      </TableCell>
                    )}
                    {pos && (
                      <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem" }}>
                        POS
                      </TableCell>
                    )}
                    {cefr && (
                      <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem" }}>
                        CEFR
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: "1.6rem",
                        color: BARK,
                        direction: "rtl",
                      }}
                    >
                      {lemma}
                    </TableCell>
                    {root && (
                      <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.3rem", color: BARK }}>
                        {root}
                      </TableCell>
                    )}
                    {surfaceArabic && (
                      <TableCell
                        sx={{
                          fontFamily: "'EB Garamond', serif",
                          fontSize: "1.6rem",
                          color: BARK,
                          direction: "rtl",
                        }}
                      >
                        {surfaceArabic}
                      </TableCell>
                    )}
                    {pos && (
                      <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.1rem", color: BARK }}>{pos}</TableCell>
                    )}
                    {cefr && (
                      <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.1rem", color: BARK }}>
                        {cefr.toUpperCase()}
                      </TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {locations.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.85rem", color: MUTED, fontWeight: 600, mb: 1 }}>
                  LOCATIONS IN TRANSCRIPT
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {locations.map((loc, i) => (
                    <Box key={i}>
                      <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.9rem", color: MUTED, mb: 0.5 }}>
                        {loc.path}
                        {loc.timestamp && ` · ${loc.timestamp}`}
                        {loc.translation && ` · "${loc.translation}"`}
                      </Typography>
                      {loc.tokenJson && (
                        <Box
                          component="pre"
                          sx={{
                            fontFamily: "'Geist Mono', monospace",
                            fontSize: "0.85rem",
                            lineHeight: 1.5,
                            bgcolor: "#f8f8f8",
                            color: BARK,
                            p: 1.5,
                            borderRadius: "8px",
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {loc.tokenJson}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>

          {/* Candidates */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", bgcolor: "#fff" }}>
            <Typography
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: BARK,
                mb: 2,
              }}
            >
              {missingTable === "definitions" && "Candidate definitions"}
              {missingTable === "lemmas" && "Candidate lemmas"}
              {missingTable === "conjugations" && "Candidate conjugations"}
            </Typography>

            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} sx={{ color: GOLD }} />
              </Box>
            )}

            {!loading && candidates.length === 0 && (
              <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1.1rem", color: MUTED }}>
                {missingTable === "definitions" && "No candidate definitions found. You may need to create a new definition for this word."}
                {missingTable === "lemmas" && "No candidate lemmas found. You may need to create a new lemma row."}
                {missingTable === "conjugations" && "No candidate conjugations found. You may need to create new conjugation rows."}
              </Typography>
            )}

            {!loading && missingTable === "definitions" &&
              (candidates as DefinitionCandidate[]).map((candidate) => {
                const actionKey = `${candidate.definition_id}|${candidate.lemma}`
                const isActionLoading = actionLoading.has(actionKey)
                return (
                  <CandidateCard key={candidate.definition_id}>
                    <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
                      <TableContainer sx={{ width: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Lemma</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Root</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>POS</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Definition</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Match</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.6rem", color: BARK, direction: "rtl", borderBottom: "none", pt: 0.5 }}>
                                {candidate.lemma}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.6rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.root ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.part_of_speech}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.definition_en ?? candidate.gloss}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: MUTED, textTransform: "uppercase", borderBottom: "none", pt: 0.5 }}>
                                {candidate.strategy}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                      <Button
                        variant="contained"
                        disabled={isActionLoading}
                        onClick={() => handleUse(candidate.lemma, candidate.root)}
                        sx={{ background: DARK_GREEN, color: "#fff", fontFamily: "Jost, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "none", borderRadius: "10px", px: 3, "&:hover": { background: "#143d30" } }}
                      >
                        Update transcript
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateDefinition(candidate.definition_id, lemma, candidate.root ?? root)}
                        sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "none", borderRadius: "10px", borderColor: "rgba(122,110,101,0.4)", color: BARK, px: 3 }}
                      >
                        Update database
                      </Button>
                    </Box>
                  </CandidateCard>
                )
              })}

            {!loading && missingTable === "lemmas" &&
              (candidates as LemmaCandidate[]).map((candidate) => {
                const actionKey = `${candidate.word_id}|${candidate.lemma}`
                const isActionLoading = actionLoading.has(actionKey)
                return (
                  <CandidateCard key={candidate.word_id}>
                    <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
                      <TableContainer sx={{ width: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Lemma</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Lemma plain</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Root</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Type</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>CEFR</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Match</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.6rem", color: BARK, direction: "rtl", borderBottom: "none", pt: 0.5 }}>
                                {candidate.lemma}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.6rem", color: BARK, direction: "rtl", borderBottom: "none", pt: 0.5 }}>
                                {candidate.lemma_plain}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.6rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.root ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.entry_type}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.CEFR ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: MUTED, textTransform: "uppercase", borderBottom: "none", pt: 0.5 }}>
                                {candidate.strategy}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                      <Button
                        variant="contained"
                        disabled={isActionLoading}
                        onClick={() => handleUse(candidate.lemma, candidate.root)}
                        sx={{ background: DARK_GREEN, color: "#fff", fontFamily: "Jost, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "none", borderRadius: "10px", px: 3, "&:hover": { background: "#143d30" } }}
                      >
                        Update transcript
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateLemmaRow(candidate.word_id, lemma)}
                        sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "none", borderRadius: "10px", borderColor: "rgba(122,110,101,0.4)", color: BARK, px: 3 }}
                      >
                        Update database
                      </Button>
                    </Box>
                  </CandidateCard>
                )
              })}

            {!loading && missingTable === "conjugations" &&
              (candidates as ConjugationCandidate[]).map((candidate) => {
                const actionKey = `${candidate.conjugation_id}|${candidate.lemma}`
                const isActionLoading = actionLoading.has(actionKey)
                return (
                  <CandidateCard key={candidate.conjugation_id}>
                    <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
                      <TableContainer sx={{ width: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Lemma</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Root</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Type</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Conjugation</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>English</TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontWeight: 700, color: MUTED, fontSize: "0.85rem", borderBottom: "none", pb: 0.5 }}>Match</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.6rem", color: BARK, direction: "rtl", borderBottom: "none", pt: 0.5 }}>
                                {candidate.lemma}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.6rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.root ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.type}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.3rem", color: BARK, direction: "rtl", borderBottom: "none", pt: 0.5 }}>
                                {candidate.conjugation_diacritic}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: BARK, borderBottom: "none", pt: 0.5 }}>
                                {candidate.english_translation ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: MUTED, textTransform: "uppercase", borderBottom: "none", pt: 0.5 }}>
                                {candidate.strategy}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                      <Button
                        variant="contained"
                        disabled={isActionLoading}
                        onClick={() => handleUse(candidate.lemma, candidate.root)}
                        sx={{ background: DARK_GREEN, color: "#fff", fontFamily: "Jost, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "none", borderRadius: "10px", px: 3, "&:hover": { background: "#143d30" } }}
                      >
                        Update transcript
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateConjugationRow(candidate.lemma, root, lemma)}
                        sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "none", borderRadius: "10px", borderColor: "rgba(122,110,101,0.4)", color: BARK, px: 3 }}
                      >
                        Update database
                      </Button>
                    </Box>
                  </CandidateCard>
                )
              })}
          </Paper>

          {/* LLM prompt */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", bgcolor: "#fff" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography
                sx={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: BARK,
                }}
              >
                {missingTable === "definitions" && "Ask an LLM"}
                {missingTable === "lemmas" && "Generate lemma row"}
                {missingTable === "conjugations" && "Generate conjugation rows"}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopy sx={{ fontSize: "1rem" }} />}
                onClick={handleCopyPrompt}
                sx={{
                  fontFamily: "Jost, sans-serif",
                  fontSize: "0.9rem",
                  textTransform: "none",
                  borderRadius: "8px",
                  borderColor: "rgba(122,110,101,0.4)",
                  color: BARK,
                }}
              >
                {copied ? "Copied!" : "Copy prompt"}
              </Button>
            </Box>
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: MUTED, mb: 2 }}>
              {missingTable === "definitions" &&
                "Copy this prompt and paste it into ChatGPT, Claude, or Gemini. It compares the transcript token with the candidate definitions and asks which spelling is correct."}
              {missingTable === "lemmas" &&
                "Copy this prompt and paste it into ChatGPT, Claude, or Gemini. It asks for a new vocab_lemmas row matching the transcript token."}
              {missingTable === "conjugations" &&
                "Copy this prompt and paste it into ChatGPT, Claude, or Gemini. It asks for verb_conjugations rows matching the transcript token."}
            </Typography>
            <Box
              component="pre"
              sx={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                bgcolor: "#f8f8f8",
                color: BARK,
                p: 2,
                borderRadius: "8px",
                overflow: "auto",
                maxHeight: "300px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {missingTable === "conjugations" ? conjugationPrompt : llmPrompt}
            </Box>

            {missingTable === "conjugations" && (
              <Box sx={{ mt: 3 }}>
                <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.2rem", fontWeight: 700, color: BARK, mb: 1 }}>
                  Paste LLM output
                </Typography>
                <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: MUTED, mb: 2 }}>
                  Paste the JSON array the LLM returned below. Click <strong>Validate</strong> to check it, then <strong>Commit</strong> to insert the rows into <code>verb_conjugations</code>.
                </Typography>
                <TextField
                  multiline
                  fullWidth
                  rows={6}
                  value={conjugationJson}
                  onChange={(e) => setConjugationJson(e.target.value)}
                  placeholder="[{ ... }]"
                  disabled={conjugationActionLoading}
                  sx={{
                    mb: 2,
                    fontFamily: "'Geist Mono', monospace",
                    "& .MuiInputBase-root": {
                      bgcolor: "#f8f8f8",
                      borderRadius: "8px",
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: "0.95rem",
                      alignItems: "flex-start",
                    },
                  }}
                />
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Button
                    variant="outlined"
                    disabled={conjugationActionLoading || !conjugationJson.trim()}
                    onClick={handleValidateConjugationJson}
                    sx={{
                      fontFamily: "Jost, sans-serif",
                      fontSize: "1rem",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "10px",
                      borderColor: "rgba(122,110,101,0.4)",
                      color: BARK,
                      px: 3,
                    }}
                  >
                    {conjugationActionLoading && !validatedConjugations ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                    Validate
                  </Button>
                  <Button
                    variant="contained"
                    disabled={conjugationActionLoading || !validatedConjugations}
                    onClick={handleCommitConjugations}
                    sx={{
                      background: DARK_GREEN,
                      color: "#fff",
                      fontFamily: "Jost, sans-serif",
                      fontSize: "1rem",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "10px",
                      px: 3,
                      "&:hover": { background: "#143d30" },
                    }}
                  >
                    {conjugationActionLoading && validatedConjugations ? <CircularProgress size={18} sx={{ mr: 1, color: "#fff" }} /> : null}
                    Commit {validatedConjugations ? `(${validatedConjugations.count})` : ""}
                  </Button>
                  {validatedConjugations && (
                    <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: DARK_GREEN }}>
                      {validatedConjugations.count} valid row{validatedConjugations.count === 1 ? "" : "s"}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            fontSize: "1rem",
            textTransform: "none",
            borderRadius: "10px",
            borderColor: "rgba(122,110,101,0.4)",
            color: BARK,
            px: 3,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
