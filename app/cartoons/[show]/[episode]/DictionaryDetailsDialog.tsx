'use client'

import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Edit, Save, Code } from '@mui/icons-material'
import {
  fetchDictionaryDetails,
  updateVocabDefinition,
  updateVocabLemma,
  addUserVocabDefinition,
  saveDictionaryDetailsFromJson,
  type DictionaryDetailsResult,
} from '@/app/actions/dictionary'
import { stripDiacritics } from '@/app/lib/arabic'
import { formatCefr, formatPos, formatConjugationType } from '@/app/lib/display'
import { useAuth } from '@/app/AuthContext'
import type { CartoonWordEntry } from '@/app/lib/cartoons'

const DARK_GREEN = '#1B4D3E'
const GOLD = '#D4AF37'
const OFF_WHITE = '#FAFAF8'
const CREAM = '#F5F3EE'
const TEXT_DARK = '#1F2937'
const TEXT_MUTED = '#6B7280'

const TYPE_ORDER: Record<string, number> = {
  past: 1,
  present: 2,
  imperative: 3,
  verbal_noun: 4,
  active_participle: 5,
  passive_participle: 6,
}

function sortType(a: string, b: string): number {
  const orderA = TYPE_ORDER[a] ?? 99
  const orderB = TYPE_ORDER[b] ?? 99
  if (orderA !== orderB) return orderA - orderB
  return a.localeCompare(b)
}

function displayArabic(text: string, showDiacritics: boolean) {
  return showDiacritics ? text : stripDiacritics(text)
}

function buildAdminEditPayload(data: DictionaryDetailsResult) {
  return {
    lemma: data.lemma,
    root: data.root,
    lemmas: data.lemmas.map((l) => ({
      word_id: l.word_id,
      transliteration: l.transliteration,
      CEFR: l.CEFR,
    })),
    definitions: data.definitions.map((d) => ({
      definition_id: d.definition_id,
      gloss: d.gloss,
      part_of_speech: d.part_of_speech,
      definition_en: d.definition_en,
      definition_ar: d.definition_ar,
    })),
  }
}

function buildUserAddPayload(data: DictionaryDetailsResult, surfaceArabic: string | null | undefined) {
  const lemma = data.lemmas[0]?.lemma ?? surfaceArabic ?? data.lemma
  const primaryDef = data.definitions[0]
  return {
    lemma,
    root: data.root,
    transliteration: data.lemmas[0]?.transliteration ?? null,
    CEFR: data.lemmas[0]?.CEFR ?? null,
    gloss: primaryDef?.gloss ?? null,
    part_of_speech: primaryDef?.part_of_speech ?? null,
    definition_en: primaryDef?.definition_en ?? null,
    definition_ar: primaryDef?.definition_ar ?? null,
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: GOLD,
        mb: 1,
      }}
    >
      {children}
    </Typography>
  )
}

export default function DictionaryDetailsDialog({
  open,
  onClose,
  lemma,
  root,
  surfaceArabic,
  transcriptEntry,
  showDiacritics = true,
  isAdmin = false,
}: {
  open: boolean
  onClose: () => void
  lemma: string | undefined | null
  root: string | undefined | null
  surfaceArabic?: string | null
  transcriptEntry?: CartoonWordEntry | null
  showDiacritics?: boolean
  isAdmin?: boolean
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [data, setData] = useState<DictionaryDetailsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'word' | 'conjugations'>('word')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui')
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const [editTransliteration, setEditTransliteration] = useState('')
  const [editCefr, setEditCefr] = useState('')
  const [editGloss, setEditGloss] = useState('')
  const [editPartOfSpeech, setEditPartOfSpeech] = useState('')
  const [editDefinitions, setEditDefinitions] = useState<
    { definitionId: number; definitionEn: string; definitionAr: string }[]
  >([])

  const { user } = useAuth()
  const canAdminEdit = isAdmin && data !== null && data.definitions.length > 0
  const canUserAdd = !!user && !isAdmin && data !== null && data.definitions.length === 0
  const canEdit = canAdminEdit || canUserAdd

  const loading = open && !!lemma && data === null && error === null

  useEffect(() => {
    if (!open || !lemma) return
    let cancelled = false
    fetchDictionaryDetails(lemma, root ?? null, surfaceArabic ?? undefined)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load details'
          setError(message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, lemma, root, surfaceArabic])

  const startEditing = () => {
    if (!data) return
    setEditTransliteration(data.lemmas[0]?.transliteration ?? '')
    setEditCefr(data.lemmas[0]?.CEFR ?? '')
    setEditGloss(data.definitions[0]?.gloss ?? '')
    setEditPartOfSpeech(data.definitions[0]?.part_of_speech ?? '')
    setEditDefinitions(
      data.definitions.length > 0
        ? data.definitions.map((d) => ({
            definitionId: d.definition_id,
            definitionEn: d.definition_en ?? '',
            definitionAr: d.definition_ar ?? '',
          }))
        : [{ definitionId: 0, definitionEn: '', definitionAr: '' }]
    )
    setIsEditing(true)
    if (viewMode === 'json') {
      const payload = canAdminEdit
        ? buildAdminEditPayload(data)
        : buildUserAddPayload(data, surfaceArabic)
      setJsonValue(JSON.stringify(payload, null, 2))
      setJsonError(null)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setJsonError(null)
    if (viewMode === 'json' && data) {
      setJsonValue(JSON.stringify(data, null, 2))
    }
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      if (viewMode === 'json') {
        await saveDictionaryDetailsFromJson(jsonValue)
      } else if (canAdminEdit && primaryLemma && primaryDefinition) {
        const lemmaId = primaryLemma.word_id
        await updateVocabLemma({
          wordId: lemmaId,
          transliteration: editTransliteration,
          cefr: editCefr,
        })
        await updateVocabDefinition({
          definitionId: primaryDefinition.definition_id,
          gloss: editGloss,
        })
        for (const def of editDefinitions) {
          await updateVocabDefinition({
            definitionId: def.definitionId,
            definitionEn: def.definitionEn,
            definitionAr: def.definitionAr,
          })
        }
      } else {
        const def = editDefinitions[0] ?? { definitionEn: '', definitionAr: '' }
        await addUserVocabDefinition({
          lemma: displayWord,
          root: data.root,
          transliteration: editTransliteration,
          cefr: editCefr,
          gloss: editGloss,
          partOfSpeech: editPartOfSpeech,
          definitionEn: def.definitionEn,
          definitionAr: def.definitionAr,
        })
      }
      // Refresh data
      const refreshed = await fetchDictionaryDetails(
        data.lemma,
        data.root,
        surfaceArabic ?? undefined
      )
      setData(refreshed)
      setIsEditing(false)
      setJsonError(null)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save'
      if (viewMode === 'json') {
        setJsonError(message)
      } else {
        setError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const hasConjugations = data ? data.conjugations.length > 0 : false
  const primaryLemma = data?.lemmas[0]
  const primaryDefinition = data?.definitions[0]
  const displayWord = surfaceArabic ?? transcriptEntry?.arabic ?? lemma ?? ''
  const cefr = transcriptEntry?.cefr ?? primaryLemma?.CEFR ?? null
  const partOfSpeech = transcriptEntry?.pos ?? primaryDefinition?.part_of_speech ?? null
  const transliteration = transcriptEntry?.transliteration ?? primaryLemma?.transliteration ?? null
  const primaryGloss = transcriptEntry?.english ?? primaryDefinition?.gloss ?? primaryDefinition?.definition_en ?? null

  const buildJsonFromEditState = React.useCallback(() => {
    if (!data) return {}
    if (canAdminEdit) {
      return {
        lemma: data.lemma,
        root: data.root,
        lemmas: data.lemmas.map((l) => ({
          word_id: l.word_id,
          transliteration: l.word_id === primaryLemma?.word_id ? editTransliteration : l.transliteration,
          CEFR: l.word_id === primaryLemma?.word_id ? editCefr : l.CEFR,
        })),
        definitions: editDefinitions.map((def) => ({
          definition_id: def.definitionId,
          gloss: def.definitionId === primaryDefinition?.definition_id ? editGloss : undefined,
          part_of_speech: def.definitionId === primaryDefinition?.definition_id ? editPartOfSpeech : undefined,
          definition_en: def.definitionEn,
          definition_ar: def.definitionAr,
        })),
      }
    }
    if (canUserAdd) {
      const def = editDefinitions[0] ?? { definitionEn: '', definitionAr: '' }
      return {
        lemma: data.lemmas[0]?.lemma ?? surfaceArabic ?? data.lemma,
        root: data.root,
        transliteration: editTransliteration,
        CEFR: editCefr,
        gloss: editGloss,
        part_of_speech: editPartOfSpeech,
        definition_en: def.definitionEn,
        definition_ar: def.definitionAr,
      }
    }
    return {}
  }, [
    data,
    canAdminEdit,
    canUserAdd,
    primaryLemma,
    primaryDefinition,
    editTransliteration,
    editCefr,
    editGloss,
    editPartOfSpeech,
    editDefinitions,
    surfaceArabic,
  ])

  const applyJsonToForm = React.useCallback(() => {
    if (!data) return true
    try {
      const parsed = JSON.parse(jsonValue)
      if (canAdminEdit) {
        const payload = parsed as {
          lemmas?: { word_id: number; transliteration?: string | null; CEFR?: string | null }[]
          definitions?: {
            definition_id: number
            gloss?: string | null
            part_of_speech?: string | null
            definition_en?: string | null
            definition_ar?: string | null
          }[]
        }
        const lemmaUpdate = payload.lemmas?.find((l) => l.word_id === primaryLemma?.word_id)
        if (lemmaUpdate) {
          setEditTransliteration(lemmaUpdate.transliteration ?? '')
          setEditCefr(lemmaUpdate.CEFR ?? '')
        }
        const definitionsUpdate = payload.definitions ?? []
        setEditDefinitions((prev) =>
          prev.map((def) => {
            const updated = definitionsUpdate.find((d) => d.definition_id === def.definitionId)
            if (!updated) return def
            return {
              definitionId: def.definitionId,
              definitionEn: updated.definition_en ?? '',
              definitionAr: updated.definition_ar ?? '',
            }
          })
        )
        const primaryDefUpdate = definitionsUpdate.find(
          (d) => d.definition_id === primaryDefinition?.definition_id
        )
        if (primaryDefUpdate) {
          setEditGloss(primaryDefUpdate.gloss ?? '')
          setEditPartOfSpeech(primaryDefUpdate.part_of_speech ?? '')
        }
      } else if (canUserAdd) {
        const payload = parsed as {
          transliteration?: string | null
          CEFR?: string | null
          gloss?: string | null
          part_of_speech?: string | null
          definition_en?: string | null
          definition_ar?: string | null
        }
        setEditTransliteration(payload.transliteration ?? '')
        setEditCefr(payload.CEFR ?? '')
        setEditGloss(payload.gloss ?? '')
        setEditPartOfSpeech(payload.part_of_speech ?? '')
        setEditDefinitions([
          { definitionId: 0, definitionEn: payload.definition_en ?? '', definitionAr: payload.definition_ar ?? '' },
        ])
      }
      setJsonError(null)
      return true
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
      return false
    }
  }, [jsonValue, data, canAdminEdit, canUserAdd, primaryLemma, primaryDefinition])

  const getJsonPayload = React.useCallback(() => {
    if (!data) return {}
    if (isEditing) return buildJsonFromEditState()
    return data
  }, [data, isEditing, buildJsonFromEditState])

  const toggleViewMode = () => {
    if (!data) return
    if (viewMode === 'ui') {
      setJsonValue(JSON.stringify(getJsonPayload(), null, 2))
      setJsonError(null)
      setViewMode('json')
    } else {
      if (isEditing) {
        const ok = applyJsonToForm()
        if (!ok) return
      }
      setViewMode('ui')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : '20px',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(44,26,14,0.22)',
            m: isMobile ? 0 : 3,
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: OFF_WHITE,
          },
        },
      }}
    >
      {viewMode === 'ui' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: `2px solid ${CREAM}`,
            bgcolor: OFF_WHITE,
          }}
        >
          <Box
            onClick={() => setActiveTab('word')}
            sx={{
              flex: 1,
              textAlign: 'center',
              px: 3,
              py: 1.5,
              cursor: 'pointer',
              borderBottom: activeTab === 'word' ? `2px solid ${DARK_GREEN}` : '2px solid transparent',
              mb: '-2px',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.95rem',
                fontWeight: activeTab === 'word' ? 700 : 600,
                letterSpacing: '0.06em',
                color: activeTab === 'word' ? DARK_GREEN : TEXT_MUTED,
                textTransform: 'uppercase',
              }}
            >
              Word
            </Typography>
          </Box>
          {hasConjugations && (
            <Box
              onClick={() => setActiveTab('conjugations')}
              sx={{
                flex: 1,
                textAlign: 'center',
                px: 3,
                py: 1.5,
                cursor: 'pointer',
                borderBottom: activeTab === 'conjugations' ? `2px solid ${DARK_GREEN}` : '2px solid transparent',
                mb: '-2px',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.95rem',
                  fontWeight: activeTab === 'conjugations' ? 700 : 600,
                  letterSpacing: '0.06em',
                  color: activeTab === 'conjugations' ? DARK_GREEN : TEXT_MUTED,
                  textTransform: 'uppercase',
                }}
              >
                Conjugations
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          overflowY: 'auto',
          px: { xs: 2.5, sm: 3.5 },
          py: { xs: 3, sm: 4 },
          bgcolor: OFF_WHITE,
        }}
      >
        {loading && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.15rem', color: TEXT_MUTED }}>
              Loading word…
            </Typography>
          </Box>
        )}

        {error && (
          <Box
            sx={{
              py: 3,
              px: 3,
              textAlign: 'center',
              background: 'rgba(198,40,40,0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(198,40,40,0.15)',
            }}
          >
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.15rem', color: '#c62828' }}>
              {error}
            </Typography>
          </Box>
        )}

        {!loading && !error && !lemma && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.15rem', color: TEXT_MUTED }}>
              No word selected.
            </Typography>
          </Box>
        )}

        {!loading && !error && data && viewMode === 'json' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {jsonError && (
              <Box
                sx={{
                  py: 2,
                  px: 2.5,
                  background: 'rgba(198,40,40,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(198,40,40,0.15)',
                }}
              >
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#c62828' }}>
                  {jsonError}
                </Typography>
              </Box>
            )}
            <TextField
              multiline
              fullWidth
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              disabled={!isEditing}
              placeholder={isEditing ? 'Edit the JSON payload…' : 'Read-only JSON view'}
              slotProps={{
                htmlInput: {
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  },
                },
              }}
              sx={{
                '& .MuiInputBase-root': {
                  bgcolor: '#fff',
                  borderRadius: '14px',
                  p: '1.25rem',
                  alignItems: 'flex-start',
                  minHeight: 320,
                },
              }}
            />
            {!isEditing && (
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: TEXT_MUTED }}>
                Read-only JSON view. Click <strong>Edit</strong> to modify.
              </Typography>
            )}
          </Box>
        )}

        {!loading && !error && data && viewMode === 'ui' && activeTab === 'word' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Arabic headline */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: '2.75rem',
                  fontWeight: 700,
                  color: DARK_GREEN,
                  direction: 'rtl',
                  lineHeight: 1.3,
                }}
              >
                {displayArabic(displayWord, showDiacritics)}
              </Typography>

              {root && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                    mt: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: GOLD,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {root}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Reading */}
            {(transliteration || isEditing) && (
              <Box>
                <SectionTitle>Reading</SectionTitle>
                {isEditing ? (
                  <TextField
                    value={editTransliteration}
                    onChange={(e) => setEditTransliteration(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Transliteration"
                    sx={{
                      '& .MuiInputBase-root': {
                        bgcolor: '#fff',
                        borderRadius: '10px',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '1.05rem',
                      },
                    }}
                  />
                ) : (
                  <Typography
                    sx={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '1.2rem',
                      color: TEXT_MUTED,
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                    }}
                  >
                    {transliteration}
                  </Typography>
                )}
              </Box>
            )}

            {/* Meaning */}
            <Box>
              <SectionTitle>Meaning</SectionTitle>
              <Box
                sx={{
                  bgcolor: '#fff',
                  borderRadius: '16px',
                  p: { xs: '1.25rem', sm: '1.5rem' },
                  border: `1px solid ${CREAM}`,
                }}
              >
                {(cefr || partOfSpeech || isEditing) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    {isEditing ? (
                      <TextField
                        value={editCefr}
                        onChange={(e) => setEditCefr(e.target.value)}
                        size="small"
                        placeholder="CEFR"
                        sx={{
                          width: 90,
                          '& .MuiInputBase-root': {
                            bgcolor: '#fff',
                            borderRadius: '10px',
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.95rem',
                          },
                        }}
                      />
                    ) : (
                      cefr && (
                        <Chip
                          label={formatCefr(cefr)}
                          size="small"
                          sx={{
                            bgcolor: DARK_GREEN,
                            color: '#fff',
                            fontFamily: 'Jost, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            px: 0.5,
                          }}
                        />
                      )
                    )}
                    {isEditing ? (
                      <TextField
                        value={editPartOfSpeech}
                        onChange={(e) => setEditPartOfSpeech(e.target.value)}
                        size="small"
                        placeholder="Part of speech"
                        sx={{
                          width: 130,
                          '& .MuiInputBase-root': {
                            bgcolor: '#fff',
                            borderRadius: '10px',
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.95rem',
                          },
                        }}
                      />
                    ) : (
                      partOfSpeech && (
                        <Chip
                          label={formatPos(partOfSpeech)}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(184,134,11,0.15)',
                            color: '#b8860b',
                            fontFamily: 'Jost, sans-serif',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}
                        />
                      )
                    )}
                  </Box>
                )}
                {isEditing ? (
                  <TextField
                    value={editGloss}
                    onChange={(e) => setEditGloss(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Primary gloss / meaning"
                    sx={{
                      '& .MuiInputBase-root': {
                        bgcolor: '#fff',
                        borderRadius: '10px',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '1.05rem',
                      },
                    }}
                  />
                ) : primaryGloss ? (
                  <Typography
                    sx={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: TEXT_DARK,
                      lineHeight: 1.5,
                    }}
                  >
                    {primaryGloss}
                  </Typography>
                ) : (
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', color: TEXT_MUTED }}>
                    No meaning available.
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Definitions */}
            {(data.definitions.length > 0 || isEditing) && (
              <Box>
                <SectionTitle>Definitions</SectionTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {isEditing
                    ? editDefinitions.map((def, idx) => (
                        <Box
                          key={def.definitionId}
                          sx={{
                            bgcolor: '#fff',
                            borderRadius: '16px',
                            p: { xs: '1.25rem', sm: '1.5rem' },
                            border: `1px solid ${CREAM}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                          }}
                        >
                          <TextField
                            value={def.definitionEn}
                            onChange={(e) => {
                              const next = [...editDefinitions]
                              next[idx].definitionEn = e.target.value
                              setEditDefinitions(next)
                            }}
                            size="small"
                            fullWidth
                            placeholder="English definition"
                            sx={{
                              '& .MuiInputBase-root': {
                                bgcolor: '#fff',
                                borderRadius: '10px',
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '1rem',
                              },
                            }}
                          />
                          <TextField
                            value={def.definitionAr}
                            onChange={(e) => {
                              const next = [...editDefinitions]
                              next[idx].definitionAr = e.target.value
                              setEditDefinitions(next)
                            }}
                            size="small"
                            fullWidth
                            placeholder="Arabic definition"
                            multiline
                            slotProps={{ htmlInput: { dir: 'rtl' } }}
                            sx={{
                              '& .MuiInputBase-root': {
                                bgcolor: '#fff',
                                borderRadius: '10px',
                                fontFamily: '"EB Garamond", Georgia, serif',
                                fontSize: '1.1rem',
                              },
                            }}
                          />
                        </Box>
                      ))
                    : data.definitions.map((def) => (
                        <Box
                          key={def.definition_id}
                          sx={{
                            bgcolor: '#fff',
                            borderRadius: '16px',
                            p: { xs: '1.25rem', sm: '1.5rem' },
                            border: `1px solid ${CREAM}`,
                          }}
                        >
                          {def.definition_en && (
                            <Typography
                              sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '1.1rem',
                                color: TEXT_DARK,
                                lineHeight: 1.5,
                                mb: def.definition_ar ? 1 : 0,
                              }}
                            >
                              {def.definition_en}
                            </Typography>
                          )}
                          {def.definition_ar && (
                            <Typography
                              sx={{
                                fontFamily: '"EB Garamond", Georgia, serif',
                                fontSize: '1.35rem',
                                color: TEXT_DARK,
                                direction: 'rtl',
                                textAlign: 'right',
                                lineHeight: 1.5,
                              }}
                            >
                              {displayArabic(def.definition_ar, showDiacritics)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                </Box>
              </Box>
            )}

            {/* No definitions fallback */}
            {data.definitions.length === 0 && !isEditing && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', color: TEXT_MUTED }}>
                  No definitions available.
                </Typography>
                {!user && (
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: TEXT_MUTED, mt: 0.5 }}>
                    Sign in to add one.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}

        {!loading && !error && data && viewMode === 'ui' && activeTab === 'conjugations' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {data.conjugations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography
                  sx={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontSize: '1.8rem',
                    fontWeight: 700,
                    color: TEXT_DARK,
                    mb: 0.5,
                  }}
                >
                  No conjugations found
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', color: TEXT_MUTED }}>
                  This word does not have any recorded conjugations.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                {data.conjugations
                  .slice()
                  .sort((a, b) => sortType(a.type, b.type))
                  .map((row) => (
                    <Box
                      key={row.conjugation_id}
                      sx={{
                        bgcolor: '#fff',
                        border: `1px solid ${CREAM}`,
                        borderRadius: '12px',
                        p: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          color: GOLD,
                          textTransform: 'uppercase',
                        }}
                      >
                        {formatConjugationType(row.type)}
                      </Typography>
                      {row.english_translation && (
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.95rem',
                            color: TEXT_MUTED,
                            lineHeight: 1.3,
                          }}
                        >
                          {row.english_translation}
                        </Typography>
                      )}
                      <Typography
                        sx={{
                          fontFamily: '"EB Garamond", Georgia, serif',
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: DARK_GREEN,
                          direction: 'rtl',
                          textAlign: 'right',
                          lineHeight: 1.35,
                        }}
                      >
                        {displayArabic(row.conjugation_diacritic, showDiacritics)}
                      </Typography>
                      {row.transliteration && (
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '1rem',
                            color: TEXT_MUTED,
                            fontStyle: 'italic',
                            lineHeight: 1.3,
                          }}
                        >
                          {row.transliteration}
                        </Typography>
                      )}
                    </Box>
                  ))}
              </Box>
            )}
          </Box>
        )}

      </DialogContent>

      <Divider sx={{ borderColor: CREAM }} />

      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          py: { xs: 1.5, sm: 2 },
          bgcolor: OFF_WHITE,
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        {data && (
          <Button
            onClick={toggleViewMode}
            disabled={saving}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            startIcon={<Code sx={{ fontSize: isMobile ? '1rem' : '1.1rem' }} />}
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: isMobile ? '0.8rem' : '1rem',
              fontWeight: 600,
              textTransform: 'none',
              color: DARK_GREEN,
              borderColor: 'rgba(27,77,62,0.3)',
              borderRadius: isMobile ? '10px' : '12px',
              px: isMobile ? 1.5 : 3,
              py: isMobile ? 0.6 : 1,
              '&:hover': { bgcolor: 'rgba(27,77,62,0.06)', borderColor: DARK_GREEN },
            }}
          >
            {viewMode === 'json' ? 'UI' : 'JSON'}
          </Button>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {canEdit && !isEditing && (
          <Button
            onClick={startEditing}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            startIcon={<Edit sx={{ fontSize: isMobile ? '1rem' : '1.1rem' }} />}
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: isMobile ? '0.8rem' : '1rem',
              fontWeight: 600,
              textTransform: 'none',
              color: DARK_GREEN,
              borderColor: 'rgba(27,77,62,0.3)',
              borderRadius: isMobile ? '10px' : '12px',
              px: isMobile ? 1.5 : 3,
              py: isMobile ? 0.6 : 1,
              '&:hover': { bgcolor: 'rgba(27,77,62,0.06)', borderColor: DARK_GREEN },
            }}
          >
            {canAdminEdit ? 'Edit' : 'Add definition'}
          </Button>
        )}
        {isEditing && (
          <>
            <Button
              onClick={cancelEditing}
              disabled={saving}
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: isMobile ? '0.8rem' : '1rem',
                fontWeight: 600,
                textTransform: 'none',
                color: TEXT_MUTED,
                borderColor: 'rgba(107,114,128,0.3)',
                borderRadius: isMobile ? '10px' : '12px',
                px: isMobile ? 1.5 : 3,
                py: isMobile ? 0.6 : 1,
                '&:hover': { bgcolor: 'rgba(107,114,128,0.06)', borderColor: TEXT_MUTED },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<Save sx={{ fontSize: isMobile ? '1rem' : '1.1rem' }} />}
              disableElevation
              sx={{
                bgcolor: DARK_GREEN,
                color: '#fff',
                fontFamily: 'Jost, sans-serif',
                fontSize: isMobile ? '0.85rem' : '1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: isMobile ? '10px' : '12px',
                px: isMobile ? 2 : 3,
                py: isMobile ? 0.6 : 1,
                '&:hover': { bgcolor: '#143d31' },
              }}
            >
              Save
            </Button>
          </>
        )}
        <Button
          onClick={onClose}
          variant="contained"
          size={isMobile ? 'small' : 'medium'}
          disableElevation
          sx={{
            bgcolor: DARK_GREEN,
            color: '#fff',
            fontFamily: 'Jost, sans-serif',
            fontWeight: 600,
            fontSize: isMobile ? '0.85rem' : '1.05rem',
            textTransform: 'none',
            borderRadius: isMobile ? '10px' : '12px',
            px: isMobile ? 2 : 4,
            py: isMobile ? 0.65 : 1,
            '&:hover': { bgcolor: '#143d31' },
          }}
        >
          Close
        </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
