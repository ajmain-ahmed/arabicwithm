"use client"

import React, { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import Link from "next/link"
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardActionArea,
  CardContent,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
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
  Search,
  Movie,
  Tv,
} from "@mui/icons-material"
import AdminTextField from "../components/AdminTextField"
import { errorMessage } from "@/app/lib/errors"
import {
  createShow,
  createEpisode,
  fetchShowsForAdmin,
  fetchEpisodesForShowAdmin,
  fetchEpisodeForAdmin,
  type ShowRow,
  type ShowInput,
  type EpisodeRow,
  type EpisodeInput,
  type EpisodeWithTranscript,
} from "@/app/actions/admin"
import {
  previewPipeline,
  commitPipeline,
  buildDefinitionsPromptData,
  checkExistingDefinitions,
  commitDefinitions,
  type PipelinePreviewResult,
  type DefinitionsPromptData,
  type ExistingLemmaWithDefs,
} from "@/app/actions/pipeline"
import {
  fetchConjugationCandidatesForSource,
  buildConjugationsPromptData,
  validateConjugationRows,
  commitConjugations,
  type VerbCandidate,
  type GeneratedConjugation,
} from "@/app/actions/conjugations"
import { validateDefinitionRows, type PipelineItem, type DefinitionOutputRow } from "@/app/lib/pipelineValidation"
import { suggestNextEpisodeSlug } from "@/app/lib/slug"

/* ── Step configuration ────────────────────────────────────────────── */

type StepId =
  | "entry"
  | "show-details"
  | "select-show"
  | "episode-details"
  | "save-episode"
  | "review-lemmas"
  | "definitions-prompt"
  | "paste-definitions"
  | "review-definitions"
  | "conjugations"
  | "done"
type Mode = "entry" | "create-show" | "add-episode"

const STEP_LABELS: Record<StepId, string> = {
  entry: "Start",
  "show-details": "Show details",
  "select-show": "Select show",
  "episode-details": "Episode details",
  "save-episode": "Save episode",
  "review-lemmas": "Review lemmas",
  "definitions-prompt": "Definitions prompt",
  "paste-definitions": "Paste definitions",
  "review-definitions": "Review definitions",
  conjugations: "Conjugations",
  done: "Done",
}

const PATH_STEPS: Record<Mode, StepId[]> = {
  entry: ["entry"],
  "create-show": [
    "entry",
    "show-details",
    "episode-details",
    "save-episode",
    "review-lemmas",
    "definitions-prompt",
    "paste-definitions",
    "review-definitions",
    "conjugations",
    "done",
  ],
  "add-episode": [
    "entry",
    "select-show",
    "episode-details",
    "save-episode",
    "review-lemmas",
    "definitions-prompt",
    "paste-definitions",
    "review-definitions",
    "conjugations",
    "done",
  ],
}

function getStepIndex(mode: Mode, stepId: StepId): number {
  return PATH_STEPS[mode].indexOf(stepId)
}

/* ── State shape ───────────────────────────────────────────────────── */

interface WizardState {
  mode: Mode
  stepIndex: number
  maxReachedStepIndex: number
  show: Partial<ShowInput> & { id?: string }
  episode: Partial<EpisodeInput> & { id?: string }
  shows: ShowRow[]
  existingEpisodes: EpisodeRow[]
  source: string
  transcriptJson: string
  preview: PipelinePreviewResult | null
  committedLemmas: number | null
  promptData: DefinitionsPromptData | null
  excludedExistingKeys: Set<string>
  definitionRows: DefinitionOutputRow[] | null
  definitionValidationError: string | null
  definitionExistingKeys: Set<string>
  excludedDefinitionKeys: Set<string>
  definitionsInserted: number | null
  conjugationCandidates: VerbCandidate[] | null
  conjugationExistingCount: number
  generatedConjugationRows: GeneratedConjugation[] | null
  conjugationSkipped: { lemma: string; reason: string }[]
  conjugationExcludedKeys: Set<string>
  conjugationExpandedLemmas: Set<string>
  conjugationPrompt: string | null
  conjugationPromptCopied: boolean
  conjugationLlmOutput: string
  conjugationValidationError: string | null
  conjugationsInserted: number | null
  loading: boolean
  error: string | null
  copied: boolean
  llmOutput: string
  existingOpen: boolean
  newOpen: boolean
  showSearch: string
  showTranscriptExample: boolean
  showExistingDefinitionsReview: boolean
}

type WizardAction =
  | { type: "RESET" }
  | { type: "SET_MODE"; mode: Mode }
  | { type: "SET_STEP"; stepIndex: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "ADVANCE_TO"; stepIndex: number }
  | { type: "SET_SHOW"; show: Partial<WizardState["show"]> }
  | { type: "SET_EPISODE"; episode: Partial<WizardState["episode"]> }
  | { type: "SET_SHOWS"; shows: ShowRow[] }
  | { type: "SET_EXISTING_EPISODES"; episodes: EpisodeRow[] }
  | { type: "SET_SOURCE"; source: string }
  | { type: "SET_TRANSCRIPT_JSON"; json: string }
  | { type: "SET_PREVIEW"; preview: PipelinePreviewResult | null }
  | { type: "SET_COMMITTED_LEMMAS"; count: number | null }
  | { type: "SET_PROMPT_DATA"; data: DefinitionsPromptData | null }
  | { type: "TOGGLE_EXCLUDED_EXISTING"; key: string }
  | { type: "SET_EXCLUDED_EXISTING"; keys: Set<string> }
  | { type: "SET_DEFINITION_ROWS"; rows: DefinitionOutputRow[] | null }
  | { type: "SET_DEFINITION_VALIDATION_ERROR"; error: string | null }
  | { type: "SET_DEFINITION_EXISTING_KEYS"; keys: Set<string> }
  | { type: "SET_EXCLUDED_DEFINITION_KEYS"; keys: Set<string> }
  | { type: "TOGGLE_DEFINITION_EXCLUDED"; key: string }
  | { type: "SET_DEFINITIONS_INSERTED"; count: number | null }
  | { type: "SET_CONJUGATION_CANDIDATES"; candidates: VerbCandidate[] | null; existingCount: number }
  | { type: "SET_GENERATED_CONJUGATIONS"; rows: GeneratedConjugation[] | null; skipped: { lemma: string; reason: string }[] }
  | { type: "TOGGLE_CONJUGATION_EXCLUDED"; key: string }
  | { type: "TOGGLE_CONJUGATION_LEMMA_EXPANDED"; lemma: string }
  | { type: "UPDATE_CONJUGATION_ROW"; key: string; field: keyof GeneratedConjugation; value: string | null }
  | { type: "TOGGLE_CONJUGATION_LEMMA_ALL"; lemma: string; excludeAll: boolean }
  | { type: "SET_CONJUGATION_EXCLUDED_KEYS"; keys: Set<string> }
  | { type: "SET_CONJUGATION_PROMPT"; prompt: string | null }
  | { type: "SET_CONJUGATION_PROMPT_COPIED"; copied: boolean }
  | { type: "SET_CONJUGATION_LLM_OUTPUT"; text: string }
  | { type: "SET_CONJUGATION_VALIDATION_ERROR"; error: string | null }
  | { type: "SET_CONJUGATIONS_INSERTED"; count: number | null }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_COPIED"; copied: boolean }
  | { type: "SET_LLM_OUTPUT"; text: string }
  | { type: "SET_EXISTING_OPEN"; open: boolean }
  | { type: "SET_NEW_OPEN"; open: boolean }
  | { type: "SET_SHOW_SEARCH"; query: string }
  | { type: "SET_SHOW_TRANSCRIPT_EXAMPLE"; open: boolean }
  | { type: "SET_SHOW_EXISTING_DEFS_REVIEW"; open: boolean }
  | { type: "UPDATE_DEFINITION_ROW"; index: number; field: keyof DefinitionOutputRow; value: string | null }
  | { type: "PATCH"; patch: Partial<WizardState> }

function initialState(): WizardState {
  return {
    mode: "entry",
    stepIndex: 0,
    maxReachedStepIndex: 0,
    show: {},
    episode: {},
    shows: [],
    existingEpisodes: [],
    source: "",
    transcriptJson: "",
    preview: null,
    committedLemmas: null,
    promptData: null,
    excludedExistingKeys: new Set(),
    definitionRows: null,
    definitionValidationError: null,
    definitionExistingKeys: new Set(),
    excludedDefinitionKeys: new Set(),
    definitionsInserted: null,
    conjugationCandidates: null,
    conjugationExistingCount: 0,
    generatedConjugationRows: null,
    conjugationSkipped: [],
    conjugationExcludedKeys: new Set(),
    conjugationExpandedLemmas: new Set(),
    conjugationPrompt: null,
    conjugationPromptCopied: false,
    conjugationLlmOutput: "",
    conjugationValidationError: null,
    conjugationsInserted: null,
    loading: false,
    error: null,
    copied: false,
    llmOutput: "",
    existingOpen: false,
    newOpen: true,
    showSearch: "",
    showTranscriptExample: false,
    showExistingDefinitionsReview: true,
  }
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "RESET":
      return initialState()
    case "SET_MODE": {
      return { ...state, mode: action.mode, stepIndex: 1, maxReachedStepIndex: 1, error: null }
    }
    case "SET_STEP":
      return { ...state, stepIndex: action.stepIndex }
    case "NEXT_STEP": {
      const visible = PATH_STEPS[state.mode]
      const next = Math.min(visible.length - 1, state.stepIndex + 1)
      return { ...state, stepIndex: next, maxReachedStepIndex: Math.max(state.maxReachedStepIndex, next) }
    }
    case "PREV_STEP":
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) }
    case "ADVANCE_TO":
      return { ...state, stepIndex: action.stepIndex, maxReachedStepIndex: Math.max(state.maxReachedStepIndex, action.stepIndex) }
    case "SET_SHOW":
      return { ...state, show: { ...state.show, ...action.show } }
    case "SET_EPISODE":
      return { ...state, episode: { ...state.episode, ...action.episode } }
    case "SET_SHOWS":
      return { ...state, shows: action.shows }
    case "SET_EXISTING_EPISODES":
      return { ...state, existingEpisodes: action.episodes }
    case "SET_SOURCE":
      return { ...state, source: action.source }
    case "SET_TRANSCRIPT_JSON":
      return { ...state, transcriptJson: action.json }
    case "SET_PREVIEW":
      return { ...state, preview: action.preview }
    case "SET_COMMITTED_LEMMAS":
      return { ...state, committedLemmas: action.count }
    case "SET_PROMPT_DATA":
      return { ...state, promptData: action.data }
    case "TOGGLE_EXCLUDED_EXISTING": {
      const next = new Set(state.excludedExistingKeys)
      if (next.has(action.key)) next.delete(action.key)
      else next.add(action.key)
      return { ...state, excludedExistingKeys: next }
    }
    case "SET_EXCLUDED_EXISTING":
      return { ...state, excludedExistingKeys: action.keys }
    case "SET_DEFINITION_ROWS":
      return { ...state, definitionRows: action.rows }
    case "SET_DEFINITION_VALIDATION_ERROR":
      return { ...state, definitionValidationError: action.error }
    case "SET_DEFINITION_EXISTING_KEYS":
      return { ...state, definitionExistingKeys: action.keys }
    case "SET_EXCLUDED_DEFINITION_KEYS":
      return { ...state, excludedDefinitionKeys: action.keys }
    case "TOGGLE_DEFINITION_EXCLUDED": {
      const next = new Set(state.excludedDefinitionKeys)
      if (next.has(action.key)) next.delete(action.key)
      else next.add(action.key)
      return { ...state, excludedDefinitionKeys: next }
    }
    case "SET_DEFINITIONS_INSERTED":
      return { ...state, definitionsInserted: action.count }
    case "SET_CONJUGATION_CANDIDATES":
      return { ...state, conjugationCandidates: action.candidates, conjugationExistingCount: action.existingCount }
    case "SET_GENERATED_CONJUGATIONS":
      return {
        ...state,
        generatedConjugationRows: action.rows,
        conjugationSkipped: action.skipped,
        conjugationExcludedKeys: new Set(),
        conjugationExpandedLemmas: new Set(),
      }
    case "TOGGLE_CONJUGATION_EXCLUDED": {
      const next = new Set(state.conjugationExcludedKeys)
      if (next.has(action.key)) next.delete(action.key)
      else next.add(action.key)
      return { ...state, conjugationExcludedKeys: next }
    }
    case "TOGGLE_CONJUGATION_LEMMA_EXPANDED": {
      const next = new Set(state.conjugationExpandedLemmas)
      if (next.has(action.lemma)) next.delete(action.lemma)
      else next.add(action.lemma)
      return { ...state, conjugationExpandedLemmas: next }
    }
    case "UPDATE_CONJUGATION_ROW": {
      if (!state.generatedConjugationRows) return state
      const idx = state.generatedConjugationRows.findIndex((r) => conjKey(r) === action.key)
      if (idx === -1) return state
      const next = [...state.generatedConjugationRows]
      next[idx] = { ...next[idx], [action.field]: action.value }
      return { ...state, generatedConjugationRows: next }
    }
    case "TOGGLE_CONJUGATION_LEMMA_ALL": {
      if (!state.generatedConjugationRows) return state
      const next = new Set(state.conjugationExcludedKeys)
      const rowsForLemma = state.generatedConjugationRows.filter((r) => r.lemma === action.lemma)
      for (const row of rowsForLemma) {
        const key = conjKey(row)
        if (action.excludeAll) next.add(key)
        else next.delete(key)
      }
      return { ...state, conjugationExcludedKeys: next }
    }
    case "SET_CONJUGATION_EXCLUDED_KEYS":
      return { ...state, conjugationExcludedKeys: action.keys }
    case "SET_CONJUGATION_PROMPT":
      return { ...state, conjugationPrompt: action.prompt }
    case "SET_CONJUGATION_PROMPT_COPIED":
      return { ...state, conjugationPromptCopied: action.copied }
    case "SET_CONJUGATION_LLM_OUTPUT":
      return { ...state, conjugationLlmOutput: action.text }
    case "SET_CONJUGATION_VALIDATION_ERROR":
      return { ...state, conjugationValidationError: action.error }
    case "SET_CONJUGATIONS_INSERTED":
      return { ...state, conjugationsInserted: action.count }
    case "SET_LOADING":
      return { ...state, loading: action.loading }
    case "SET_ERROR":
      return { ...state, error: action.error }
    case "SET_COPIED":
      return { ...state, copied: action.copied }
    case "SET_LLM_OUTPUT":
      return { ...state, llmOutput: action.text }
    case "SET_EXISTING_OPEN":
      return { ...state, existingOpen: action.open }
    case "SET_NEW_OPEN":
      return { ...state, newOpen: action.open }
    case "SET_SHOW_SEARCH":
      return { ...state, showSearch: action.query }
    case "SET_SHOW_TRANSCRIPT_EXAMPLE":
      return { ...state, showTranscriptExample: action.open }
    case "SET_SHOW_EXISTING_DEFS_REVIEW":
      return { ...state, showExistingDefinitionsReview: action.open }
    case "UPDATE_DEFINITION_ROW": {
      if (!state.definitionRows) return state
      const next = [...state.definitionRows]
      next[action.index] = { ...next[action.index], [action.field]: action.value }
      return { ...state, definitionRows: next }
    }
    case "PATCH":
      return { ...state, ...action.patch }
    default:
      return state
  }
}

/* ── Key helpers ───────────────────────────────────────────────────── */

function groupKey(item: PipelineItem): string {
  return `${item.arabic}|${item.root ?? ""}|${item.entry_type}`
}

function definitionKey(row: DefinitionOutputRow, index: number): string {
  return `${index}|${row.lemma_diacritic}|${row.arabic_root ?? ""}`
}

function conjKey(row: GeneratedConjugation): string {
  return `${row.lemma}|${row.root ?? ""}|${row.type}`
}

function existingLemmaKey(item: ExistingLemmaWithDefs): string {
  return `${item.lemma_diacritic}|${item.arabic_root ?? ""}|${item.entry_type}`
}

/* ── Example transcript ────────────────────────────────────────────── */

const EXAMPLE_TRANSCRIPT = JSON.stringify(
  [
    {
      timestamp: "0:15",
      translation: "Hi! How are you?",
      tokens: [
        {
          lemma: "مَرْحَبًا",
          arabic: "مَرْحَبًا",
          pos: "interjection",
          cefr: "a1",
          entry_type: "word",
          root: "ر-ح-ب",
          transliteration: "marḥaban",
          english: "hi",
        },
        {
          lemma: "كَيْفَ",
          arabic: "كَيْفَ",
          pos: "adverb",
          cefr: "a1",
          entry_type: "word",
          root: "ك-ي-ف",
          transliteration: "kayfa",
          english: "how",
        },
        {
          lemma: "حَالَكَ",
          arabic: "حَالَكَ",
          pos: "noun",
          cefr: "a1",
          entry_type: "word",
          root: "ح-و-ل",
          transliteration: "ḥālaka",
          english: "your situation",
        },
      ],
    },
  ],
  null,
  2
)

/* ── Main component ────────────────────────────────────────────────── */

export default function PipelineWizard() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialState)

  const visibleSteps = PATH_STEPS[state.mode]
  const currentStepId = visibleSteps[state.stepIndex]
  const currentStepIndex = state.stepIndex

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const transcriptFileInputRef = useRef<HTMLInputElement | null>(null)
  const conjugationFileInputRef = useRef<HTMLInputElement | null>(null)

  const filteredPromptData = useMemo(() => {
    if (!state.promptData) return null
    return {
      ...state.promptData,
      existingLemmas: state.promptData.existingLemmas.filter(
        (item) => !state.excludedExistingKeys.has(existingLemmaKey(item))
      ),
    }
  }, [state.promptData, state.excludedExistingKeys])

  const generatedPrompt = useMemo(() => {
    return filteredPromptData ? buildPrompt(filteredPromptData) : ""
  }, [filteredPromptData])

  /* ── Navigation ── */
  const goBack = useCallback(() => dispatch({ type: "PREV_STEP" }), [])
  const goNext = useCallback(() => dispatch({ type: "NEXT_STEP" }), [])
  const goToStep = useCallback(
    (index: number) => {
      const visible = PATH_STEPS[state.mode]
      if (index >= 0 && index < visible.length) {
        dispatch({ type: "ADVANCE_TO", stepIndex: index })
      }
    },
    [state.mode]
  )
  const handleReset = useCallback(() => dispatch({ type: "RESET" }), [])
  const handleSkipDefinitions = useCallback(() => {
    dispatch({ type: "SET_DEFINITIONS_INSERTED", count: 0 })
    dispatch({ type: "ADVANCE_TO", stepIndex: getStepIndex(state.mode, "conjugations") })
  }, [state.mode])
  const handleSkipConjugations = useCallback(() => {
    dispatch({ type: "SET_CONJUGATIONS_INSERTED", count: 0 })
    dispatch({ type: "NEXT_STEP" })
  }, [])

  /* ── Data loading effects ── */

  // Load shows when entering "add-episode" path.
  useEffect(() => {
    if (state.mode !== "add-episode" || state.shows.length > 0) return
    let cancelled = false
    dispatch({ type: "SET_LOADING", loading: true })
    fetchShowsForAdmin()
      .then((shows) => {
        if (cancelled) return
        dispatch({ type: "SET_SHOWS", shows })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to load shows" })
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "SET_LOADING", loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [state.mode, state.shows.length])

  // Load existing episodes when entering episode-details for an existing show.
  useEffect(() => {
    if (currentStepId !== "episode-details") return
    if (state.mode === "create-show") return
    if (!state.show.id || state.existingEpisodes.length > 0) return
    let cancelled = false
    dispatch({ type: "SET_LOADING", loading: true })
    fetchEpisodesForShowAdmin(state.show.id)
      .then((episodes) => {
        if (cancelled) return
        dispatch({ type: "SET_EXISTING_EPISODES", episodes })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to load episodes" })
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "SET_LOADING", loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [currentStepId, state.mode, state.show.id, state.existingEpisodes.length])

  // Auto-suggest next episode slug.
  useEffect(() => {
    if (currentStepId !== "episode-details") return
    if (state.episode.slug) return
    const showSlug = state.show.slug || ""
    if (!showSlug) return
    const next = suggestNextEpisodeSlug(showSlug, state.existingEpisodes)
    if (next) {
      dispatch({ type: "SET_EPISODE", episode: { slug: next } })
    }
  }, [currentStepId, state.episode.slug, state.existingEpisodes, state.show.slug])

  // Run lemma preview on the review-lemmas step.
  useEffect(() => {
    if (currentStepId !== "review-lemmas") return
    if (state.preview !== null) return
    if (!state.source.trim() || !state.transcriptJson.trim()) {
      dispatch({ type: "SET_ERROR", error: "Source and transcript are required." })
      return
    }
    let cancelled = false
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    previewPipeline(state.source, state.transcriptJson)
      .then((result) => {
        if (cancelled) return
        dispatch({ type: "SET_PREVIEW", preview: result })
        if (!result.ok) {
          dispatch({ type: "SET_ERROR", error: result.error })
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to process pipeline" })
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "SET_LOADING", loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [currentStepId, state.preview, state.source, state.transcriptJson])

  // Build definitions prompt data on the definitions-prompt step.
  useEffect(() => {
    if (currentStepId !== "definitions-prompt") return
    if (state.promptData !== null) return
    if (!state.preview?.ok) {
      dispatch({ type: "SET_ERROR", error: "Lemma preview is missing." })
      return
    }
    let cancelled = false
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    buildDefinitionsPromptData(
      state.source,
      state.transcriptJson,
      state.preview.existing,
      state.preview.new
    )
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          dispatch({ type: "SET_PROMPT_DATA", data: result.data })
          dispatch({ type: "SET_EXCLUDED_EXISTING", keys: new Set() })
        } else {
          dispatch({ type: "SET_ERROR", error: result.error })
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to build definitions prompt" })
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "SET_LOADING", loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [currentStepId, state.promptData, state.preview, state.source, state.transcriptJson])

  // Load conjugation candidates on the conjugations step.
  useEffect(() => {
    if (currentStepId !== "conjugations") return
    if (state.conjugationCandidates !== null) return
    let cancelled = false
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    fetchConjugationCandidatesForSource(state.source)
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          dispatch({
            type: "SET_CONJUGATION_CANDIDATES",
            candidates: result.candidates,
            existingCount: result.existingCount,
          })
        } else {
          dispatch({ type: "SET_ERROR", error: result.error })
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to load conjugation candidates" })
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "SET_LOADING", loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [currentStepId, state.conjugationCandidates, state.source])

  /* ── Action handlers ── */

  const handleCreateShow = useCallback(async () => {
    if (
      !state.show.slug?.trim() ||
      !state.show.title?.trim() ||
      !state.show.level?.trim()
    ) {
      dispatch({ type: "SET_ERROR", error: "Slug, title, and level are required." })
      return
    }
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    try {
      const input: ShowInput = {
        slug: state.show.slug.trim(),
        title: state.show.title.trim(),
        title_ar: state.show.title_ar?.trim() || null,
        description: state.show.description?.trim() || null,
        cover: state.show.cover?.trim() || null,
        level: state.show.level.trim(),
        category: state.show.category?.trim() || null,
      }
      const id = await createShow(input)
      dispatch({ type: "SET_SHOW", show: { ...input, id } })
      dispatch({ type: "NEXT_STEP" })
    } catch (e: unknown) {
      dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to create show" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.show])

  const handleSelectShow = useCallback((show: ShowRow) => {
    dispatch({ type: "SET_SHOW", show })
    dispatch({ type: "SET_EXISTING_EPISODES", episodes: [] })
    dispatch({ type: "SET_EPISODE", episode: { slug: "" } })
    dispatch({ type: "NEXT_STEP" })
  }, [])

  const handleSelectEpisode = useCallback(
    async (episode: EpisodeRow) => {
      dispatch({ type: "SET_LOADING", loading: true })
      dispatch({ type: "SET_ERROR", error: null })
      try {
        const full = await fetchEpisodeForAdmin(episode.id)
        if (!full) {
          dispatch({ type: "SET_ERROR", error: "Episode not found." })
          return
        }
        const { transcript, ...episodeFields } = full as EpisodeWithTranscript
        dispatch({ type: "SET_EPISODE", episode: episodeFields })
        dispatch({ type: "SET_SOURCE", source: full.slug })
        dispatch({
          type: "SET_TRANSCRIPT_JSON",
          json: transcript ? JSON.stringify(transcript, null, 2) : "[]",
        })
        dispatch({ type: "ADVANCE_TO", stepIndex: getStepIndex(state.mode, "review-lemmas") })
      } catch (e: unknown) {
        dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to load episode" })
      } finally {
        dispatch({ type: "SET_LOADING", loading: false })
      }
    },
    [state.mode]
  )

  const handleEpisodeDetailsContinue = useCallback(() => {
    if (
      !state.episode.slug?.trim() ||
      !state.episode.title?.trim() ||
      !state.episode.level?.trim()
    ) {
      dispatch({ type: "SET_ERROR", error: "Episode slug, title, and level are required." })
      return
    }
    if (!state.transcriptJson.trim()) {
      dispatch({ type: "SET_ERROR", error: "Transcript JSON is required." })
      return
    }
    try {
      const parsed = JSON.parse(state.transcriptJson)
      if (!Array.isArray(parsed)) {
        dispatch({ type: "SET_ERROR", error: "Transcript JSON must be an array." })
        return
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Transcript JSON is invalid." })
      return
    }
    dispatch({ type: "SET_ERROR", error: null })
    dispatch({ type: "NEXT_STEP" })
  }, [state.episode, state.transcriptJson])

  const handleSaveEpisode = useCallback(async () => {
    if (!state.show.id) {
      dispatch({ type: "SET_ERROR", error: "Show is not selected." })
      return
    }
    if (
      !state.episode.slug?.trim() ||
      !state.episode.title?.trim() ||
      !state.episode.level?.trim()
    ) {
      dispatch({ type: "SET_ERROR", error: "Episode slug, title, and level are required." })
      return
    }
    let transcript: unknown
    try {
      transcript = JSON.parse(state.transcriptJson)
    } catch {
      dispatch({ type: "SET_ERROR", error: "Transcript JSON is invalid." })
      return
    }
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    try {
      const input: EpisodeInput = {
        show_id: state.show.id,
        slug: state.episode.slug.trim(),
        title: state.episode.title.trim(),
        level: state.episode.level.trim(),
        tags: Array.isArray(state.episode.tags) ? state.episode.tags : [],
        description: state.episode.description?.trim() || null,
        youtube_id: state.episode.youtube_id?.trim() || null,
        cover: state.episode.cover?.trim() || null,
        transcript: transcript as Record<string, unknown> | unknown[],
      }
      const id = await createEpisode(input)
      const source = state.episode.slug.trim()
      dispatch({ type: "SET_EPISODE", episode: { ...input, id } })
      dispatch({ type: "SET_SOURCE", source })
      dispatch({ type: "NEXT_STEP" })
    } catch (e: unknown) {
      dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to create episode" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.show, state.episode, state.transcriptJson])

  const handleCommitLemmas = useCallback(async () => {
    if (!state.preview?.ok) return
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    try {
      const result = await commitPipeline(state.source, state.preview.new)
      if (result.ok) {
        dispatch({ type: "SET_COMMITTED_LEMMAS", count: result.inserted })
        dispatch({ type: "NEXT_STEP" })
      } else {
        dispatch({ type: "SET_ERROR", error: result.error })
      }
    } catch (e: unknown) {
      dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to commit lemmas" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.preview, state.source])

  const handleSkipLemmas = useCallback(() => {
    dispatch({ type: "SET_COMMITTED_LEMMAS", count: 0 })
    dispatch({ type: "NEXT_STEP" })
  }, [])

  const handleCopyPrompt = useCallback(async () => {
    if (!generatedPrompt) return
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      dispatch({ type: "SET_COPIED", copied: true })
      setTimeout(() => dispatch({ type: "SET_COPIED", copied: false }), 2000)
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to copy prompt to clipboard" })
    }
  }, [generatedPrompt])

  const handleValidateDefinitions = useCallback(async () => {
    dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: null })
    dispatch({ type: "SET_DEFINITION_ROWS", rows: null })
    dispatch({ type: "SET_DEFINITION_EXISTING_KEYS", keys: new Set() })
    dispatch({ type: "SET_DEFINITIONS_INSERTED", count: null })

    if (!state.llmOutput.trim()) {
      dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: "Please paste the LLM output JSON." })
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(state.llmOutput)
    } catch {
      dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: "Invalid JSON. Please check the LLM output and try again." })
      return
    }

    if (!Array.isArray(parsed)) {
      dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: "LLM output must be a JSON array." })
      return
    }

    const validation = validateDefinitionRows(parsed)
    if (!validation.ok) {
      dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: validation.error })
      return
    }

    const rowsWithSource = validation.rows.map((row) => ({
      ...row,
      source: row.source || state.source.trim(),
    }))

    dispatch({ type: "SET_LOADING", loading: true })
    try {
      const existingResult = await checkExistingDefinitions(rowsWithSource)
      if (!existingResult.ok) {
        dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: existingResult.error })
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

      dispatch({ type: "SET_DEFINITION_EXISTING_KEYS", keys: existingUiKeys })
      dispatch({ type: "SET_EXCLUDED_DEFINITION_KEYS", keys: existingUiKeys })
      dispatch({ type: "SET_DEFINITION_ROWS", rows: rowsWithSource })
      dispatch({ type: "NEXT_STEP" })
    } catch (e: unknown) {
      dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: errorMessage(e) ?? "Failed to check existing definitions" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.llmOutput, state.source])

  const handleInsertDefinitions = useCallback(async () => {
    if (!state.definitionRows) return
    const included = state.definitionRows.filter(
      (row, idx) => !state.excludedDefinitionKeys.has(definitionKey(row, idx))
    )
    if (included.length === 0) {
      dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: "No rows selected for insertion." })
      return
    }
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: null })
    try {
      const result = await commitDefinitions(state.source, included)
      if (result.ok) {
        dispatch({ type: "SET_DEFINITIONS_INSERTED", count: result.inserted })
        dispatch({ type: "NEXT_STEP" })
      } else {
        dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: result.error })
      }
    } catch (e: unknown) {
      dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: errorMessage(e) ?? "Failed to insert definitions" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.definitionRows, state.excludedDefinitionKeys, state.source])

  const handleBuildConjugationPrompt = useCallback(async () => {
    if (!state.conjugationCandidates || state.conjugationCandidates.length === 0) return
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: null })
    try {
      const result = await buildConjugationsPromptData(state.conjugationCandidates, state.source)
      if (result.ok) {
        dispatch({ type: "SET_CONJUGATION_PROMPT", prompt: result.prompt })
      } else {
        dispatch({ type: "SET_ERROR", error: result.error })
      }
    } catch (e: unknown) {
      dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to build conjugation prompt" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.conjugationCandidates, state.source])

  const handleCopyConjugationPrompt = useCallback(async () => {
    if (!state.conjugationPrompt) return
    try {
      await navigator.clipboard.writeText(state.conjugationPrompt)
      dispatch({ type: "SET_CONJUGATION_PROMPT_COPIED", copied: true })
      setTimeout(() => dispatch({ type: "SET_CONJUGATION_PROMPT_COPIED", copied: false }), 2000)
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to copy prompt to clipboard" })
    }
  }, [state.conjugationPrompt])

  const handleValidateConjugationRows = useCallback(async () => {
    dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: null })
    if (!state.conjugationLlmOutput.trim()) {
      dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: "Please paste the LLM output JSON." })
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(state.conjugationLlmOutput)
    } catch {
      dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: "Invalid JSON. Please check the LLM output and try again." })
      return
    }
    dispatch({ type: "SET_LOADING", loading: true })
    try {
      const result = await validateConjugationRows(parsed)
      if (result.ok) {
        dispatch({ type: "SET_GENERATED_CONJUGATIONS", rows: result.rows, skipped: [] })
      } else {
        dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: result.error })
      }
    } catch (e: unknown) {
      dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: errorMessage(e) ?? "Failed to validate conjugations" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.conjugationLlmOutput])

  const handleInsertConjugations = useCallback(async () => {
    if (!state.generatedConjugationRows) return
    const included = state.generatedConjugationRows.filter(
      (row) => !state.conjugationExcludedKeys.has(conjKey(row))
    )
    if (included.length === 0) {
      dispatch({ type: "SET_ERROR", error: "No conjugation rows selected for insertion." })
      return
    }
    dispatch({ type: "SET_LOADING", loading: true })
    dispatch({ type: "SET_ERROR", error: null })
    try {
      const result = await commitConjugations(included)
      if (result.ok) {
        dispatch({ type: "SET_CONJUGATIONS_INSERTED", count: result.inserted })
        dispatch({ type: "NEXT_STEP" })
      } else {
        dispatch({ type: "SET_ERROR", error: result.error })
      }
    } catch (e: unknown) {
      dispatch({ type: "SET_ERROR", error: errorMessage(e) ?? "Failed to insert conjugations" })
    } finally {
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [state.generatedConjugationRows, state.conjugationExcludedKeys])

  /* ── Existing definitions review helpers ── */
  const toggleExistingExcluded = useCallback((key: string) => {
    dispatch({ type: "TOGGLE_EXCLUDED_EXISTING", key })
  }, [])

  const selectAllExisting = useCallback(() => {
    dispatch({ type: "SET_EXCLUDED_EXISTING", keys: new Set() })
  }, [])

  const deselectAllExisting = useCallback(() => {
    if (!state.promptData) return
    const keys = new Set<string>()
    for (const item of state.promptData.existingLemmas) {
      if (item.definitions.length > 0) {
        keys.add(existingLemmaKey(item))
      }
    }
    dispatch({ type: "SET_EXCLUDED_EXISTING", keys })
  }, [state.promptData])

  /* ── Definition review helpers ── */
  const toggleDefinitionExcluded = useCallback((key: string) => {
    dispatch({ type: "TOGGLE_DEFINITION_EXCLUDED", key })
  }, [])

  const selectAllDefinitions = useCallback(() => {
    dispatch({ type: "SET_EXCLUDED_DEFINITION_KEYS", keys: new Set() })
  }, [])

  const deselectAllDefinitions = useCallback(() => {
    if (!state.definitionRows) return
    dispatch({
      type: "SET_EXCLUDED_DEFINITION_KEYS",
      keys: new Set(state.definitionRows.map((row, idx) => definitionKey(row, idx))),
    })
  }, [state.definitionRows])

  const updateDefinitionRow = useCallback(
    (index: number, field: keyof DefinitionOutputRow, value: string | null) => {
      dispatch({ type: "UPDATE_DEFINITION_ROW", index, field, value })
    },
    []
  )

  /* ── Conjugation review helpers ── */
  const toggleConjugationExcluded = useCallback((key: string) => {
    dispatch({ type: "TOGGLE_CONJUGATION_EXCLUDED", key })
  }, [])

  const toggleConjugationLemmaExpanded = useCallback((lemma: string) => {
    dispatch({ type: "TOGGLE_CONJUGATION_LEMMA_EXPANDED", lemma })
  }, [])

  const toggleConjugationLemmaAll = useCallback((lemma: string, excludeAll: boolean) => {
    dispatch({ type: "TOGGLE_CONJUGATION_LEMMA_ALL", lemma, excludeAll })
  }, [])

  const updateConjugationRow = useCallback(
    (key: string, field: keyof GeneratedConjugation, value: string | null) => {
      dispatch({ type: "UPDATE_CONJUGATION_ROW", key, field, value })
    },
    []
  )

  const selectAllConjugations = useCallback(() => {
    dispatch({ type: "SET_CONJUGATION_EXCLUDED_KEYS", keys: new Set() })
  }, [])

  const deselectAllConjugations = useCallback(() => {
    if (!state.generatedConjugationRows) return
    dispatch({
      type: "SET_CONJUGATION_EXCLUDED_KEYS",
      keys: new Set(state.generatedConjugationRows.map((row) => conjKey(row))),
    })
  }, [state.generatedConjugationRows])

  /* ── File uploads ── */
  const handleTranscriptFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        dispatch({ type: "SET_TRANSCRIPT_JSON", json: text })
        dispatch({ type: "SET_ERROR", error: null })
      } catch (err: unknown) {
        dispatch({ type: "SET_ERROR", error: errorMessage(err) ?? "Failed to read file" })
      } finally {
        if (transcriptFileInputRef.current) transcriptFileInputRef.current.value = ""
      }
    },
    []
  )

  const handleDefinitionsFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        dispatch({ type: "SET_LLM_OUTPUT", text })
        dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: null })
      } catch (err: unknown) {
        dispatch({ type: "SET_DEFINITION_VALIDATION_ERROR", error: errorMessage(err) ?? "Failed to read file" })
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    []
  )

  const handleConjugationFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        dispatch({ type: "SET_CONJUGATION_LLM_OUTPUT", text })
        dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: null })
      } catch (err: unknown) {
        dispatch({ type: "SET_CONJUGATION_VALIDATION_ERROR", error: errorMessage(err) ?? "Failed to read file" })
      } finally {
        if (conjugationFileInputRef.current) conjugationFileInputRef.current.value = ""
      }
    },
    []
  )

  /* ── Step renderers ── */

  const renderStepContent = () => {
    switch (currentStepId) {
      case "entry":
        return renderEntryStep()
      case "show-details":
        return renderShowDetailsStep()
      case "select-show":
        return renderSelectShowStep()
      case "episode-details":
        return renderEpisodeDetailsStep()
      case "save-episode":
        return renderSaveEpisodeStep()
      case "review-lemmas":
        return renderReviewLemmasStep()
      case "definitions-prompt":
        return renderDefinitionsPromptStep()
      case "paste-definitions":
        return renderPasteDefinitionsStep()
      case "review-definitions":
        return renderReviewDefinitionsStep()
      case "conjugations":
        return renderConjugationsStep()
      case "done":
        return renderDoneStep()
      default:
        return null
    }
  }

  function renderEntryStep() {
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
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontWeight: 700,
            color: "#2c1a0e",
            mb: 1,
            textAlign: "center",
          }}
        >
          What would you like to do?
        </Typography>
        <Typography
          sx={{
            fontFamily: "Jost, sans-serif",
            color: "#7a6e65",
            mb: 4,
            textAlign: "center",
          }}
        >
          Choose whether to start with a new cartoon show or add an episode to an existing show.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <Card
            elevation={0}
            sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)" }}
          >
            <CardActionArea
              onClick={() => dispatch({ type: "SET_MODE", mode: "create-show" })}
              sx={{ p: 3, height: "100%" }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    textAlign: "center",
                  }}
                >
                  <Box sx={{ bgcolor: "rgba(184,134,11,0.12)", p: 2, borderRadius: "14px" }}>
                    <Tv sx={{ fontSize: 40, color: "#b8860b" }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}
                  >
                    Create new show
                  </Typography>
                  <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    Add a new cartoon series and its first episode.
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
          <Card
            elevation={0}
            sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)" }}
          >
            <CardActionArea
              onClick={() => dispatch({ type: "SET_MODE", mode: "add-episode" })}
              sx={{ p: 3, height: "100%" }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    textAlign: "center",
                  }}
                >
                  <Box sx={{ bgcolor: "rgba(44,26,14,0.08)", p: 2, borderRadius: "14px" }}>
                    <Movie sx={{ fontSize: 40, color: "#2c1a0e" }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}
                  >
                    Add episode to existing show
                  </Typography>
                  <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    Add a new episode to a show that already exists.
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      </Paper>
    )
  }

  function renderShowDetailsStep() {
    return (
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
          Show details
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3 }}>
          Enter the metadata for the new show.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <AdminTextField
            label="Slug"
            value={state.show.slug ?? ""}
            onChange={(e) => dispatch({ type: "SET_SHOW", show: { slug: e.target.value } })}
            helperText="URL-friendly identifier, e.g. spongebob, tmnt"
            fullWidth
            size="small"
          />
          <AdminTextField
            label="Title"
            value={state.show.title ?? ""}
            onChange={(e) => dispatch({ type: "SET_SHOW", show: { title: e.target.value } })}
            helperText="English title, e.g. SpongeBob SquarePants"
            fullWidth
            size="small"
          />
          <AdminTextField
            label="Title Arabic"
            value={state.show.title_ar ?? ""}
            onChange={(e) => dispatch({ type: "SET_SHOW", show: { title_ar: e.target.value } })}
            helperText="Arabic title, e.g. سبونج بوب سكوير بانتس"
            fullWidth
            size="small"
          />
          <AdminTextField
            label="Description"
            value={state.show.description ?? ""}
            onChange={(e) => dispatch({ type: "SET_SHOW", show: { description: e.target.value } })}
            helperText="Short description of the show"
            fullWidth
            multiline
            rows={3}
            size="small"
          />
          <AdminTextField
            label="Cover"
            value={state.show.cover ?? ""}
            onChange={(e) => dispatch({ type: "SET_SHOW", show: { cover: e.target.value } })}
            helperText="Path to cover image, e.g. assets/cartoons/spongebob/spongebob_cover.avif"
            fullWidth
            size="small"
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
            <AdminTextField
              label="Level"
              value={state.show.level ?? ""}
              onChange={(e) => dispatch({ type: "SET_SHOW", show: { level: e.target.value } })}
              helperText="CEFR level, e.g. A2"
              fullWidth
              size="small"
            />
            <AdminTextField
              label="Category"
              value={state.show.category ?? ""}
              onChange={(e) => dispatch({ type: "SET_SHOW", show: { category: e.target.value } })}
              helperText="e.g. Comedy"
              fullWidth
              size="small"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: "rgba(122,110,101,0.15)" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={handleReset}
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
            onClick={handleCreateShow}
            disabled={state.loading}
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
            {state.loading ? "Creating…" : "Create show"}
          </Button>
        </Box>
      </Paper>
    )
  }

  function renderSelectShowStep() {
    const filtered = state.showSearch.trim()
      ? state.shows.filter((s) =>
          `${s.title} ${s.title_ar ?? ""} ${s.slug}`
            .toLowerCase()
            .includes(state.showSearch.toLowerCase())
        )
      : state.shows

    return (
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
          Select show
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3 }}>
          Choose the show this episode belongs to.
        </Typography>

        <TextField
          value={state.showSearch}
          onChange={(e) => dispatch({ type: "SET_SHOW_SEARCH", query: e.target.value })}
          placeholder="Search shows..."
          fullWidth
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "#9e8a7a" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            mb: 3,
            "& .MuiInputBase-root": { fontFamily: "Jost, sans-serif", borderRadius: "8px" },
          }}
        />

        {state.loading && filtered.length === 0 ? (
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            Loading shows…
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            No shows found.
          </Typography>
        ) : (
          <List
            sx={{
              bgcolor: "#fff",
              borderRadius: "12px",
              border: "1px solid rgba(122,110,101,0.15)",
            }}
          >
            {filtered.map((show) => (
              <ListItem key={show.id} disablePadding divider>
                <ListItemButton
                  onClick={() => handleSelectShow(show)}
                  selected={state.show.id === show.id}
                >
                  <ListItemText
                    primary={show.title}
                    secondary={show.slug}
                    slotProps={{
                      primary: {
                        sx: {
                          fontFamily: "'EB Garamond', serif",
                          fontWeight: 600,
                          color: "#2c1a0e",
                        },
                      },
                      secondary: {
                        sx: { fontFamily: "Jost, sans-serif", color: "#7a6e65" },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        <Divider sx={{ my: 3, borderColor: "rgba(122,110,101,0.15)" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={handleReset}
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
            onClick={goBack}
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
        </Box>
      </Paper>
    )
  }


  function renderEpisodeDetailsStep() {
    return (
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
          Episode details
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3 }}>
          Enter the metadata and transcript for the new episode.
        </Typography>

        {state.existingEpisodes.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                color: "#7a6e65",
                mb: 1,
              }}
            >
              Already added this episode? Click it to skip creation and go to review lemmas.
            </Typography>
            <List
              sx={{
                bgcolor: "#fff",
                borderRadius: "12px",
                border: "1px solid rgba(122,110,101,0.15)",
              }}
            >
              {state.existingEpisodes.map((episode) => (
                <ListItem
                  key={episode.id}
                  secondaryAction={
                    <Button
                      onClick={() => handleSelectEpisode(episode)}
                      size="small"
                      sx={{
                        textTransform: "none",
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 600,
                        color: "#1B4D3E",
                      }}
                    >
                      Resume
                    </Button>
                  }
                  divider
                >
                  <ListItemText
                    primary={episode.title}
                    secondary={`${episode.slug} · ${episode.level}`}
                    slotProps={{
                      primary: {
                        sx: {
                          fontFamily: "'EB Garamond', serif",
                          fontWeight: 600,
                          color: "#2c1a0e",
                        },
                      },
                      secondary: {
                        sx: { fontFamily: "Jost, sans-serif", color: "#7a6e65" },
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
            <AdminTextField
              label="Slug"
              value={state.episode.slug ?? ""}
              onChange={(e) => dispatch({ type: "SET_EPISODE", episode: { slug: e.target.value } })}
              helperText="Episode identifier, e.g. sb-1"
              fullWidth
              size="small"
            />
            <AdminTextField
              label="Title"
              value={state.episode.title ?? ""}
              onChange={(e) => dispatch({ type: "SET_EPISODE", episode: { title: e.target.value } })}
              fullWidth
              size="small"
            />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
            <AdminTextField
              label="Level"
              value={state.episode.level ?? ""}
              onChange={(e) => dispatch({ type: "SET_EPISODE", episode: { level: e.target.value } })}
              helperText="CEFR level, e.g. A2"
              fullWidth
              size="small"
            />
            <AdminTextField
              label="Tags"
              value={(state.episode.tags ?? []).join(", ")}
              onChange={(e) =>
                dispatch({
                  type: "SET_EPISODE",
                  episode: {
                    tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                  },
                })
              }
              helperText="Comma separated"
              fullWidth
              size="small"
            />
          </Box>
          <AdminTextField
            label="Description"
            value={state.episode.description ?? ""}
            onChange={(e) =>
              dispatch({ type: "SET_EPISODE", episode: { description: e.target.value } })
            }
            fullWidth
            multiline
            rows={3}
            size="small"
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 }}>
            <AdminTextField
              label="YouTube ID"
              value={state.episode.youtube_id ?? ""}
              onChange={(e) =>
                dispatch({ type: "SET_EPISODE", episode: { youtube_id: e.target.value } })
              }
              fullWidth
              size="small"
            />
            <AdminTextField
              label="Cover"
              value={state.episode.cover ?? ""}
              onChange={(e) => dispatch({ type: "SET_EPISODE", episode: { cover: e.target.value } })}
              helperText="Path to episode cover"
              fullWidth
              size="small"
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
                  ref={transcriptFileInputRef}
                  type="file"
                  accept=".json,.txt"
                  hidden
                  onChange={handleTranscriptFileChange}
                />
              </Button>
            </Box>
            <AdminTextField
              value={state.transcriptJson}
              onChange={(e) => dispatch({ type: "SET_TRANSCRIPT_JSON", json: e.target.value })}
              placeholder='Paste transcript JSON here: an array of entries with "tokens", "timestamp", and "translation".'
              multiline
              fullWidth
              rows={14}
              sx={{ "& .MuiInputBase-input": { fontSize: "1.1rem" } }}
            />
          </Box>

          <Box>
            <Button
              onClick={() =>
                dispatch({ type: "SET_SHOW_TRANSCRIPT_EXAMPLE", open: !state.showTranscriptExample })
              }
              endIcon={state.showTranscriptExample ? <ExpandLess /> : <ExpandMore />}
              sx={{
                color: "#7a6e65",
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
              }}
            >
              Example transcript format
            </Button>
            <Collapse in={state.showTranscriptExample}>
              <Box sx={{ mt: 1 }}>
                <TextField
                  value={EXAMPLE_TRANSCRIPT}
                  multiline
                  fullWidth
                  rows={12}
                  slotProps={{ input: { readOnly: true } }}
                  sx={{
                    "& .MuiInputBase-root": {
                      fontFamily: "'Geist Mono', ui-monospace, monospace",
                      fontSize: "0.95rem",
                      bgcolor: "#f8f5f0",
                      borderRadius: "12px",
                      alignItems: "flex-start",
                    },
                  }}
                />
              </Box>
            </Collapse>
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: "rgba(122,110,101,0.15)" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={handleReset}
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
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={goBack}
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
            <Button
              variant="contained"
              onClick={handleEpisodeDetailsContinue}
              disabled={state.loading}
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
              Continue to review
            </Button>
          </Box>
        </Box>
      </Paper>
    )
  }

  function renderSaveEpisodeStep() {
    return (
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
          Save episode
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3 }}>
          Review the episode details before saving.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
          <ReviewRow
            label="Show"
            value={
              state.mode === "create-show"
                ? `${state.show.title} (${state.show.slug})`
                : state.show.title
            }
          />
          <ReviewRow label="Slug" value={state.episode.slug} />
          <ReviewRow label="Title" value={state.episode.title} />
          <ReviewRow label="Level" value={state.episode.level} />
          <ReviewRow
            label="Tags"
            value={(state.episode.tags ?? []).join(", ") || "—"}
          />
          <ReviewRow label="Description" value={state.episode.description || "—"} />
          <ReviewRow label="YouTube ID" value={state.episode.youtube_id || "—"} />
          <ReviewRow label="Cover" value={state.episode.cover || "—"} />
          <ReviewRow
            label="Transcript entries"
            value={`${getTranscriptEntryCount(state.transcriptJson)} blocks`}
          />
        </Box>

        <Alert severity="info" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
          The source for this pipeline will be set to <strong>{state.episode.slug}</strong>.
        </Alert>

        <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={handleReset}
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
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={goBack}
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
            <Button
              variant="contained"
              onClick={handleSaveEpisode}
              disabled={state.loading}
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
              {state.loading ? "Saving…" : "Save episode"}
            </Button>
          </Box>
        </Box>
      </Paper>
    )
  }

  function renderReviewLemmasStep() {
    if (!state.preview?.ok) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {state.loading ? "Scanning transcript for lemmas…" : "Preview is not available."}
          </Typography>
        </Paper>
      )
    }

    const { preview } = state
    const canCommit = preview.new.length > 0

    return (
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
          Review extracted lemmas
        </Typography>

        <Alert
          severity="info"
          icon={<Help />}
          sx={{
            mb: 3,
            fontFamily: "Jost, sans-serif",
            borderRadius: "10px",
            color: "#2c1a0e",
          }}
        >
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>What happens next?</Typography>
          <Typography sx={{ fontSize: "0.95rem" }}>
            We scanned every <code>tokens</code> array in your transcript and pulled out each unique
            word/phrase. Each card below represents one <strong>lemma</strong> that will be added to
            the <strong>vocab_lemmas</strong> table.
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
            onClick={() => dispatch({ type: "SET_EXISTING_OPEN", open: !state.existingOpen })}
            endIcon={state.existingOpen ? <ExpandLess /> : <ExpandMore />}
            sx={{
              color: "#7a6e65",
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
            }}
          >
            Existing entries ({preview.existing.length})
          </Button>
          <Collapse in={state.existingOpen}>
            <Box sx={{ mt: 1 }}>
              <LemmaTable items={preview.existing} prefix="existing" />
            </Box>
          </Collapse>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Button
            onClick={() => dispatch({ type: "SET_NEW_OPEN", open: !state.newOpen })}
            endIcon={state.newOpen ? <ExpandLess /> : <ExpandMore />}
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
          <Collapse in={state.newOpen}>
            <Box sx={{ mt: 1 }}>
              <LemmaTable items={preview.new} prefix="new" />
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={goBack}
            disabled={state.loading}
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
              disabled={state.loading}
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
            {canCommit ? (
              <Button
                variant="contained"
                onClick={handleCommitLemmas}
                disabled={state.loading}
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
                {state.loading ? "Adding…" : `Add ${preview.new.length} lemmas to vocab_lemmas`}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSkipLemmas}
                disabled={state.loading}
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
                Continue to definitions
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    )
  }

  function renderDefinitionsPromptStep() {
    if (!state.promptData) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {state.loading ? "Building definitions prompt…" : "Prompt data is not available."}
          </Typography>
        </Paper>
      )
    }

    const hasExistingWithDefs =
      state.promptData.existingLemmas.filter((item) => item.definitions.length > 0).length > 0

    return (
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
          Arabic-capable LLM. Paste the returned JSON back in the next step.
        </Typography>

        <Box sx={{ position: "relative", mb: 3 }}>
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
              bgcolor: state.copied ? "#b8860b" : "#2c1a0e",
              color: "#f5ede0",
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              borderRadius: "8px",
              "&:hover": { bgcolor: state.copied ? "#9e7a0b" : "#1a0f08" },
            }}
          >
            {state.copied ? "Copied" : "Copy prompt"}
          </Button>
        </Box>

        {hasExistingWithDefs && (
          <Box sx={{ mb: 3 }}>
            <Button
              onClick={() =>
                dispatch({
                  type: "SET_SHOW_EXISTING_DEFS_REVIEW",
                  open: !state.showExistingDefinitionsReview,
                })
              }
              endIcon={state.showExistingDefinitionsReview ? <ExpandLess /> : <ExpandMore />}
              sx={{
                color: "#2c1a0e",
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              Existing definitions review
            </Button>
            <Collapse in={state.showExistingDefinitionsReview}>
              <Box sx={{ mt: 2 }}>
                {state.committedLemmas !== null && state.committedLemmas > 0 && (
                  <Alert
                    severity="success"
                    icon={<CheckCircle />}
                    sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}
                  >
                    {state.committedLemmas} new lemma row{state.committedLemmas === 1 ? "" : "s"}{" "}
                    inserted. Now review which existing words already have good definitions.
                  </Alert>
                )}
                <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2 }}>
                  These transcript entries already exist in the database and have definitions. Remove
                  any that are already covered correctly so the LLM can focus on words that actually
                  need new definitions.
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1.5,
                    flexWrap: "wrap",
                    mb: 2,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={selectAllExisting}
                    disabled={state.excludedExistingKeys.size === 0}
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
                      state.promptData.existingLemmas.filter((item) => item.definitions.length > 0)
                        .length === state.excludedExistingKeys.size
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
                  items={state.promptData.existingLemmas}
                  excludedKeys={state.excludedExistingKeys}
                  onToggle={toggleExistingExcluded}
                />
              </Box>
            </Collapse>
          </Box>
        )}

        <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={goBack}
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
              onClick={handleSkipDefinitions}
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
              onClick={goNext}
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
    )
  }

  function renderPasteDefinitionsStep() {
    return (
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
        <Typography
          sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2, fontSize: "1.1rem" }}
        >
          Paste the JSON array the LLM returned. We will validate it against the{" "}
          <strong>vocab_definitions</strong> schema before letting you review and insert it.
        </Typography>

        {state.definitionValidationError && (
          <Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
            {state.definitionValidationError}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
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
              onChange={handleDefinitionsFileChange}
            />
          </Button>
        </Box>

        <TextField
          value={state.llmOutput}
          onChange={(e) => dispatch({ type: "SET_LLM_OUTPUT", text: e.target.value })}
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
            onClick={goBack}
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
              onClick={handleSkipDefinitions}
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
              onClick={handleValidateDefinitions}
              disabled={state.loading}
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
    )
  }

  function renderReviewDefinitionsStep() {
    if (!state.definitionRows) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            No definitions to review. Go back and paste LLM output.
          </Typography>
        </Paper>
      )
    }

    return (
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
        <Typography
          sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2, fontSize: "1.1rem" }}
        >
          Rows already in <strong>vocab_definitions</strong> are unchecked by default so a re-run
          does not create duplicates. Tick any row, including an existing one, if you want to insert
          it anyway.
        </Typography>

        {state.definitionValidationError && (
          <Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
            {state.definitionValidationError}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3, alignItems: "center" }}>
          <Chip
            label={`${state.definitionRows.length - state.excludedDefinitionKeys.size} rows to insert`}
            sx={{
              bgcolor: "rgba(184,134,11,0.12)",
              color: "#2c1a0e",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          />
          <Chip
            label={`${state.excludedDefinitionKeys.size} excluded`}
            sx={{
              bgcolor: "rgba(44,26,14,0.08)",
              color: "#2c1a0e",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          />
          <Chip
            label={`${state.definitionExistingKeys.size} already in database`}
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
            disabled={state.loading || state.excludedDefinitionKeys.size === 0}
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
            disabled={state.loading || state.excludedDefinitionKeys.size === state.definitionRows.length}
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
          {state.definitionRows.map((row, idx) => (
            <DefinitionEditCard
              key={definitionKey(row, idx)}
              row={row}
              index={idx}
              excluded={state.excludedDefinitionKeys.has(definitionKey(row, idx))}
              isExisting={state.definitionExistingKeys.has(definitionKey(row, idx))}
              onToggle={() => toggleDefinitionExcluded(definitionKey(row, idx))}
              onChange={updateDefinitionRow}
            />
          ))}
        </Box>

        <Divider sx={{ my: 2, borderColor: "rgba(122,110,101,0.15)" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={goBack}
            disabled={state.loading}
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
              disabled={state.loading}
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
              onClick={handleSkipDefinitions}
              disabled={state.loading}
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
              disabled={state.loading || state.definitionRows.length - state.excludedDefinitionKeys.size === 0}
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
              {state.loading
                ? "Inserting…"
                : `Write ${state.definitionRows.length - state.excludedDefinitionKeys.size} rows to Supabase`}
            </Button>
          </Box>
        </Box>
      </Paper>
    )
  }

  function renderConjugationsStep() {
    if (state.conjugationsInserted !== null) {
      return (
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
        </Paper>
      )
    }

    if (state.generatedConjugationRows) {
      return (
        <ConjugationReview
          rows={state.generatedConjugationRows}
          skipped={state.conjugationSkipped}
          excludedKeys={state.conjugationExcludedKeys}
          expandedLemmas={state.conjugationExpandedLemmas}
          inserting={state.loading}
          onToggleExcluded={toggleConjugationExcluded}
          onToggleLemmaExpanded={toggleConjugationLemmaExpanded}
          onToggleLemmaAll={toggleConjugationLemmaAll}
          onChangeRow={updateConjugationRow}
          onInsert={handleInsertConjugations}
          onSelectAll={selectAllConjugations}
          onDeselectAll={deselectAllConjugations}
          onSkip={handleSkipConjugations}
          onReset={handleReset}
        />
      )
    }

    if (!state.conjugationCandidates) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {state.loading ? "Loading verb candidates…" : "No conjugation candidates loaded."}
          </Typography>
        </Paper>
      )
    }

    if (state.conjugationPrompt && !state.generatedConjugationRows) {
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
            Conjugation prompt
          </Typography>

          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 2 }}>
            Copy the prompt below, paste it into your LLM, then paste the returned JSON array into the
            text area.
          </Typography>

          <Box sx={{ position: "relative", mb: 3 }}>
            <TextField
              value={state.conjugationPrompt}
              multiline
              rows={10}
              fullWidth
              slotProps={{
                input: { readOnly: true },
              }}
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.85rem",
                  bgcolor: "#f8f5f0",
                  borderRadius: "10px",
                },
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyConjugationPrompt}
              startIcon={<ContentCopy />}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                textTransform: "none",
                fontFamily: "Jost, sans-serif",
                fontWeight: 600,
                borderColor: "rgba(122,110,101,0.3)",
                color: "#7a6e65",
                borderRadius: "8px",
                bgcolor: "#fff",
              }}
            >
              {state.conjugationPromptCopied ? "Copied!" : "Copy"}
            </Button>
          </Box>

          <AdminTextField
            label="LLM output JSON"
            value={state.conjugationLlmOutput}
            onChange={(e) => dispatch({ type: "SET_CONJUGATION_LLM_OUTPUT", text: e.target.value })}
            fullWidth
            multiline
            rows={10}
            sx={{
              mb: 2,
              "& .MuiInputBase-root": {
                fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.85rem",
              },
            }}
          />

          <input
            ref={conjugationFileInputRef}
            type="file"
            accept=".json,.txt"
            style={{ display: "none" }}
            onChange={handleConjugationFileChange}
          />

          {state.conjugationValidationError && (
            <Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{state.conjugationValidationError}</Typography>
            </Alert>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={() => dispatch({ type: "SET_CONJUGATION_PROMPT", prompt: null })}
              disabled={state.loading}
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
              Back to candidates
            </Button>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={() => conjugationFileInputRef.current?.click()}
                disabled={state.loading}
                startIcon={<UploadFile />}
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
                Upload LLM output
              </Button>
              <Button
                variant="contained"
                onClick={handleValidateConjugationRows}
                disabled={state.loading || !state.conjugationLlmOutput.trim()}
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
                {state.loading ? "Validating…" : "Validate & review"}
              </Button>
            </Box>
          </Box>
        </Paper>
      )
    }

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
          Verb conjugations
        </Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Chip
            label={`${state.conjugationCandidates.length} verb${
              state.conjugationCandidates.length === 1 ? "" : "s"
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
            label={`${state.conjugationExistingCount} verb${
              state.conjugationExistingCount === 1 ? "" : "s"
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

        <Typography
          sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3, fontSize: "1.1rem" }}
        >
          {state.conjugationCandidates.length > 0 ? (
            <>
              There are {state.conjugationCandidates.length + state.conjugationExistingCount} verb
              lemmas for this source. The {state.conjugationCandidates.length} below are not yet in{" "}
              <strong>verb_conjugations</strong> and will be generated.
            </>
          ) : (
            <>All verb lemmas for this source already have conjugations.</>
          )}
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={goBack}
            disabled={state.loading}
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
            Back
          </Button>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleSkipConjugations}
              disabled={state.loading}
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
              onClick={handleBuildConjugationPrompt}
              disabled={state.loading || state.conjugationCandidates.length === 0}
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
              {state.loading
                ? "Building prompt…"
                : `Build conjugation prompt for ${state.conjugationCandidates.length} verb${
                    state.conjugationCandidates.length === 1 ? "" : "s"
                  }`}
            </Button>
          </Box>
        </Box>
      </Paper>
    )
  }

  function renderDoneStep() {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: "16px",
          border: "1px solid rgba(122,110,101,0.15)",
          textAlign: "center",
        }}
      >
        <CheckCircle sx={{ fontSize: 64, color: "#b8860b", mb: 2 }} />
        <Typography
          variant="h5"
          sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}
        >
          Pipeline complete
        </Typography>
        <Typography
          sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3, fontSize: "1.05rem" }}
        >
          The episode <strong>{state.episode.title}</strong> ({state.episode.slug}) has been saved.
          {state.definitionsInserted !== null && state.definitionsInserted > 0 && (
            <>
              {" "}
              {state.definitionsInserted} definition row{state.definitionsInserted === 1 ? "" : "s"}{" "}
              inserted.
            </>
          )}
          {state.conjugationsInserted !== null && state.conjugationsInserted > 0 && (
            <>
              {" "}
              {state.conjugationsInserted} conjugation row{state.conjugationsInserted === 1 ? "" : "s"}{" "}
              inserted.
            </>
          )}
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            component={Link}
            href={`/cartoons/${state.show.slug}/${state.episode.slug}`}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              borderColor: "rgba(122,110,101,0.3)",
              color: "#7a6e65",
              borderRadius: "10px",
            }}
          >
            View episode
          </Button>
          <Button
            component={Link}
            href="/admin"
            variant="outlined"
            sx={{
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              borderColor: "rgba(122,110,101,0.3)",
              color: "#7a6e65",
              borderRadius: "10px",
            }}
          >
            Back to admin
          </Button>
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
            Process another
          </Button>
        </Box>
      </Paper>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}
        >
          Pipeline
        </Typography>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "1rem" }}>
          Import transcript entries and generate definition prompts.
        </Typography>
      </Box>

      {state.error && (
        <Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>
          {state.error}
        </Alert>
      )}

      {state.mode !== "entry" && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: "16px",
            border: "1px solid rgba(122,110,101,0.15)",
          }}
        >
          <Stepper activeStep={currentStepIndex} alternativeLabel>
            {visibleSteps.map((stepId, idx) => (
              <Step key={stepId} completed={idx < currentStepIndex}>
                <StepLabel
                  onClick={() => goToStep(idx)}
                  sx={{
                    cursor: "pointer",
                    "& .MuiStepLabel-label": {
                      fontFamily: "Jost, sans-serif",
                      color: idx === currentStepIndex ? "#2c1a0e" : "#9e8a7a",
                    },
                  }}
                >
                  {STEP_LABELS[stepId]}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {renderStepContent()}
    </Box>
  )
}

/* ── Utility helpers ───────────────────────────────────────────────── */

function getTranscriptEntryCount(json: string): number {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 0.5, sm: 2 },
      }}
    >
      <Typography
        sx={{
          fontFamily: "Jost, sans-serif",
          fontWeight: 600,
          color: "#7a6e65",
          minWidth: 140,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#2c1a0e", fontSize: "1.05rem" }}>
        {value}
      </Typography>
    </Box>
  )
}

/* ── Reusable pipeline components ──────────────────────────────────── */

function LemmaTable({ items, prefix }: { items: PipelineItem[]; prefix: string }) {
  const arabicCellSx = {
    fontFamily: "'EB Garamond', serif",
    fontSize: "1.35rem",
    color: "#2c1a0e",
    lineHeight: 1.4,
    py: 1,
  }

  const latinCellSx = {
    fontFamily: "Jost, sans-serif",
    fontSize: "0.95rem",
    color: "#2c1a0e",
    lineHeight: 1.4,
    py: 1,
  }

  const headerSx = {
    fontFamily: "Jost, sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "#7a6e65",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    py: 1,
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
              <TableCell sx={arabicCellSx}>{item.arabic}</TableCell>
              <TableCell sx={arabicCellSx}>
                {item.contextualArabic && item.contextualArabic !== item.arabic
                  ? item.contextualArabic
                  : "—"}
              </TableCell>
              <TableCell sx={latinCellSx}>{item.english || "—"}</TableCell>
              <TableCell sx={{ ...latinCellSx, textTransform: "capitalize" }}>{item.entry_type}</TableCell>
              <TableCell sx={arabicCellSx}>{item.root || "—"}</TableCell>
              <TableCell sx={latinCellSx}>{item.transliteration}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </TableContainer>
  )
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
  const includedCount = withDefinitions.filter(
    (item) => !excludedKeys.has(existingLemmaKey(item))
  ).length

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
                      sx={{
                        fontFamily: "Jost, sans-serif",
                        textTransform: "capitalize",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        py: 0.5,
                      }}
                    />
                    {item.cefr && (
                      <Chip
                        label={item.cefr}
                        sx={{
                          fontFamily: "Jost, sans-serif",
                          borderRadius: "8px",
                          fontSize: "1rem",
                          py: 0.5,
                        }}
                      />
                    )}
                    {item.arabic_root && (
                      <Chip
                        label={item.arabic_root}
                        sx={{
                          fontFamily: "'EB Garamond', serif",
                          borderRadius: "10px",
                          fontSize: "1.15rem",
                          py: 0.75,
                          px: 1,
                        }}
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
                        sx={{
                          fontFamily: "Jost, sans-serif",
                          borderRadius: "8px",
                          bgcolor: "#fff",
                          fontSize: "0.95rem",
                          py: 0.5,
                        }}
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
                sx={{
                  fontFamily: "'EB Garamond', serif",
                  borderRadius: "10px",
                  fontSize: "1.15rem",
                  py: 0.75,
                  px: 1,
                }}
              />
            )}
            <Chip
              label={row.source}
              sx={{
                fontFamily: "Jost, sans-serif",
                borderRadius: "10px",
                fontSize: "1.15rem",
                py: 0.75,
                px: 1,
              }}
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
            sx={{
              "& .MuiInputBase-input": { fontSize: "1.3rem", py: 1.5 },
              "& .MuiInputLabel-root": { fontSize: "1rem" },
            }}
          />
          <AdminTextField
            label="Part of speech *"
            value={row.part_of_speech}
            onChange={(e) => onChange(index, "part_of_speech", e.target.value)}
            fullWidth
            disabled={excluded}
            sx={{
              "& .MuiInputBase-input": { fontSize: "1.3rem", py: 1.5 },
              "& .MuiInputLabel-root": { fontSize: "1rem" },
            }}
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
            sx={{
              "& .MuiInputBase-input": { fontSize: "1.3rem", direction: "rtl", py: 1.5 },
              "& .MuiInputLabel-root": { fontSize: "1rem" },
            }}
          />
          <AdminTextField
            label="Lemma diacritic"
            value={row.lemma_diacritic}
            onChange={(e) => onChange(index, "lemma_diacritic", e.target.value)}
            fullWidth
            disabled={excluded}
            slotProps={{ input: { readOnly: true } }}
            sx={{
              "& .MuiInputBase-input": { fontSize: "1.6rem", direction: "rtl", py: 1.5 },
              "& .MuiInputLabel-root": { fontSize: "1rem" },
            }}
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
          sx={{
            "& .MuiInputBase-input": { fontSize: "1.25rem", py: 1.5 },
            "& .MuiInputLabel-root": { fontSize: "1rem" },
          }}
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
          sx={{
            "& .MuiInputBase-input": { fontSize: "1.45rem", direction: "rtl", py: 1.5 },
            "& .MuiInputLabel-root": { fontSize: "1rem" },
          }}
        />
      </Box>
    </Paper>
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
                  {expanded ? (
                    <ExpandLess sx={{ color: "#7a6e65" }} />
                  ) : (
                    <ExpandMore sx={{ color: "#7a6e65" }} />
                  )}
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
                              onChange={(e) =>
                                onChangeRow(key, "conjugation_diacritic", e.target.value)
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
                              label={row.type}
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
      if (item.cefr) row.CEFR = item.cefr
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
      if (item.cefr) row.CEFR = item.cefr
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
