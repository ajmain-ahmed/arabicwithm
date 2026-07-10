"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Tooltip,
  Chip,
  Collapse,
  Divider,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Checkbox,
  FormControlLabel,
} from "@mui/material"
import {
  UploadFile,
  PlayArrow,
  Add,
  Cancel,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Replay,
  Help,
  ContentCopy,
  ArrowForward,
  ArrowBack,
  RemoveCircle,
  AddCircle,
} from "@mui/icons-material"
import AdminTextField from "../components/AdminTextField"
import { errorMessage } from "@/app/lib/errors"
import {
  previewPipeline,
  commitPipeline,
  buildDefinitionsPromptData,
  commitDefinitions,
  checkExistingDefinitions,
  type PipelinePreviewResult,
  type DefinitionsPromptData,
  type ExistingLemmaWithDefs,
} from "@/app/actions/pipeline"
import { validateDefinitionRows, type PipelineItem, type DefinitionOutputRow } from "@/app/lib/pipelineValidation"
import {
  fetchConjugationCandidatesForSource,
  generateConjugations,
  commitConjugations,
  type VerbCandidate,
  type GeneratedConjugation,
} from "@/app/actions/conjugations"


function groupKey(item: PipelineItem): string {
  return `${item.arabic}|${item.root ?? ""}|${item.entry_type}`
}

function definitionKey(row: DefinitionOutputRow, index: number): string {
  return `${index}|${row.lemma_diacritic}|${row.arabic_root ?? ""}`
}

function conjKey(row: GeneratedConjugation): string {
  return `${row.lemma}|${row.root ?? ""}|${row.tense}|${row.pronoun}`
}

export default function PipelinePage() {
  const [source, setSource] = useState("")
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PipelinePreviewResult | null>(null)
  const [existingOpen, setExistingOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(true)
  const [committing, setCommitting] = useState(false)
  const [committedCount, setCommittedCount] = useState<number | null>(null)
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptData, setPromptData] = useState<DefinitionsPromptData | null>(null)
  const [excludedExistingKeys, setExcludedExistingKeys] = useState<Set<string>>(new Set())
  const [promptVisible, setPromptVisible] = useState(false)
  const [llmOutput, setLlmOutput] = useState("")
  const [showDefinitionsInput, setShowDefinitionsInput] = useState(false)
  const [definitionRows, setDefinitionRows] = useState<DefinitionOutputRow[] | null>(null)
  const [definitionValidationError, setDefinitionValidationError] = useState<string | null>(null)
  const [excludedDefinitionKeys, setExcludedDefinitionKeys] = useState<Set<string>>(new Set())
  const [definitionExistingKeys, setDefinitionExistingKeys] = useState<Set<string>>(new Set())
  const [insertingDefinitions, setInsertingDefinitions] = useState(false)
  const [definitionsInserted, setDefinitionsInserted] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const [conjugationCandidates, setConjugationCandidates] = useState<VerbCandidate[] | null>(null)
  const [conjugationExistingCount, setConjugationExistingCount] = useState(0)
  const [conjugationLoading, setConjugationLoading] = useState(false)
  const [generatedConjugationRows, setGeneratedConjugationRows] = useState<GeneratedConjugation[] | null>(null)
  const [conjugationSkipped, setConjugationSkipped] = useState<{ lemma: string; reason: string }[]>([])
  const [conjugationExcludedKeys, setConjugationExcludedKeys] = useState<Set<string>>(new Set())
  const [conjugationExpandedLemmas, setConjugationExpandedLemmas] = useState<Set<string>>(new Set())
  const [conjugationInserting, setConjugationInserting] = useState(false)
  const [conjugationsInserted, setConjugationsInserted] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        setJsonText(text)
        setError(null)
        setPreview(null)
        setCommittedCount(null)
        setPromptData(null)
        setExcludedExistingKeys(new Set())
        setPromptVisible(false)
        setLlmOutput("")
        setShowDefinitionsInput(false)
        setDefinitionRows(null)
        setDefinitionValidationError(null)
        setExcludedDefinitionKeys(new Set())
        setInsertingDefinitions(false)
        setDefinitionsInserted(null)
        setConjugationCandidates(null)
        setConjugationExistingCount(0)
        setConjugationLoading(false)
        setGeneratedConjugationRows(null)
        setConjugationSkipped([])
        setConjugationExcludedKeys(new Set())
        setConjugationExpandedLemmas(new Set())
        setConjugationInserting(false)
        setConjugationsInserted(null)
      } catch (err: unknown) {
        setError(errorMessage(err) ?? "Failed to read file")
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    []
  )

  const handleProcess = useCallback(async () => {
    setError(null)
    setPreview(null)
    setCommittedCount(null)
    setPromptData(null)
    setExcludedExistingKeys(new Set())
    setPromptVisible(false)
    setLlmOutput("")
    setShowDefinitionsInput(false)
    setDefinitionRows(null)
    setDefinitionValidationError(null)
    setExcludedDefinitionKeys(new Set())
    setDefinitionExistingKeys(new Set())
    setInsertingDefinitions(false)
    setDefinitionsInserted(null)
    setConjugationCandidates(null)
    setConjugationExistingCount(0)
    setConjugationLoading(false)
    setGeneratedConjugationRows(null)
    setConjugationSkipped([])
    setConjugationExcludedKeys(new Set())
    setConjugationExpandedLemmas(new Set())
    setConjugationInserting(false)
    setConjugationsInserted(null)

    if (!source.trim()) {
      setError("Please enter a source (e.g. sb-1).")
      return
    }
    if (!jsonText.trim()) {
      setError("Please paste JSON or upload a file.")
      return
    }

    setLoading(true)
    try {
      const result = await previewPipeline(source, jsonText)
      setPreview(result)
      if (!result.ok) {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to process pipeline")
    } finally {
      setLoading(false)
    }
  }, [source, jsonText])

  const loadPromptData = useCallback(
    async (existing: PipelineItem[], newLemmas: PipelineItem[], committed: number | null = null) => {
      setPromptLoading(true)
      setError(null)
      try {
        const result = await buildDefinitionsPromptData(source, jsonText, existing, newLemmas)
        if (result.ok) {
          setPromptData(result.data)
          setExcludedExistingKeys(new Set())
          setPromptVisible(false)
          if (committed !== null) setCommittedCount(committed)
        } else {
          setError(result.error)
        }
      } catch (e: unknown) {
        setError(errorMessage(e) ?? "Failed to build definitions prompt")
      } finally {
        setPromptLoading(false)
      }
    },
    [source, jsonText]
  )

  const handleCommit = useCallback(async () => {
    if (!preview || !preview.ok) return

    setCommitting(true)
    setError(null)
    try {
      const result = await commitPipeline(source, preview.new)
      if (result.ok) {
        await loadPromptData(preview.existing, preview.new, result.inserted)
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to insert rows")
    } finally {
      setCommitting(false)
    }
  }, [preview, source, loadPromptData])

  const handleSkipToPrompt = useCallback(async () => {
    if (!preview || !preview.ok) return
    await loadPromptData(preview.existing, preview.new, 0)
  }, [preview, loadPromptData])

  const handleReset = useCallback(() => {
    setSource("")
    setJsonText("")
    setError(null)
    setPreview(null)
    setCommittedCount(null)
    setPromptData(null)
    setExcludedExistingKeys(new Set())
    setPromptVisible(false)
    setLlmOutput("")
    setShowDefinitionsInput(false)
    setDefinitionRows(null)
    setDefinitionValidationError(null)
    setExcludedDefinitionKeys(new Set())
    setInsertingDefinitions(false)
    setDefinitionsInserted(null)
    setCopied(false)
    setExistingOpen(false)
    setNewOpen(true)
    setConjugationCandidates(null)
    setConjugationExistingCount(0)
    setConjugationLoading(false)
    setGeneratedConjugationRows(null)
    setConjugationSkipped([])
    setConjugationExcludedKeys(new Set())
    setConjugationExpandedLemmas(new Set())
    setConjugationInserting(false)
    setConjugationsInserted(null)
  }, [])

  const handleBackToInput = useCallback(() => {
    setPreview(null)
    setCommittedCount(null)
    setPromptData(null)
    setExcludedExistingKeys(new Set())
    setPromptVisible(false)
    setLlmOutput("")
    setShowDefinitionsInput(false)
    setDefinitionRows(null)
    setDefinitionValidationError(null)
    setExcludedDefinitionKeys(new Set())
    setDefinitionExistingKeys(new Set())
    setDefinitionsInserted(null)
  }, [])

  const handleBackToReview = useCallback(() => {
    setPromptData(null)
    setPromptVisible(false)
    setLlmOutput("")
    setShowDefinitionsInput(false)
    setDefinitionRows(null)
    setDefinitionValidationError(null)
    setExcludedDefinitionKeys(new Set())
    setDefinitionExistingKeys(new Set())
    setDefinitionsInserted(null)
  }, [])

  const handleBackToExistingDefs = useCallback(() => {
    setPromptVisible(false)
    setLlmOutput("")
    setShowDefinitionsInput(false)
    setDefinitionRows(null)
    setDefinitionValidationError(null)
    setExcludedDefinitionKeys(new Set())
    setDefinitionExistingKeys(new Set())
    setDefinitionsInserted(null)
  }, [])

  const handleBackToPrompt = useCallback(() => {
    setShowDefinitionsInput(false)
    setDefinitionRows(null)
    setDefinitionValidationError(null)
    setExcludedDefinitionKeys(new Set())
    setDefinitionExistingKeys(new Set())
    setDefinitionsInserted(null)
  }, [])

  const handleBackToDefinitionsInput = useCallback(() => {
    setDefinitionRows(null)
    setDefinitionValidationError(null)
    setExcludedDefinitionKeys(new Set())
    setDefinitionExistingKeys(new Set())
    setDefinitionsInserted(null)
  }, [])

  const toggleExistingExcluded = useCallback((key: string) => {
    setExcludedExistingKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAllExisting = useCallback(() => {
    setExcludedExistingKeys(new Set())
  }, [])

  const deselectAllExisting = useCallback(() => {
    if (!promptData) return
    const keys = new Set<string>()
    for (const item of promptData.existingLemmas) {
      if (item.definitions.length > 0) {
        keys.add(existingLemmaKey(item))
      }
    }
    setExcludedExistingKeys(keys)
  }, [promptData])

  const handleSkipExistingDefsReview = useCallback(() => {
    setExcludedExistingKeys(new Set())
    setPromptVisible(true)
  }, [])

  const handleContinueToPrompt = useCallback(() => {
    setPromptVisible(true)
  }, [])

  const handleContinueToDefinitionsInput = useCallback(() => {
    setShowDefinitionsInput(true)
  }, [])

  const handleValidateLlmOutput = useCallback(async () => {
    setDefinitionValidationError(null)
    setDefinitionRows(null)
    setExcludedDefinitionKeys(new Set())
    setDefinitionExistingKeys(new Set())
    setDefinitionsInserted(null)

    if (!llmOutput.trim()) {
      setDefinitionValidationError("Please paste the LLM output JSON.")
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(llmOutput)
    } catch {
      setDefinitionValidationError("Invalid JSON. Please check the LLM output and try again.")
      return
    }

    if (!Array.isArray(parsed)) {
      setDefinitionValidationError("LLM output must be a JSON array.")
      return
    }

    const validation = validateDefinitionRows(parsed)
    if (!validation.ok) {
      setDefinitionValidationError(validation.error)
      return
    }

    const rowsWithSource = validation.rows.map((row) => ({
      ...row,
      source: row.source || source.trim(),
    }))

    const existingResult = await checkExistingDefinitions(rowsWithSource)
    if (!existingResult.ok) {
      setDefinitionValidationError(existingResult.error)
      return
    }

    const existingComposite = new Set(existingResult.existingKeys)
    const existingUiKeys = new Set<string>()
    for (let i = 0; i < rowsWithSource.length; i++) {
      const row = rowsWithSource[i]
      const composite = `${row.lemma_diacritic}|${row.arabic_root ?? ""}`
      if (existingComposite.has(composite)) {
        existingUiKeys.add(definitionKey(row, i))
      }
    }

    setDefinitionExistingKeys(existingUiKeys)
    setExcludedDefinitionKeys(existingUiKeys)
    setDefinitionRows(rowsWithSource)
  }, [llmOutput, source])

  const updateDefinitionRow = useCallback(
    (index: number, field: keyof DefinitionOutputRow, value: string | null) => {
      setDefinitionRows((prev) => {
        if (!prev) return prev
        const next = [...prev]
        next[index] = { ...next[index], [field]: value }
        return next
      })
    },
    []
  )

  const toggleDefinitionExcluded = useCallback((key: string) => {
    setExcludedDefinitionKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAllDefinitions = useCallback(() => {
    setExcludedDefinitionKeys(new Set())
  }, [])

  const deselectAllDefinitions = useCallback(() => {
    if (!definitionRows) return
    setExcludedDefinitionKeys(new Set(definitionRows.map((row, idx) => definitionKey(row, idx))))
  }, [definitionRows])

  const handleInsertDefinitions = useCallback(async () => {
    if (!definitionRows) return
    const included = definitionRows.filter(
      (row, idx) => !excludedDefinitionKeys.has(definitionKey(row, idx))
    )
    if (included.length === 0) {
      setDefinitionValidationError("No rows selected for insertion.")
      return
    }

    setInsertingDefinitions(true)
    setDefinitionValidationError(null)
    try {
      const result = await commitDefinitions(source, included)
      if (result.ok) {
        setDefinitionsInserted(result.inserted)
      } else {
        setDefinitionValidationError(result.error)
      }
    } catch (e: unknown) {
      setDefinitionValidationError(errorMessage(e) ?? "Failed to insert definitions")
    } finally {
      setInsertingDefinitions(false)
    }
  }, [definitionRows, excludedDefinitionKeys, source])

  const handleStartConjugations = useCallback(async () => {
    setConjugationLoading(true)
    setError(null)
    try {
      const result = await fetchConjugationCandidatesForSource(source)
      if (result.ok) {
        setConjugationCandidates(result.candidates)
        setConjugationExistingCount(result.existingCount)
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load conjugation candidates")
    } finally {
      setConjugationLoading(false)
    }
  }, [source])

  const handleGenerateConjugations = useCallback(async () => {
    if (!conjugationCandidates || conjugationCandidates.length === 0) return
    setConjugationLoading(true)
    setError(null)
    try {
      const result = await generateConjugations(conjugationCandidates)
      if (result.ok) {
        setGeneratedConjugationRows(result.rows)
        setConjugationSkipped(result.skipped)
        setConjugationExcludedKeys(new Set())
        setConjugationExpandedLemmas(new Set())
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to generate conjugations")
    } finally {
      setConjugationLoading(false)
    }
  }, [conjugationCandidates])

  const toggleConjugationExcluded = useCallback((key: string) => {
    setConjugationExcludedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleConjugationLemmaExpanded = useCallback((lemma: string) => {
    setConjugationExpandedLemmas((prev) => {
      const next = new Set(prev)
      if (next.has(lemma)) next.delete(lemma)
      else next.add(lemma)
      return next
    })
  }, [])

  const toggleConjugationLemmaAll = useCallback(
    (lemma: string, excludeAll: boolean) => {
      setConjugationExcludedKeys((prev) => {
        const next = new Set(prev)
        const rowsForLemma = generatedConjugationRows?.filter((r) => r.lemma === lemma) ?? []
        for (const row of rowsForLemma) {
          const key = conjKey(row)
          if (excludeAll) next.add(key)
          else next.delete(key)
        }
        return next
      })
    },
    [generatedConjugationRows]
  )

  const updateConjugationRow = useCallback(
    (key: string, field: keyof GeneratedConjugation, value: string | null) => {
      setGeneratedConjugationRows((prev) => {
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

  const selectAllConjugations = useCallback(() => {
    setConjugationExcludedKeys(new Set())
  }, [])

  const deselectAllConjugations = useCallback(() => {
    if (!generatedConjugationRows) return
    setConjugationExcludedKeys(new Set(generatedConjugationRows.map((row) => conjKey(row))))
  }, [generatedConjugationRows])

  const handleSkipConjugationReview = useCallback(() => {
    setConjugationsInserted(0)
  }, [])

  const handleInsertConjugations = useCallback(async () => {
    if (!generatedConjugationRows) return
    const included = generatedConjugationRows.filter((row) => !conjugationExcludedKeys.has(conjKey(row)))
    if (included.length === 0) {
      setError("No conjugation rows selected for insertion.")
      return
    }

    setConjugationInserting(true)
    setError(null)
    try {
      const result = await commitConjugations(included)
      if (result.ok) {
        setConjugationsInserted(result.inserted)
      } else {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to insert conjugations")
    } finally {
      setConjugationInserting(false)
    }
  }, [generatedConjugationRows, conjugationExcludedKeys])

  const filteredPromptData = promptData
    ? {
        ...promptData,
        existingLemmas: promptData.existingLemmas.filter(
          (item) => !excludedExistingKeys.has(`${item.lemma_diacritic}|${item.arabic_root ?? ""}|${item.entry_type}`)
        ),
      }
    : null

  const generatedPrompt = filteredPromptData ? buildPrompt(filteredPromptData) : ""

  const handleCopyPrompt = useCallback(async () => {
    if (!generatedPrompt) return
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Failed to copy prompt to clipboard")
    }
  }, [generatedPrompt])

  const inputStep = promptData === null && preview === null
  const reviewStep = promptData === null && preview !== null && !promptLoading
  const definitionReviewStep = promptData !== null && !promptVisible
  const promptStep = promptData !== null && promptVisible && !showDefinitionsInput && definitionRows === null && definitionsInserted === null
  const definitionsInputStep = promptData !== null && promptVisible && showDefinitionsInput && definitionRows === null && definitionsInserted === null
  const definitionsReviewStep = definitionRows !== null && definitionsInserted === null
  const definitionsDoneStep = definitionsInserted !== null && conjugationCandidates === null
  const conjugationCandidateStep = conjugationCandidates !== null && generatedConjugationRows === null && conjugationsInserted === null
  const conjugationReviewStep = generatedConjugationRows !== null && conjugationsInserted === null
  const conjugationDoneStep = conjugationsInserted !== null

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}>
          Pipeline
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          Import transcript entries and generate definition prompts.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
          {error}
        </Alert>
      )}

      {inputStep && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: "Jost, sans-serif",
                    fontWeight: 600,
                    color: "#2c1a0e",
                    fontSize: "1.15rem",
                  }}
                >
                  Source
                </Typography>
                <Tooltip
                  title={
                    <Box sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem" }}>
                      Identifies where these entries came from.
                      <br />
                      Examples: sb-1, tmnt-1, copt-2
                    </Box>
                  }
                  arrow
                >
                  <Help sx={{ fontSize: "1.15rem", color: "#9e8a7a", cursor: "help" }} />
                </Tooltip>
              </Box>
              <AdminTextField
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. sb-1"
                fullWidth
                size="small"
                sx={{ "& .MuiInputBase-input": { fontSize: "1.15rem" }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
              />
            </Box>

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: "Jost, sans-serif",
                    fontWeight: 600,
                    color: "#2c1a0e",
                    fontSize: "1.15rem",
                  }}
                >
                  Transcript JSON
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFile />}
                  sx={{
                    textTransform: "none",
                    fontFamily: "Jost, sans-serif",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    borderColor: "rgba(122,110,101,0.3)",
                    color: "#7a6e65",
                    borderRadius: "8px",
                  }}
                >
                  Upload file
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
              </Box>
              <AdminTextField
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='Paste transcript JSON here: an array of entries with a "tokens" array. Each token needs root, lemma, arabic, english, entry_type, and transliteration. CEFR is optional.'
                multiline
                fullWidth
                rows={14}
                sx={{ "& .MuiInputBase-input": { fontSize: "1.1rem" }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handleProcess}
                disabled={loading}
                startIcon={<PlayArrow />}
                sx={{
                  bgcolor: "#2c1a0e",
                  color: "#f5ede0",
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderRadius: "10px",
                  px: 3,
                  "&:hover": { bgcolor: "#1a0f08" },
                }}
              >
                {loading ? "Processing…" : "Process"}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {reviewStep && preview?.ok && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}
          >
            Step 1: Review extracted lemmas
          </Typography>

          <Alert
            severity="info"
            icon={<Help />}
            sx={{
              mb: 3,
              fontFamily: "Jost, sans-serif",
              borderRadius: "10px",
              color: "#2c1a0e",
              "& .MuiAlert-message": { display: "flex", flexDirection: "column", gap: 0.5 },
            }}
          >
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "1rem" }}>
              What happens next?
            </Typography>
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem" }}>
              We scanned every <code>tokens</code> array in your transcript and pulled out each unique word/phrase.
              Each card below represents one <strong>lemma</strong> (the dictionary form) that will be added to the{" "}
              <strong>vocab_lemmas</strong> table.
            </Typography>
            <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem" }}>
              The larger Arabic text is the lemma we will store. When the word appeared differently in the transcript,
              we show that surface form as <em>in context</em>. The English snippet is the gloss from your transcript
              and is shown only to help you review.
            </Typography>
          </Alert>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Chip
              icon={<CheckCircle />}
              label={`${preview.existing.length} already exist`}
              sx={{
                bgcolor: "rgba(184,134,11,0.12)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
            <Chip
              icon={<Add />}
              label={`${preview.new.length} new rows`}
              sx={{
                bgcolor: "rgba(44,26,14,0.08)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button
              onClick={() => setExistingOpen((v) => !v)}
              endIcon={existingOpen ? <ExpandLess /> : <ExpandMore />}
              sx={{
                color: "#7a6e65",
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
              }}
            >
              Existing entries ({preview.existing.length})
            </Button>
            <Collapse in={existingOpen}>
              <Box sx={{ mt: 1 }}>
                <LemmaTable items={preview.existing} prefix="existing" />
              </Box>
            </Collapse>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button
              onClick={() => setNewOpen((v) => !v)}
              endIcon={newOpen ? <ExpandLess /> : <ExpandMore />}
              sx={{
                color: "#2c1a0e",
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              New entries to add ({preview.new.length})
            </Button>
            <Collapse in={newOpen}>
              <Box sx={{ mt: 1 }}>
                <LemmaTable items={preview.new} prefix="new" />
              </Box>
            </Collapse>
          </Box>

          <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleBackToInput}
              disabled={committing || promptLoading}
              startIcon={<ArrowBack />}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
              }}
            >
              Back
            </Button>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<Cancel />}
                disabled={committing || promptLoading}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Cancel
              </Button>
              {preview.new.length === 0 ? (
              <Button
                variant="contained"
                onClick={handleSkipToPrompt}
                disabled={promptLoading}
                endIcon={<ArrowForward />}
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
                {promptLoading ? "Loading…" : "Continue to definitions"}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleCommit}
                disabled={committing || promptLoading}
                startIcon={<Add />}
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
                {committing ? "Adding…" : `Add ${preview.new.length} lemmas to vocab_lemmas`}
              </Button>
            )}
            </Box>
          </Box>
        </Paper>
      )}

      {definitionReviewStep && promptData && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}
          >
            Review existing definitions
          </Typography>

          {committedCount !== null && committedCount > 0 && (
            <Alert
              severity="success"
              icon={<CheckCircle />}
              sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}
            >
              {committedCount} new lemma row{committedCount === 1 ? "" : "s"} inserted. Now review
              which existing words already have good definitions.
            </Alert>
          )}

          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2 }}>
            These transcript entries already exist in the database and have definitions. Remove any
            that are already covered correctly so the LLM can focus on words that actually need new
            definitions.
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={selectAllExisting}
              disabled={excludedExistingKeys.size === 0}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "8px",
              }}
            >
              Include all
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={deselectAllExisting}
              disabled={
                promptData.existingLemmas.filter((item) => item.definitions.length > 0).length ===
                excludedExistingKeys.size
              }
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "8px",
              }}
            >
              Remove all
            </Button>
          </Box>

          <ExistingDefinitionsList
            items={promptData.existingLemmas}
            excludedKeys={excludedExistingKeys}
            onToggle={toggleExistingExcluded}
          />

          <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleBackToReview}
              startIcon={<ArrowBack />}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
              }}
            >
              Back
            </Button>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<Cancel />}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                onClick={handleSkipExistingDefsReview}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Skip
              </Button>
              <Button
                variant="contained"
                onClick={handleContinueToPrompt}
                endIcon={<ArrowForward />}
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
                Continue to prompt
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {promptStep && promptData && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}
          >
            Generate definitions
          </Typography>

          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2 }}>
            Copy the prompt below and paste it into ChatGPT, Claude, DeepSeek, Kimi, or another
            Arabic-capable LLM. Paste the returned JSON back in the next step (coming soon).
          </Typography>

          <Box sx={{ position: "relative", mb: 2 }}>
            <TextField
              value={generatedPrompt}
              multiline
              fullWidth
              rows={18}
              slotProps={{ input: { readOnly: true } }}
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: "'Geist Mono', ui-monospace, monospace",
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  bgcolor: "#f8f5f0",
                  borderRadius: "12px",
                  alignItems: "flex-start",
                },
              }}
            />
            <Button
              onClick={handleCopyPrompt}
              variant="contained"
              size="small"
              startIcon={<ContentCopy />}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                bgcolor: copied ? "#b8860b" : "#2c1a0e",
                color: "#f5ede0",
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
                "&:hover": { bgcolor: copied ? "#9e7a0b" : "#1a0f08" },
              }}
            >
              {copied ? "Copied" : "Copy prompt"}
            </Button>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleBackToExistingDefs}
              startIcon={<ArrowBack />}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
              }}
            >
              Back
            </Button>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<Cancel />}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                onClick={() => setDefinitionsInserted(0)}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Skip definitions
              </Button>
              <Button
                variant="contained"
                onClick={handleContinueToDefinitionsInput}
                endIcon={<ArrowForward />}
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
                Paste LLM output
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {definitionsInputStep && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}
          >
            Paste LLM output
          </Typography>

          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2, fontSize: "1.1rem" }}>
            Paste the JSON array the LLM returned. We will validate it against the{" "}
            <strong>vocab_definitions</strong> schema before letting you review and insert it.
          </Typography>

          {definitionValidationError && (
            <Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
              {definitionValidationError}
            </Alert>
          )}

          <TextField
            value={llmOutput}
            onChange={(e) => setLlmOutput(e.target.value)}
            multiline
            fullWidth
            rows={16}
            placeholder='[{"lemma_diacritic":"...","gloss":"...","part_of_speech":"...",...}]'
            sx={{
              mb: 2,
              "& .MuiInputBase-root": {
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: "1.1rem",
                lineHeight: 1.5,
                bgcolor: "#f8f5f0",
                borderRadius: "12px",
                alignItems: "flex-start",
              },
            }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleBackToPrompt}
              startIcon={<ArrowBack />}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
              }}
            >
              Back
            </Button>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<Cancel />}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                onClick={() => setDefinitionsInserted(0)}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Skip
              </Button>
              <Button
                variant="contained"
                onClick={handleValidateLlmOutput}
                startIcon={<CheckCircle />}
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
                Validate
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {definitionsReviewStep && definitionRows && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}
          >
            Review definitions
          </Typography>

          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2, fontSize: "1.1rem" }}>
            Rows already in <strong>vocab_definitions</strong> are unchecked by default so a re-run
            does not create duplicates. Tick any row, including an existing one, if you want to insert
            it anyway (for example a new sense or context).
          </Typography>

          {definitionValidationError && (
            <Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
              {definitionValidationError}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3, alignItems: "center" }}>
            <Chip
              label={`${definitionRows.length - excludedDefinitionKeys.size} rows to insert`}
              sx={{
                bgcolor: "rgba(184,134,11,0.12)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
            <Chip
              label={`${excludedDefinitionKeys.size} excluded`}
              sx={{
                bgcolor: "rgba(44,26,14,0.08)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
            <Chip
              label={`${definitionExistingKeys.size} already in database`}
              sx={{
                bgcolor: "rgba(122,110,101,0.1)",
                color: "#2c1a0e",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              size="small"
              onClick={selectAllDefinitions}
              disabled={insertingDefinitions || excludedDefinitionKeys.size === 0}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "8px",
              }}
            >
              Select all
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={deselectAllDefinitions}
              disabled={insertingDefinitions || excludedDefinitionKeys.size === definitionRows.length}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "8px",
              }}
            >
              Deselect all
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mb: 3 }}>
            {definitionRows.map((row, idx) => (
              <DefinitionEditCard
                key={definitionKey(row, idx)}
                row={row}
                index={idx}
                excluded={excludedDefinitionKeys.has(definitionKey(row, idx))}
                isExisting={definitionExistingKeys.has(definitionKey(row, idx))}
                onToggle={() => toggleDefinitionExcluded(definitionKey(row, idx))}
                onChange={updateDefinitionRow}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleBackToDefinitionsInput}
              startIcon={<ArrowBack />}
              disabled={insertingDefinitions}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
              }}
            >
              Back
            </Button>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<Cancel />}
                disabled={insertingDefinitions}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                onClick={() => setDefinitionsInserted(0)}
                disabled={insertingDefinitions}
                sx={{
                  textTransform: "none",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 600,
                  borderColor: "rgba(122,110,101,0.3)",
                  color: "#7a6e65",
                  borderRadius: "10px",
                }}
              >
                Skip
              </Button>
              <Button
                variant="contained"
                onClick={handleInsertDefinitions}
                disabled={insertingDefinitions || definitionRows.length - excludedDefinitionKeys.size === 0}
                startIcon={<Add />}
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
                {insertingDefinitions
                  ? "Inserting…"
                  : `Write ${definitionRows.length - excludedDefinitionKeys.size} rows to Supabase`}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {definitionsDoneStep && definitionsInserted !== null && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
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
            {definitionsInserted && definitionsInserted > 0 ? "Definitions saved" : "Definitions step complete"}
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3, fontSize: "1rem" }}>
            {definitionsInserted && definitionsInserted > 0 ? (
              <>
                {definitionsInserted} definition row{definitionsInserted === 1 ? "" : "s"} inserted into{" "}
                <strong>vocab_definitions</strong>.
              </>
            ) : (
              <>No definitions were inserted. If this transcript has verbs, you can still generate their conjugations.</>
            )}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleReset}
              startIcon={<Replay />}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
              }}
            >
              Process another file
            </Button>
            <Button
              variant="contained"
              onClick={handleStartConjugations}
              disabled={conjugationLoading}
              endIcon={<ArrowForward />}
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
              {conjugationLoading ? "Loading…" : "Continue to verb conjugations"}
            </Button>
          </Box>
        </Paper>
      )}

      {conjugationCandidateStep && (
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
            Verb conjugations
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Chip
              label={`${conjugationCandidates.length} verb${
                conjugationCandidates.length === 1 ? "" : "s"
              } without conjugations`}
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
              label={`${conjugationExistingCount} verb${
                conjugationExistingCount === 1 ? "" : "s"
              } already conjugated`}
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
            {conjugationCandidates.length > 0 ? (
              <>
                There are {conjugationCandidates.length + conjugationExistingCount} verb lemma{`s`} for this
                source. The {conjugationCandidates.length} below are not yet in{" "}
                <strong>verb_conjugations</strong> and will be generated.
              </>
            ) : (
              <>All verb lemmas for this source already have conjugations.</>
            )}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={() => setConjugationsInserted(0)}
              disabled={conjugationLoading}
              sx={{
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                fontSize: "1.05rem",
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "10px",
                px: 3,
                py: 1,
              }}
            >
              Skip conjugations
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerateConjugations}
              disabled={conjugationLoading || conjugationCandidates.length === 0}
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
              {conjugationLoading
                ? "Generating…"
                : `Generate conjugations for ${conjugationCandidates.length} verb${
                    conjugationCandidates.length === 1 ? "" : "s"
                  }`}
            </Button>
          </Box>
        </Paper>
      )}

      {conjugationReviewStep && generatedConjugationRows && (
        <ConjugationReview
          rows={generatedConjugationRows}
          skipped={conjugationSkipped}
          excludedKeys={conjugationExcludedKeys}
          expandedLemmas={conjugationExpandedLemmas}
          inserting={conjugationInserting}
          onToggleExcluded={toggleConjugationExcluded}
          onToggleLemmaExpanded={toggleConjugationLemmaExpanded}
          onToggleLemmaAll={toggleConjugationLemmaAll}
          onChangeRow={updateConjugationRow}
          onInsert={handleInsertConjugations}
          onSelectAll={selectAllConjugations}
          onDeselectAll={deselectAllConjugations}
          onSkip={handleSkipConjugationReview}
          onReset={handleReset}
        />
      )}

      {conjugationDoneStep && conjugationsInserted !== null && (
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
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3, fontSize: "1rem" }}>
            {conjugationsInserted} conjugation row{conjugationsInserted === 1 ? "" : "s"} inserted into{" "}
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
              borderRadius: "10px",
              "&:hover": { bgcolor: "#1a0f08" },
            }}
          >
            Process another file
          </Button>
        </Paper>
      )}
    </Box>
  )
}

function existingLemmaKey(item: ExistingLemmaWithDefs): string {
  return `${item.lemma_diacritic}|${item.arabic_root ?? ""}|${item.entry_type}`
}

function ExistingDefinitionsList({
  items,
  excludedKeys,
  onToggle,
}: {
  items: ExistingLemmaWithDefs[]
  excludedKeys: Set<string>
  onToggle: (key: string) => void
}) {
  const withDefinitions = items.filter((item) => item.definitions.length > 0)
  const includedCount = withDefinitions.filter((item) => !excludedKeys.has(existingLemmaKey(item))).length

  if (withDefinitions.length === 0) {
    return (
      <Alert severity="info" sx={{ fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
        No existing entries have definitions yet. All existing entries will be sent to the LLM.
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Chip
          label={`${includedCount} included in prompt`}
          sx={{
            bgcolor: "rgba(184,134,11,0.12)",
            color: "#2c1a0e",
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            borderRadius: "8px",
          }}
        />
        <Chip
          label={`${withDefinitions.length - includedCount} excluded`}
          sx={{
            bgcolor: "rgba(44,26,14,0.08)",
            color: "#2c1a0e",
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            borderRadius: "8px",
          }}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {withDefinitions.map((item) => {
          const key = existingLemmaKey(item)
          const excluded = excludedKeys.has(key)
          return (
            <Paper
              key={key}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "12px",
                borderColor: excluded ? "rgba(122,110,101,0.1)" : "rgba(122,110,101,0.15)",
                bgcolor: excluded ? "rgba(122,110,101,0.03)" : "#fff",
                opacity: excluded ? 0.75 : 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Box
                    sx={{
                      fontFamily: "'EB Garamond', serif",
                      fontSize: "2.75rem",
                      color: "#2c1a0e",
                      mb: 1.5,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.lemma_diacritic}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    <Chip
                      label={item.entry_type}
                      sx={{ fontFamily: "Jost, sans-serif", textTransform: "capitalize", borderRadius: "8px", fontSize: "1rem", py: 0.5 }}
                    />
                    {item.CEFR && (
                      <Chip
                        label={item.CEFR}
                        sx={{ fontFamily: "Jost, sans-serif", borderRadius: "8px", fontSize: "1rem", py: 0.5 }}
                      />
                    )}
                    {item.arabic_root && (
                      <Chip
                        label={item.arabic_root}
                        sx={{ fontFamily: "'EB Garamond', serif", borderRadius: "10px", fontSize: "1.15rem", py: 0.75, px: 1 }}
                      />
                    )}
                  </Box>
                </Box>
                <Button
                  variant={excluded ? "outlined" : "contained"}
                  size="small"
                  onClick={() => onToggle(key)}
                  startIcon={excluded ? <AddCircle /> : <RemoveCircle />}
                  sx={{
                    textTransform: "none",
                    fontFamily: "Jost, sans-serif",
                    fontWeight: 600,
                    borderRadius: "8px",
                    bgcolor: excluded ? "transparent" : "#2c1a0e",
                    color: excluded ? "#7a6e65" : "#f5ede0",
                    borderColor: excluded ? "rgba(122,110,101,0.3)" : "#2c1a0e",
                    "&:hover": {
                      bgcolor: excluded ? "rgba(122,110,101,0.06)" : "#1a0f08",
                    },
                  }}
                >
                  {excluded ? "Include" : "Remove"}
                </Button>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                {item.definitions.map((def, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.25,
                      borderRadius: "8px",
                      bgcolor: "rgba(184,134,11,0.06)",
                      border: "1px solid rgba(184,134,11,0.12)",
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                      <Chip
                        label={def.part_of_speech}
                        sx={{ fontFamily: "Jost, sans-serif", borderRadius: "8px", bgcolor: "#fff", fontSize: "0.95rem", py: 0.5 }}
                      />
                      <Typography
                        sx={{
                          fontFamily: "Jost, sans-serif",
                          fontWeight: 600,
                          color: "#2c1a0e",
                          fontSize: "1.05rem",
                        }}
                      >
                        {def.gloss}
                      </Typography>
                    </Box>
                    {def.definition_en && (
                      <Typography
                        sx={{
                          fontFamily: "Jost, sans-serif",
                          color: "#7a6e65",
                          fontSize: "1rem",
                        }}
                      >
                        {def.definition_en}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

function ConjugationReview({
  rows,
  skipped,
  excludedKeys,
  expandedLemmas,
  inserting,
  onToggleExcluded,
  onToggleLemmaExpanded,
  onToggleLemmaAll,
  onChangeRow,
  onInsert,
  onSelectAll,
  onDeselectAll,
  onSkip,
  onReset,
}: {
  rows: GeneratedConjugation[]
  skipped: { lemma: string; reason: string }[]
  excludedKeys: Set<string>
  expandedLemmas: Set<string>
  inserting: boolean
  onToggleExcluded: (key: string) => void
  onToggleLemmaExpanded: (lemma: string) => void
  onToggleLemmaAll: (lemma: string, excludeAll: boolean) => void
  onChangeRow: (key: string, field: keyof GeneratedConjugation, value: string | null) => void
  onInsert: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSkip: () => void
  onReset: () => void
}) {
  const groupedRows = useMemo(() => {
    const map = new Map<string, GeneratedConjugation[]>()
    for (const row of rows) {
      const list = map.get(row.lemma) ?? []
      list.push(row)
      map.set(row.lemma, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  const includedCount = rows.length - excludedKeys.size

  return (
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
        {skipped.length > 0 && (
          <Chip
            label={`${skipped.length} verbs skipped`}
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
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          onClick={onSelectAll}
          disabled={inserting || excludedKeys.size === 0}
          sx={{
            textTransform: "none",
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            borderColor: "rgba(122,110,101,0.3)",
            color: "#7a6e65",
            borderRadius: "8px",
          }}
        >
          Select all
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={onDeselectAll}
          disabled={inserting || excludedKeys.size === rows.length}
          sx={{
            textTransform: "none",
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            borderColor: "rgba(122,110,101,0.3)",
            color: "#7a6e65",
            borderRadius: "8px",
          }}
        >
          Deselect all
        </Button>
      </Box>

      {skipped.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Skipped verbs</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {skipped.map((item, idx) => (
              <li key={idx}>
                <strong>{item.lemma}</strong> — {item.reason}
              </li>
            ))}
          </Box>
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
        {groupedRows.map(([lemma, lemmaRows]) => {
          const expanded = expandedLemmas.has(lemma)
          const allExcluded = lemmaRows.every((row) => excludedKeys.has(conjKey(row)))

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
                onClick={() => onToggleLemmaExpanded(lemma)}
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
                  {lemmaRows[0]?.root && (
                    <Chip
                      label={lemmaRows[0].root}
                      sx={{
                        fontFamily: "'EB Garamond', serif",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        py: 0.5,
                      }}
                    />
                  )}
                  <Chip
                    label={`${lemmaRows.length} forms`}
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
                      onToggleLemmaAll(lemma, !allExcluded)
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
                  {lemmaRows.map((row) => {
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
                              onChange={(e) => onChangeRow(key, "conjugation_diacritic", e.target.value)}
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
                                onChangeRow(key, "transliteration", v || null)
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
                          onClick={() => onToggleExcluded(key)}
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
          onClick={onSkip}
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
          Skip conjugations
        </Button>
        <Button
          variant="outlined"
          onClick={onReset}
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
          onClick={onInsert}
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
  )
}

function DefinitionEditCard({
  row,
  index,
  excluded,
  isExisting,
  onToggle,
  onChange,
}: {
  row: DefinitionOutputRow
  index: number
  excluded: boolean
  isExisting: boolean
  onToggle: () => void
  onChange: (index: number, field: keyof DefinitionOutputRow, value: string | null) => void
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 4,
        borderRadius: "18px",
        borderColor: excluded ? "rgba(122,110,101,0.1)" : "rgba(122,110,101,0.15)",
        bgcolor: excluded ? "rgba(122,110,101,0.03)" : "#fff",
        opacity: excluded ? 0.7 : 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Box
            sx={{
              fontFamily: "'EB Garamond', serif",
              fontSize: "2.75rem",
              color: "#2c1a0e",
              mb: 2.5,
              lineHeight: 1.2,
            }}
          >
            {row.lemma_diacritic}
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
            {row.arabic_root && (
              <Chip
                label={row.arabic_root}
                sx={{ fontFamily: "'EB Garamond', serif", borderRadius: "10px", fontSize: "1.15rem", py: 0.75, px: 1 }}
              />
            )}
            <Chip
              label={row.source}
              sx={{ fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "1.15rem", py: 0.75, px: 1 }}
            />
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {isExisting && (
            <Chip
              label="Already in database"
              sx={{
                fontFamily: "Jost, sans-serif",
                bgcolor: "rgba(184,134,11,0.12)",
                color: "#2c1a0e",
                borderRadius: "8px",
                fontSize: "0.95rem",
                py: 0.5,
              }}
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={!excluded}
                onChange={onToggle}
                sx={{ color: "#7a6e65", "&.Mui-checked": { color: "#2c1a0e" } }}
              />
            }
            label={
              <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "1rem", color: "#2c1a0e" }}>
                {excluded ? "Excluded" : "Include"}
              </Typography>
            }
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <AdminTextField
            label="Gloss *"
            value={row.gloss}
            onChange={(e) => onChange(index, "gloss", e.target.value)}
            fullWidth
            disabled={excluded}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.3rem", py: 1.5 }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
          />
          <AdminTextField
            label="Part of speech *"
            value={row.part_of_speech}
            onChange={(e) => onChange(index, "part_of_speech", e.target.value)}
            fullWidth
            disabled={excluded}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.3rem", py: 1.5 }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <AdminTextField
            label="Arabic root"
            value={row.arabic_root ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim()
              onChange(index, "arabic_root", v || null)
            }}
            fullWidth
            disabled={excluded}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.3rem", direction: "rtl", py: 1.5 }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
          />
          <AdminTextField
            label="Lemma diacritic"
            value={row.lemma_diacritic}
            onChange={(e) => onChange(index, "lemma_diacritic", e.target.value)}
            fullWidth
            disabled={excluded}
            slotProps={{ input: { readOnly: true } }}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.6rem", direction: "rtl", py: 1.5 }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
          />
        </Box>

        <AdminTextField
          label="English definition"
          value={row.definition_en ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim()
            onChange(index, "definition_en", v || null)
          }}
          fullWidth
          multiline
          rows={4}
          disabled={excluded}
          sx={{ "& .MuiInputBase-input": { fontSize: "1.25rem", py: 1.5 }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
        />

        <AdminTextField
          label="Arabic definition"
          value={row.definition_ar ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim()
            onChange(index, "definition_ar", v || null)
          }}
          fullWidth
          multiline
          rows={4}
          disabled={excluded}
          sx={{ "& .MuiInputBase-input": { fontSize: "1.45rem", direction: "rtl", py: 1.5 }, "& .MuiInputLabel-root": { fontSize: "1rem" } }}
        />
      </Box>
    </Paper>
  )
}

function LemmaTable({ items, prefix }: { items: PipelineItem[]; prefix: string }) {
  const cellSx = {
    fontFamily: "'EB Garamond', serif",
    fontSize: "2rem",
    color: "#2c1a0e",
    lineHeight: 1.3,
  }

  const headerSx = {
    fontFamily: "'EB Garamond', serif",
    fontWeight: 700,
    fontSize: "1.1rem",
    color: "#2c1a0e",
  }

  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>Lemma (stored)</TableCell>
            <TableCell sx={headerSx}>Contextual form</TableCell>
            <TableCell sx={headerSx}>Gloss</TableCell>
            <TableCell sx={headerSx}>Type</TableCell>
            <TableCell sx={headerSx}>Root</TableCell>
            <TableCell sx={headerSx}>Transliteration</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={`${prefix}-${groupKey(item)}-${idx}`}>
              <TableCell sx={cellSx}>{item.arabic}</TableCell>
              <TableCell sx={cellSx}>
                {item.contextualArabic && item.contextualArabic !== item.arabic
                  ? item.contextualArabic
                  : "—"}
              </TableCell>
              <TableCell sx={cellSx}>{item.english || "—"}</TableCell>
              <TableCell sx={{ ...cellSx, textTransform: "capitalize" }}>{item.entry_type}</TableCell>
              <TableCell sx={cellSx}>{item.root || "—"}</TableCell>
              <TableCell sx={cellSx}>{item.transliteration}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function buildPrompt(data: DefinitionsPromptData): string {
  const examplesJson = JSON.stringify(data.exampleDefinitions, null, 2)
  const newLemmasJson = JSON.stringify(
    data.newLemmas.map((item) => {
      const row: Record<string, unknown> = {
        lemma_diacritic: item.arabic,
        arabic_root: item.root,
        entry_type: item.entry_type,
        transliteration: item.transliteration,
      }
      if (item.CEFR) row.CEFR = item.CEFR
      return row
    }),
    null,
    2
  )
  const existingLemmasJson = JSON.stringify(
    data.existingLemmas.map((item) => {
      const row: Record<string, unknown> = {
        lemma_diacritic: item.lemma_diacritic,
        arabic_root: item.arabic_root,
        entry_type: item.entry_type,
        transliteration: item.transliteration,
        definitions: item.definitions,
      }
      if (item.CEFR) row.CEFR = item.CEFR
      return row
    }),
    null,
    2
  )

  return `You are an expert Arabic-English lexicographer and computational linguist.

We are updating our vocabulary database for a media translation project. Below is the database schema for our target table \`public.vocab_definitions\` along with reference rows showing the exact data format required.

### Database Schema Reference:
- \`lemma_diacritic\` (text, NOT NULL): The Arabic word with full diacritics/vowels (tashkeel).
- \`arabic_root\` (text, NULL): The 3 or 4-letter root separated by hyphens (e.g., "س-ر-ع"). Must be NULL for phrases or particles without a clear root.
- \`gloss\` (text, NOT NULL): Clean English translation snippet (semicolon separated if multiple words, e.g., "fast; quick; rapid").
- \`part_of_speech\` (text, NOT NULL): Must STRICTLY be one of these exact values: ['noun', 'verb', 'adjective', 'adverb', 'particle', 'pronoun', 'proper_noun', 'phrase', 'interjection', 'conjunction', 'preposition', 'numeral'].
- \`definition_en\` (text, NULL): A short English dictionary-style definition sentence.
- \`definition_ar\` (text, NULL): A short monolingual Arabic definition sentence with diacritics.
- \`source\` (text, NULL): Use exactly the source code provided below.

### Example Valid JSON Output Rows:
${examplesJson}

### YOUR TASKS:

TASK 1: PROCESS NEW VOCABULARY
For every item in the "NEW VOCABULARY LIST" below, generate a high-quality definition object matching the JSON schema format above.

TASK 2: EVALUATE EXISTING VOCABULARY FOR NEW CONTEXTS
Look at the "EXISTING VOCABULARY LIST". We have provided the definitions currently stored in our database. Based on the target media script context (Source: ${data.source}), evaluate if the word is being used in a completely different semantic way, secondary definition, or alternative part of speech than what we already have saved.
- If the current database definition is sufficient, DO NOT generate a row for it.
- If the word has a completely new distinct meaning in this context, generate a BRAND NEW row with the new \`gloss\`, \`part_of_speech\`, \`definition_en\`, and \`definition_ar\`.

### DATA INGESTION:

[SOURCE CODE FOR ALL GENERATED ROWS]:
"${data.source}"

[NEW VOCABULARY LIST]:
${newLemmasJson}
(Generate definitions for all of these)

[EXISTING VOCABULARY LIST & CURRENT DEFINITIONS]:
${existingLemmasJson}
(Only generate a row if a completely new meaning is detected)

[FULL TRANSCRIPT CONTEXT]:
${data.transcriptJson}
(Use this transcript to understand how each word or phrase is used in context when generating definitions.)

### OUTPUT FORMAT:
Return ONLY a valid, minified JSON array containing the generated objects. Do not include markdown code block formatting (\`\`\`json), introductory sentences, or conversational prose. Start your response directly with [ and end with ].`
}
