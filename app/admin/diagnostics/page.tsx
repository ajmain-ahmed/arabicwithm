"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { Edit } from "@mui/icons-material"
import {
  computeDiagnostics,
  fetchDefinitionRows,
  fetchConjugationRows,
  fetchLemmaRows,
  updateDefinitionRow,
  updateConjugationRow,
  updateLemmaRow,
  updateConjugationLemmaForRoot,
  amendLemmaInAllEpisodes,
  type DiagnosticsResult,
  type TranscriptTokenRef,
  type DefinitionRow,
  type ConjugationRow,
  type LemmaRow,
} from "@/app/actions/admin"
import { updateDefinitionLemma } from "@/app/actions/dictionary"
import { errorMessage } from "@/app/lib/errors"
import { stripDiacritics } from "@/app/lib/arabic"
import InfoTooltip from "../components/InfoTooltip"
import UndefinedWordWizardDialog from "../components/UndefinedWordWizardDialog"
import EditRowDialog, { type EditField } from "../components/EditRowDialog"

const BARK = "#2c1a0e"
const GOLD = "#b8860b"
const MUTED = "#7a6e65"
const CREAM = "#f5ede0"
const DARK_GREEN = "#1B4D3E"

const headerSx = {
  fontFamily: "Jost, sans-serif",
  fontWeight: 700,
  fontSize: "0.85rem",
  color: MUTED,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
}

const cellSx = {
  fontFamily: "Jost, sans-serif",
  fontSize: "1rem",
  color: BARK,
}

const arabicCellSx = {
  fontFamily: "'EB Garamond', serif",
  fontSize: "1.4rem",
  color: BARK,
  direction: "rtl" as const,
}

function SectionTitle({ title, info }: { title: string; info: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Typography
        variant="h6"
        sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: BARK, fontSize: "1.5rem" }}
      >
        {title}
      </Typography>
      <InfoTooltip title={info} />
    </Box>
  )
}

function FilterField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Filter..."}
      size="small"
      sx={{
        minWidth: 280,
        "& .MuiInputBase-root": {
          fontFamily: "Jost, sans-serif",
          borderRadius: "10px",
          bgcolor: "#fff",
        },
      }}
    />
  )
}

export default function DiagnosticsPage() {
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null)
  const [definitions, setDefinitions] = useState<DefinitionRow[]>([])
  const [conjugations, setConjugations] = useState<ConjugationRow[]>([])
  const [lemmas, setLemmas] = useState<LemmaRow[]>([])

  const [defQuery, setDefQuery] = useState("")
  const [lemmaQuery, setLemmaQuery] = useState("")
  const [conjQuery, setConjQuery] = useState("")

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardToken, setWizardToken] = useState<TranscriptTokenRef | null>(null)

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [diag, defs, conjs, lems] = await Promise.all([
        computeDiagnostics(),
        fetchDefinitionRows(),
        fetchConjugationRows(),
        fetchLemmaRows(),
      ])
      setDiagnostics(diag)
      setDefinitions(defs)
      setConjugations(conjs)
      setLemmas(lems)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load diagnostics data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const filteredDefinitions = useMemo(() => {
    const q = defQuery.trim().toLowerCase()
    if (!q) return definitions
    return definitions.filter(
      (d) =>
        d.lemma.toLowerCase().includes(q) ||
        d.lemma_plain.toLowerCase().includes(q) ||
        (d.root?.toLowerCase().includes(q) ?? false) ||
        d.gloss.toLowerCase().includes(q) ||
        d.part_of_speech.toLowerCase().includes(q) ||
        (d.definition_en?.toLowerCase().includes(q) ?? false) ||
        (d.source?.toLowerCase().includes(q) ?? false)
    )
  }, [definitions, defQuery])

  const filteredLemmas = useMemo(() => {
    const q = lemmaQuery.trim().toLowerCase()
    if (!q) return lemmas
    return lemmas.filter(
      (l) =>
        l.lemma.toLowerCase().includes(q) ||
        l.lemma_plain.toLowerCase().includes(q) ||
        (l.root?.toLowerCase().includes(q) ?? false) ||
        l.entry_type.toLowerCase().includes(q) ||
        (l.source?.toLowerCase().includes(q) ?? false) ||
        (l.CEFR?.toLowerCase().includes(q) ?? false)
    )
  }, [lemmas, lemmaQuery])

  const filteredConjugations = useMemo(() => {
    const q = conjQuery.trim().toLowerCase()
    if (!q) return conjugations
    return conjugations.filter(
      (c) =>
        c.lemma.toLowerCase().includes(q) ||
        (c.root?.toLowerCase().includes(q) ?? false) ||
        c.type.toLowerCase().includes(q) ||
        c.conjugation_ar.toLowerCase().includes(q) ||
        (c.english_translation?.toLowerCase().includes(q) ?? false)
    )
  }, [conjugations, conjQuery])

  const openWizard = (token: TranscriptTokenRef) => {
    setWizardToken(token)
    setWizardOpen(true)
  }

  const closeWizard = () => {
    setWizardOpen(false)
    setWizardToken(null)
  }

  const handleUseCandidate = async (newLemma: string, newRoot?: string | null) => {
    if (!wizardToken) return
    await amendLemmaInAllEpisodes(wizardToken.lemma, wizardToken.root, newLemma, newRoot)
    await loadAll()
  }

  const handleUpdateDefinition = async (definitionId: number, newLemma: string, root: string | null) => {
    await updateDefinitionLemma({ definitionId, newLemma, root })
    await loadAll()
  }

  const handleUpdateLemma = async (wordId: number, newLemma: string) => {
    await updateLemmaRow({ wordId, lemma: newLemma })
    await loadAll()
  }

  const handleUpdateConjugationLemma = async (oldLemma: string, root: string | null, newLemma: string) => {
    await updateConjugationLemmaForRoot(oldLemma, root, newLemma)
    await loadAll()
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: BARK }}>
            Data Review
          </Typography>
          <InfoTooltip title="This page helps you find and fix mismatches between episode transcripts and the dictionary tables (lemmas, definitions, and conjugations). It also lets you browse and edit those tables directly." />
        </Box>
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: MUTED, fontSize: "1.05rem" }}>
          Check transcript words against the database, find unused rows, and edit definitions or conjugations inline.
        </Typography>
      </Box>

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

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="primary"
        indicatorColor="primary"
        sx={{ mb: 3 }}
      >
        <Tab
          label="Missing from database"
          sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "1rem" }}
        />
        <Tab
          label="Unused in transcripts"
          sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "1rem" }}
        />
        <Tab
          label="Definitions"
          sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "1rem" }}
        />
        <Tab
          label="Lemmas"
          sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "1rem" }}
        />
        <Tab
          label="Conjugations"
          sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "1rem" }}
        />
        <Tab
          label="Duplicates"
          sx={{ textTransform: "none", fontFamily: "Jost, sans-serif", fontWeight: 600, fontSize: "1rem" }}
        />
      </Tabs>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={40} sx={{ color: GOLD }} />
        </Box>
      )}

      {!loading && tab === 0 && diagnostics && (
        <MissingFromDbTab tokens={diagnostics.missingFromDb} onOpenWizard={openWizard} />
      )}

      {!loading && tab === 1 && diagnostics && (
        <UnusedInTranscriptsTab
          lemmas={diagnostics.unusedLemmas}
          definitions={diagnostics.unusedDefinitions}
          conjugations={diagnostics.unusedConjugations}
          onRefresh={loadAll}
        />
      )}

      {!loading && tab === 2 && (
        <DefinitionsTab rows={filteredDefinitions} query={defQuery} onQueryChange={setDefQuery} onRefresh={loadAll} />
      )}

      {!loading && tab === 3 && (
        <LemmasTab rows={filteredLemmas} query={lemmaQuery} onQueryChange={setLemmaQuery} onRefresh={loadAll} />
      )}

      {!loading && tab === 4 && (
        <ConjugationsTab rows={filteredConjugations} query={conjQuery} onQueryChange={setConjQuery} onRefresh={loadAll} />
      )}

      {!loading && tab === 5 && (
        <DuplicatesTab
          lemmas={lemmas}
          definitions={definitions}
          conjugations={conjugations}
          onRefresh={loadAll}
        />
      )}

      {wizardToken && (
        <UndefinedWordWizardDialog
          open={wizardOpen}
          onClose={closeWizard}
          lemma={wizardToken.lemma}
          root={wizardToken.root}
          surfaceArabic={wizardToken.surfaceArabic ?? undefined}
          pos={wizardToken.pos}
          cefr={wizardToken.cefr ?? undefined}
          missingTable={wizardToken.missingTable}
          locations={wizardToken.episodes.map((e) => ({
            path: e.path,
            timestamp: e.timestamp,
            translation: e.title,
            tokenJson: e.tokenJson,
            source: e.source,
          }))}
          source={wizardToken.episodes[0]?.source ?? null}
          onUseCandidate={handleUseCandidate}
          onUpdateDefinition={handleUpdateDefinition}
          onUpdateLemma={handleUpdateLemma}
          onUpdateConjugationLemma={handleUpdateConjugationLemma}
          onCommitConjugations={loadAll}
        />
      )}
    </Box>
  )
}

/* ── Missing from database tab ── */

function MissingFromDbTab({
  tokens,
  onOpenWizard,
}: {
  tokens: TranscriptTokenRef[]
  onOpenWizard: (token: TranscriptTokenRef) => void
}) {
  return (
    <Box>
      <SectionTitle
        title="Missing from database"
        info="These words appear in episode transcripts but are missing from one or more dictionary tables. A 'full match' means a row in vocab_lemmas, a row in vocab_definitions, and (for verbs) rows in verb_conjugations. Click 'Open wizard' to see candidate matches and fix the mismatch."
      />

      {tokens.length === 0 ? (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: MUTED, fontSize: "1.1rem" }}>
          All transcript words have matching dictionary rows.
        </Typography>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>Lemma</TableCell>
                  <TableCell sx={headerSx}>Root</TableCell>
                  <TableCell sx={headerSx}>POS</TableCell>
                  <TableCell sx={headerSx}>CEFR</TableCell>
                  <TableCell sx={headerSx}>Missing table</TableCell>
                  <TableCell sx={headerSx}>Episodes</TableCell>
                  <TableCell sx={headerSx}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tokens.map((token, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={arabicCellSx}>{token.lemma}</TableCell>
                    <TableCell>
                      {token.root ? (
                        <Chip label={token.root} sx={{ fontFamily: "'EB Garamond', serif", fontSize: "1rem", bgcolor: CREAM }} />
                      ) : (
                        <Typography sx={{ fontFamily: "Jost, sans-serif", color: MUTED }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={cellSx}>{token.pos}</TableCell>
                    <TableCell sx={cellSx}>{token.cefr?.toUpperCase() ?? "—"}</TableCell>
                    <TableCell sx={cellSx}>
                      <Chip
                        label={token.missingTable}
                        sx={{
                          fontFamily: "Jost, sans-serif",
                          fontSize: "0.85rem",
                          textTransform: "capitalize",
                          bgcolor:
                            token.missingTable === "definitions"
                              ? "rgba(192,57,43,0.1)"
                              : token.missingTable === "lemmas"
                                ? "rgba(184,134,11,0.12)"
                                : "rgba(27,77,62,0.1)",
                          color:
                            token.missingTable === "definitions"
                              ? "#c0392b"
                              : token.missingTable === "lemmas"
                                ? GOLD
                                : DARK_GREEN,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {token.episodes.slice(0, 3).map((ep, i) => (
                          <Typography key={i} sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.9rem", color: MUTED }}>
                            {ep.title} ({ep.slug}){ep.timestamp && ` · ${ep.timestamp}`}
                          </Typography>
                        ))}
                        {token.episodes.length > 3 && (
                          <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.85rem", color: MUTED }}>
                            +{token.episodes.length - 3} more
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        onClick={() => onOpenWizard(token)}
                        sx={{
                          background: DARK_GREEN,
                          color: "#fff",
                          fontFamily: "Jost, sans-serif",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          textTransform: "none",
                          borderRadius: "8px",
                          "&:hover": { background: "#143d30" },
                        }}
                      >
                        Open wizard
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}

/* ── Unused in transcripts tab ── */

function UnusedInTranscriptsTab({
  lemmas,
  definitions,
  conjugations,
  onRefresh,
}: {
  lemmas: LemmaRow[]
  definitions: DefinitionRow[]
  conjugations: ConjugationRow[]
  onRefresh: () => Promise<void>
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <SectionTitle
        title="Unused in transcripts"
        info="These rows exist in the dictionary tables but are never referenced by any episode transcript. They may be orphans from old content, or they may be reserved for future episodes. You can edit them inline or deactivate them if they are no longer needed."
      />

      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden", p: 3 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: BARK, mb: 2, fontSize: "1.3rem" }}
        >
          Unused lemmas ({lemmas.length})
        </Typography>
        <LemmaTable rows={lemmas} onRefresh={onRefresh} />
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden", p: 3 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: BARK, mb: 2, fontSize: "1.3rem" }}
        >
          Unused definitions ({definitions.length})
        </Typography>
        <DefinitionTable rows={definitions} onRefresh={onRefresh} />
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden", p: 3 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: BARK, mb: 2, fontSize: "1.3rem" }}
        >
          Unused conjugations ({conjugations.length})
        </Typography>
        <ConjugationTable rows={conjugations} onRefresh={onRefresh} />
      </Paper>
    </Box>
  )
}

/* ── Definitions tab ── */

function DefinitionsTab({
  rows,
  query,
  onQueryChange,
  onRefresh,
}: {
  rows: DefinitionRow[]
  query: string
  onQueryChange: (q: string) => void
  onRefresh: () => Promise<void>
}) {
  return (
    <Box>
      <SectionTitle
        title="Definitions table"
        info="This is the vocab_definitions table. Each row is a meaning (gloss) for an Arabic lemma. Click Edit to open a dialog where you can change fields in a form or edit the raw JSON."
      />
      <Box sx={{ mb: 2 }}>
        <FilterField value={query} onChange={onQueryChange} placeholder="Search definitions..." />
      </Box>
      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden", p: 3 }}>
        <DefinitionTable rows={rows} onRefresh={onRefresh} />
      </Paper>
    </Box>
  )
}

/* ── Lemmas tab ── */

function LemmasTab({
  rows,
  query,
  onQueryChange,
  onRefresh,
}: {
  rows: LemmaRow[]
  query: string
  onQueryChange: (q: string) => void
  onRefresh: () => Promise<void>
}) {
  return (
    <Box>
      <SectionTitle
        title="Lemmas table"
        info="This is the vocab_lemmas table. Each row is a canonical Arabic lemma linked to its root, CEFR level, and entry type. Click Edit to open a dialog where you can change fields in a form or edit the raw JSON."
      />
      <Box sx={{ mb: 2 }}>
        <FilterField value={query} onChange={onQueryChange} placeholder="Search lemmas..." />
      </Box>
      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden", p: 3 }}>
        <LemmaTable rows={rows} onRefresh={onRefresh} />
      </Paper>
    </Box>
  )
}

/* ── Conjugations tab ── */

function ConjugationsTab({
  rows,
  query,
  onQueryChange,
  onRefresh,
}: {
  rows: ConjugationRow[]
  query: string
  onQueryChange: (q: string) => void
  onRefresh: () => Promise<void>
}) {
  return (
    <Box>
      <SectionTitle
        title="Conjugations table"
        info="This is the verb_conjugations table. Each row is a verb form (past, present, imperative, etc.) for a lemma. Click Edit to open a dialog where you can change fields in a form or edit the raw JSON."
      />
      <Box sx={{ mb: 2 }}>
        <FilterField value={query} onChange={onQueryChange} placeholder="Search conjugations..." />
      </Box>
      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden", p: 3 }}>
        <ConjugationTable rows={rows} onRefresh={onRefresh} />
      </Paper>
    </Box>
  )
}

/* ── Editable tables ── */

const lemmaFields: EditField[] = [
  { key: "lemma", label: "Lemma", type: "text", arabic: true, required: true },
  { key: "transliteration", label: "Transliteration", type: "text" },
  { key: "cefr", label: "CEFR", type: "text" },
  {
    key: "entryType",
    label: "Entry type",
    type: "select",
    options: [
      { value: "word", label: "word" },
      { value: "phrase", label: "phrase" },
    ],
  },
  { key: "isActive", label: "Active", type: "boolean" },
]

const definitionFields: EditField[] = [
  { key: "gloss", label: "Gloss", type: "text", required: true },
  { key: "partOfSpeech", label: "Part of speech", type: "text", required: true },
  { key: "definitionEn", label: "Definition EN", type: "textarea" },
  { key: "definitionAr", label: "Definition AR", type: "textarea", arabic: true },
  { key: "isActive", label: "Active", type: "boolean" },
]

const conjugationFields: EditField[] = [
  { key: "conjugationAr", label: "Conjugation AR", type: "text", arabic: true, required: true },
  { key: "conjugationDiacritic", label: "Conjugation diacritic", type: "text", arabic: true, required: true },
  { key: "transliteration", label: "Transliteration", type: "text" },
  { key: "englishTranslation", label: "English translation", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
]

function LemmaTable({ rows, onRefresh }: { rows: LemmaRow[]; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<LemmaRow | null>(null)

  const handleSave = async (values: Record<string, string | boolean>) => {
    if (!editing) return
    await updateLemmaRow({
      wordId: editing.word_id,
      lemma: String(values.lemma),
      transliteration: values.transliteration ? String(values.transliteration) : undefined,
      cefr: values.cefr ? String(values.cefr) : undefined,
      entryType: values.entryType as "word" | "phrase",
      isActive: Boolean(values.isActive),
    })
    await onRefresh()
    setEditing(null)
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerSx}>ID</TableCell>
              <TableCell sx={headerSx}>Lemma</TableCell>
              <TableCell sx={headerSx}>Lemma plain</TableCell>
              <TableCell sx={headerSx}>Root</TableCell>
              <TableCell sx={headerSx}>Type</TableCell>
              <TableCell sx={headerSx}>CEFR</TableCell>
              <TableCell sx={headerSx}>Active</TableCell>
              <TableCell sx={headerSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.word_id} hover>
                <TableCell sx={cellSx}>{row.word_id}</TableCell>
                <TableCell sx={arabicCellSx}>{row.lemma}</TableCell>
                <TableCell sx={arabicCellSx}>{row.lemma_plain}</TableCell>
                <TableCell sx={cellSx}>{row.root ?? "—"}</TableCell>
                <TableCell sx={cellSx}>{row.entry_type}</TableCell>
                <TableCell sx={cellSx}>{row.CEFR ?? "—"}</TableCell>
                <TableCell sx={cellSx}>{row.is_active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => setEditing(row)}
                    sx={{ fontFamily: "Jost, sans-serif", textTransform: "none" }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {editing && (
        <EditRowDialog
          open={Boolean(editing)}
          title={`Edit lemma #${editing.word_id}`}
          fields={lemmaFields}
          initialValues={{
            lemma: editing.lemma,
            transliteration: editing.transliteration ?? "",
            cefr: editing.CEFR ?? "",
            entryType: editing.entry_type,
            isActive: editing.is_active,
          }}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

function DefinitionTable({ rows, onRefresh }: { rows: DefinitionRow[]; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<DefinitionRow | null>(null)

  const handleSave = async (values: Record<string, string | boolean>) => {
    if (!editing) return
    await updateDefinitionRow({
      definitionId: editing.definition_id,
      gloss: String(values.gloss),
      partOfSpeech: String(values.partOfSpeech),
      definitionEn: String(values.definitionEn),
      definitionAr: String(values.definitionAr),
      isActive: Boolean(values.isActive),
    })
    await onRefresh()
    setEditing(null)
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerSx}>ID</TableCell>
              <TableCell sx={headerSx}>Lemma</TableCell>
              <TableCell sx={headerSx}>Lemma plain</TableCell>
              <TableCell sx={headerSx}>Root</TableCell>
              <TableCell sx={headerSx}>POS</TableCell>
              <TableCell sx={headerSx}>Gloss</TableCell>
              <TableCell sx={headerSx}>Definition EN</TableCell>
              <TableCell sx={headerSx}>Definition AR</TableCell>
              <TableCell sx={headerSx}>Active</TableCell>
              <TableCell sx={headerSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.definition_id} hover>
                <TableCell sx={cellSx}>{row.definition_id}</TableCell>
                <TableCell sx={arabicCellSx}>{row.lemma}</TableCell>
                <TableCell sx={arabicCellSx}>{row.lemma_plain}</TableCell>
                <TableCell sx={cellSx}>{row.root ?? "—"}</TableCell>
                <TableCell sx={cellSx}>{row.part_of_speech}</TableCell>
                <TableCell sx={cellSx}>{row.gloss}</TableCell>
                <TableCell sx={cellSx}>{row.definition_en ?? "—"}</TableCell>
                <TableCell sx={arabicCellSx}>{row.definition_ar ?? "—"}</TableCell>
                <TableCell sx={cellSx}>{row.is_active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => setEditing(row)}
                    sx={{ fontFamily: "Jost, sans-serif", textTransform: "none" }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {editing && (
        <EditRowDialog
          open={Boolean(editing)}
          title={`Edit definition #${editing.definition_id}`}
          fields={definitionFields}
          initialValues={{
            gloss: editing.gloss,
            partOfSpeech: editing.part_of_speech,
            definitionEn: editing.definition_en ?? "",
            definitionAr: editing.definition_ar ?? "",
            isActive: editing.is_active,
          }}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

function ConjugationTable({ rows, onRefresh }: { rows: ConjugationRow[]; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<ConjugationRow | null>(null)

  const handleSave = async (values: Record<string, string | boolean>) => {
    if (!editing) return
    await updateConjugationRow({
      conjugationId: editing.conjugation_id,
      conjugationAr: String(values.conjugationAr),
      conjugationDiacritic: String(values.conjugationDiacritic),
      transliteration: String(values.transliteration),
      englishTranslation: String(values.englishTranslation),
      isActive: Boolean(values.isActive),
    })
    await onRefresh()
    setEditing(null)
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerSx}>ID</TableCell>
              <TableCell sx={headerSx}>Lemma</TableCell>
              <TableCell sx={headerSx}>Root</TableCell>
              <TableCell sx={headerSx}>Type</TableCell>
              <TableCell sx={headerSx}>Form</TableCell>
              <TableCell sx={headerSx}>Conjugation AR</TableCell>
              <TableCell sx={headerSx}>Conjugation diacritic</TableCell>
              <TableCell sx={headerSx}>Transliteration</TableCell>
              <TableCell sx={headerSx}>English</TableCell>
              <TableCell sx={headerSx}>Active</TableCell>
              <TableCell sx={headerSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.conjugation_id} hover>
                <TableCell sx={cellSx}>{row.conjugation_id}</TableCell>
                <TableCell sx={arabicCellSx}>{row.lemma}</TableCell>
                <TableCell sx={cellSx}>{row.root ?? "—"}</TableCell>
                <TableCell sx={cellSx}>{row.type}</TableCell>
                <TableCell sx={cellSx}>{row.form_number ?? "—"}</TableCell>
                <TableCell sx={arabicCellSx}>{row.conjugation_ar}</TableCell>
                <TableCell sx={arabicCellSx}>{row.conjugation_diacritic}</TableCell>
                <TableCell sx={cellSx}>{row.transliteration ?? "—"}</TableCell>
                <TableCell sx={cellSx}>{row.english_translation ?? "—"}</TableCell>
                <TableCell sx={cellSx}>{row.is_active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => setEditing(row)}
                    sx={{ fontFamily: "Jost, sans-serif", textTransform: "none" }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {editing && (
        <EditRowDialog
          open={Boolean(editing)}
          title={`Edit conjugation #${editing.conjugation_id}`}
          fields={conjugationFields}
          initialValues={{
            conjugationAr: editing.conjugation_ar,
            conjugationDiacritic: editing.conjugation_diacritic,
            transliteration: editing.transliteration ?? "",
            englishTranslation: editing.english_translation ?? "",
            isActive: editing.is_active,
          }}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

/* ── Duplicates tab ── */

type DuplicateGroup<T> = {
  key: string
  plain: string
  root: string | null
  kind: string
  items: T[]
}

function groupByPlainForm<T>(
  items: T[],
  getLemma: (item: T) => string,
  getRoot: (item: T) => string | null,
  getKind: (item: T) => string
): DuplicateGroup<T>[] {
  const map = new Map<string, { plain: string; root: string | null; kind: string; items: T[] }>()
  for (const item of items) {
    const lemma = getLemma(item)
    const root = getRoot(item)
    const kind = getKind(item)
    const plain = stripDiacritics(lemma)
    const key = `${plain}|${root ?? ""}|${kind}`
    const existing = map.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      map.set(key, { plain, root, kind, items: [item] })
    }
  }
  return Array.from(map.entries())
    .filter(([, group]) => {
      const distinct = new Set(group.items.map(getLemma))
      return distinct.size > 1
    })
    .map(([key, group]) => ({ ...group, key }))
    .sort((a, b) => a.plain.localeCompare(b.plain))
}

function DuplicatesTab({
  lemmas,
  definitions,
  conjugations,
  onRefresh,
}: {
  lemmas: LemmaRow[]
  definitions: DefinitionRow[]
  conjugations: ConjugationRow[]
  onRefresh: () => Promise<void>
}) {
  const [editingLemma, setEditingLemma] = useState<LemmaRow | null>(null)
  const [editingDefinition, setEditingDefinition] = useState<DefinitionRow | null>(null)
  const [editingConjugation, setEditingConjugation] = useState<ConjugationRow | null>(null)

  const lemmaGroups = useMemo(
    () =>
      groupByPlainForm(
        lemmas,
        (l) => l.lemma,
        (l) => l.root,
        (l) => l.entry_type
      ),
    [lemmas]
  )

  const definitionGroups = useMemo(
    () =>
      groupByPlainForm(
        definitions,
        (d) => d.lemma,
        (d) => d.root,
        (d) => d.part_of_speech
      ),
    [definitions]
  )

  const conjugationGroups = useMemo(
    () =>
      groupByPlainForm(
        conjugations,
        (c) => c.lemma,
        (c) => c.root,
        (c) => c.type
      ),
    [conjugations]
  )

  const handleSaveLemma = async (values: Record<string, string | boolean>) => {
    if (!editingLemma) return
    await updateLemmaRow({
      wordId: editingLemma.word_id,
      lemma: String(values.lemma),
      transliteration: values.transliteration ? String(values.transliteration) : undefined,
      cefr: values.cefr ? String(values.cefr) : undefined,
      entryType: values.entryType as "word" | "phrase",
      isActive: Boolean(values.isActive),
    })
    await onRefresh()
    setEditingLemma(null)
  }

  const handleSaveDefinition = async (values: Record<string, string | boolean>) => {
    if (!editingDefinition) return
    await updateDefinitionRow({
      definitionId: editingDefinition.definition_id,
      gloss: String(values.gloss),
      partOfSpeech: String(values.partOfSpeech),
      definitionEn: String(values.definitionEn),
      definitionAr: String(values.definitionAr),
      isActive: Boolean(values.isActive),
    })
    await onRefresh()
    setEditingDefinition(null)
  }

  const handleSaveConjugation = async (values: Record<string, string | boolean>) => {
    if (!editingConjugation) return
    await updateConjugationRow({
      conjugationId: editingConjugation.conjugation_id,
      conjugationAr: String(values.conjugationAr),
      conjugationDiacritic: String(values.conjugationDiacritic),
      transliteration: String(values.transliteration),
      englishTranslation: String(values.englishTranslation),
      isActive: Boolean(values.isActive),
    })
    await onRefresh()
    setEditingConjugation(null)
  }

  const totalGroups = lemmaGroups.length + definitionGroups.length + conjugationGroups.length

  return (
    <Box>
      <SectionTitle
        title="Potential duplicates"
        info="Groups rows whose plain (diacritic-free) lemma is the same but whose diacritized forms differ. These are often spelling inconsistencies, not true different words. Root and type/part-of-speech are included in the grouping key so homonyms from different roots are not flagged."
      />

      {totalGroups === 0 && (
        <Typography sx={{ fontFamily: "Jost, sans-serif", color: MUTED, fontSize: "1rem" }}>
          No potential duplicates found.
        </Typography>
      )}

      {lemmaGroups.length > 0 && (
        <DuplicateGroupSection title={`Lemma duplicates (${lemmaGroups.length})`}>
          {lemmaGroups.map((group) => (
            <DuplicateTable
              key={group.key}
              group={group}
              columns={[
                { key: "word_id", label: "ID", cellSx: cellSx },
                { key: "lemma", label: "Lemma", cellSx: arabicCellSx },
                { key: "lemma_plain", label: "Lemma plain", cellSx: arabicCellSx },
                { key: "root", label: "Root", cellSx: cellSx },
                { key: "entry_type", label: "Type", cellSx: cellSx },
                { key: "CEFR", label: "CEFR", cellSx: cellSx },
                { key: "source", label: "Source", cellSx: cellSx },
              ]}
              rows={group.items}
              onEdit={setEditingLemma}
            />
          ))}
        </DuplicateGroupSection>
      )}

      {definitionGroups.length > 0 && (
        <DuplicateGroupSection title={`Definition duplicates (${definitionGroups.length})`}>
          {definitionGroups.map((group) => (
            <DuplicateTable
              key={group.key}
              group={group}
              columns={[
                { key: "definition_id", label: "ID", cellSx: cellSx },
                { key: "lemma", label: "Lemma", cellSx: arabicCellSx },
                { key: "lemma_plain", label: "Lemma plain", cellSx: arabicCellSx },
                { key: "root", label: "Root", cellSx: cellSx },
                { key: "part_of_speech", label: "POS", cellSx: cellSx },
                { key: "gloss", label: "Gloss", cellSx: cellSx },
                { key: "source", label: "Source", cellSx: cellSx },
              ]}
              rows={group.items}
              onEdit={setEditingDefinition}
            />
          ))}
        </DuplicateGroupSection>
      )}

      {conjugationGroups.length > 0 && (
        <DuplicateGroupSection title={`Conjugation duplicates (${conjugationGroups.length})`}>
          {conjugationGroups.map((group) => (
            <DuplicateTable
              key={group.key}
              group={group}
              columns={[
                { key: "conjugation_id", label: "ID", cellSx: cellSx },
                { key: "lemma", label: "Lemma", cellSx: arabicCellSx },
                { key: "root", label: "Root", cellSx: cellSx },
                { key: "type", label: "Type", cellSx: cellSx },
                { key: "form_number", label: "Form", cellSx: cellSx },
                { key: "source", label: "Source", cellSx: cellSx },
              ]}
              rows={group.items}
              onEdit={setEditingConjugation}
            />
          ))}
        </DuplicateGroupSection>
      )}

      {editingLemma && (
        <EditRowDialog
          open={Boolean(editingLemma)}
          title={`Edit lemma #${editingLemma.word_id}`}
          fields={lemmaFields}
          initialValues={{
            lemma: editingLemma.lemma,
            transliteration: editingLemma.transliteration ?? "",
            cefr: editingLemma.CEFR ?? "",
            entryType: editingLemma.entry_type,
            isActive: editingLemma.is_active,
          }}
          onClose={() => setEditingLemma(null)}
          onSave={handleSaveLemma}
        />
      )}

      {editingDefinition && (
        <EditRowDialog
          open={Boolean(editingDefinition)}
          title={`Edit definition #${editingDefinition.definition_id}`}
          fields={definitionFields}
          initialValues={{
            gloss: editingDefinition.gloss,
            partOfSpeech: editingDefinition.part_of_speech,
            definitionEn: editingDefinition.definition_en ?? "",
            definitionAr: editingDefinition.definition_ar ?? "",
            isActive: editingDefinition.is_active,
          }}
          onClose={() => setEditingDefinition(null)}
          onSave={handleSaveDefinition}
        />
      )}

      {editingConjugation && (
        <EditRowDialog
          open={Boolean(editingConjugation)}
          title={`Edit conjugation #${editingConjugation.conjugation_id}`}
          fields={conjugationFields}
          initialValues={{
            lemma: editingConjugation.lemma,
            root: editingConjugation.root ?? "",
            formNumber: editingConjugation.form_number ?? "",
            type: editingConjugation.type,
            conjugationAr: editingConjugation.conjugation_ar,
            conjugationDiacritic: editingConjugation.conjugation_diacritic,
            transliteration: editingConjugation.transliteration ?? "",
            englishTranslation: editingConjugation.english_translation ?? "",
            isActive: editingConjugation.is_active,
          }}
          onClose={() => setEditingConjugation(null)}
          onSave={handleSaveConjugation}
        />
      )}
    </Box>
  )
}

function DuplicateGroupSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: "1.3rem",
          fontWeight: 700,
          color: BARK,
          mb: 2,
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function DuplicateTable<T>({
  group,
  columns,
  rows,
  onEdit,
}: {
  group: DuplicateGroup<T>
  columns: { key: string; label: string; cellSx: object; arabic?: boolean }[]
  rows: T[]
  onEdit: (row: T) => void
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: "12px", bgcolor: "#fff" }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.95rem", color: MUTED }}>
          Plain form: <strong>{group.plain}</strong> · Root: <strong>{group.root ?? "—"}</strong> · Kind: <strong>{group.kind}</strong>
        </Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} sx={headerSx}>
                  {col.label}
                </TableCell>
              ))}
              <TableCell sx={headerSx}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx} hover>
                {columns.map((col) => (
                  <TableCell key={col.key} sx={col.cellSx}>
                    {(row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => onEdit(row)}
                    sx={{ fontFamily: "Jost, sans-serif", textTransform: "none" }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
