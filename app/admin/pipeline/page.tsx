"use client"

import React, { useCallback, useRef, useState } from "react"
import Link from "next/link"
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
  RemoveCircle,
  AddCircle,
} from "@mui/icons-material"
import AdminTextField from "../components/AdminTextField"
import {
  previewPipeline,
  commitPipeline,
  buildDefinitionsPromptData,
  commitDefinitions,
  type PipelineItem,
  type PipelinePreviewResult,
  type DefinitionsPromptData,
  type ExistingLemmaWithDefs,
  type DefinitionOutputRow,
} from "@/app/actions/pipeline"
import { validateDefinitionRows } from "@/app/lib/pipelineValidation"

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong"
}

function groupKey(item: PipelineItem): string {
  return `${item.arabic}|${item.root ?? ""}|${item.entry_type}`
}

function definitionKey(row: DefinitionOutputRow, index: number): string {
  return `${index}|${row.lemma_diacritic}|${row.arabic_root ?? ""}`
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
  const [insertingDefinitions, setInsertingDefinitions] = useState(false)
  const [definitionsInserted, setDefinitionsInserted] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
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
    setInsertingDefinitions(false)
    setDefinitionsInserted(null)

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
  }, [])

  const toggleExistingExcluded = useCallback((key: string) => {
    setExcludedExistingKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleContinueToPrompt = useCallback(() => {
    setPromptVisible(true)
  }, [])

  const handleContinueToDefinitionsInput = useCallback(() => {
    setShowDefinitionsInput(true)
  }, [])

  const handleValidateLlmOutput = useCallback(() => {
    setDefinitionValidationError(null)
    setDefinitionRows(null)
    setExcludedDefinitionKeys(new Set())
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

  const handleInsertDefinitions = useCallback(async () => {
    if (!definitionRows) return
    const included = definitionRows.filter((row, idx) => !excludedDefinitionKeys.has(definitionKey(row, idx)))
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
  const definitionsDoneStep = definitionsInserted !== null

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
                placeholder='Paste JSON array here, e.g. [{ "timestamp": "0:00", "arabic": "...", ... }]'
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
            sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 2 }}
          >
            Review
          </Typography>

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
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                {preview.existing.map((item, idx) => (
                  <ItemRow key={`existing-${groupKey(item)}-${idx}`} item={item} />
                ))}
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
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                {preview.new.map((item, idx) => (
                  <ItemRow key={`new-${groupKey(item)}-${idx}`} item={item} />
                ))}
              </Box>
            </Collapse>
          </Box>

          <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
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
                {committing ? "Adding…" : `Add ${preview.new.length} new rows`}
              </Button>
            )}
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

          <ExistingDefinitionsList
            items={promptData.existingLemmas}
            excludedKeys={excludedExistingKeys}
            onToggle={toggleExistingExcluded}
          />

          <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
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

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
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

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
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
            Inspect each definition. Edit fields if needed, and remove any rows you do not want to
            insert.
          </Typography>

          {definitionValidationError && (
            <Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
              {definitionValidationError}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
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
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mb: 3 }}>
            {definitionRows.map((row, idx) => (
              <DefinitionEditCard
                key={definitionKey(row, idx)}
                row={row}
                index={idx}
                excluded={excludedDefinitionKeys.has(definitionKey(row, idx))}
                onToggle={() => toggleDefinitionExcluded(definitionKey(row, idx))}
                onChange={updateDefinitionRow}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
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
              component={Link}
              href="/admin/conjugations"
              variant="contained"
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
              Generate verb conjugations
            </Button>
          </Box>
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
                    <Chip
                      label={item.CEFR}
                      sx={{ fontFamily: "Jost, sans-serif", borderRadius: "8px", fontSize: "1rem", py: 0.5 }}
                    />
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

function DefinitionEditCard({
  row,
  index,
  excluded,
  onToggle,
  onChange,
}: {
  row: DefinitionOutputRow
  index: number
  excluded: boolean
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
              mb: 1.5,
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
        <Button
          variant={excluded ? "outlined" : "contained"}
          size="small"
          onClick={onToggle}
          startIcon={excluded ? <AddCircle /> : <RemoveCircle />}
          sx={{
            textTransform: "none",
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            fontSize: "1.15rem",
            borderRadius: "10px",
            px: 2.5,
            py: 1,
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

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <AdminTextField
            label="Gloss *"
            value={row.gloss}
            onChange={(e) => onChange(index, "gloss", e.target.value)}
            fullWidth
            size="small"
            disabled={excluded}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.3rem" }, "& .MuiInputLabel-root": { fontSize: "1.05rem" } }}
          />
          <AdminTextField
            label="Part of speech *"
            value={row.part_of_speech}
            onChange={(e) => onChange(index, "part_of_speech", e.target.value)}
            fullWidth
            size="small"
            disabled={excluded}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.3rem" }, "& .MuiInputLabel-root": { fontSize: "1.05rem" } }}
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
            size="small"
            disabled={excluded}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.3rem", direction: "rtl" }, "& .MuiInputLabel-root": { fontSize: "1.05rem" } }}
          />
          <AdminTextField
            label="Lemma diacritic"
            value={row.lemma_diacritic}
            onChange={(e) => onChange(index, "lemma_diacritic", e.target.value)}
            fullWidth
            size="small"
            disabled={excluded}
            slotProps={{ input: { readOnly: true } }}
            sx={{ "& .MuiInputBase-input": { fontSize: "1.6rem", direction: "rtl" }, "& .MuiInputLabel-root": { fontSize: "1.05rem" } }}
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
          size="small"
          disabled={excluded}
          sx={{ "& .MuiInputBase-input": { fontSize: "1.25rem" }, "& .MuiInputLabel-root": { fontSize: "1.05rem" } }}
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
          size="small"
          disabled={excluded}
          sx={{ "& .MuiInputBase-input": { fontSize: "1.45rem", direction: "rtl" }, "& .MuiInputLabel-root": { fontSize: "1.05rem" } }}
        />
      </Box>
    </Paper>
  )
}

function ItemRow({ item }: { item: PipelineItem }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: "10px",
        borderColor: "rgba(122,110,101,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
      }}
    >
      <Box sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1.75rem", color: "#2c1a0e", lineHeight: 1.2 }}>
        {item.arabic}
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Chip
          label={item.entry_type}
          sx={{ fontFamily: "Jost, sans-serif", textTransform: "capitalize", borderRadius: "8px", fontSize: "0.95rem", py: 0.5 }}
        />
        <Chip
          label={item.CEFR}
          sx={{ fontFamily: "Jost, sans-serif", borderRadius: "8px", fontSize: "0.95rem", py: 0.5 }}
        />
        {item.root && (
          <Chip
            label={item.root}
            size="small"
            sx={{ fontFamily: "'EB Garamond', serif", borderRadius: "6px" }}
          />
        )}
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          {item.transliteration}
        </Typography>
      </Box>
    </Paper>
  )
}

function buildPrompt(data: DefinitionsPromptData): string {
  const examplesJson = JSON.stringify(data.exampleDefinitions, null, 2)
  const newLemmasJson = JSON.stringify(
    data.newLemmas.map((item) => ({
      lemma_diacritic: item.arabic,
      arabic_root: item.root,
      entry_type: item.entry_type,
      CEFR: item.CEFR,
      transliteration: item.transliteration,
    })),
    null,
    2
  )
  const existingLemmasJson = JSON.stringify(
    data.existingLemmas.map((item) => ({
      lemma_diacritic: item.lemma_diacritic,
      arabic_root: item.arabic_root,
      entry_type: item.entry_type,
      CEFR: item.CEFR,
      transliteration: item.transliteration,
      definitions: item.definitions,
    })),
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
