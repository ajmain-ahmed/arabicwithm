'use client'

import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  editGrammarNote,
  editGrammarExample,
  fetchGrammarRelatedIds,
  fetchGrammarExamples,
  mergeGrammarNotes,
  reviewGrammarExample,
  type GrammarExample,
  type GrammarNote,
} from '@/app/actions/grammarNotes'
import GrammarNoteRenderer from '@/app/components/grammar/GrammarNoteRenderer'
import { CEFR_LEVELS } from '@/app/lib/contentEnrichment/types'

function safeLink(value: string): string | undefined {
  if (
    /^\/(admin\/books\/preview\/|cartoons\/|transcripts\/|admin\/phrases$)/.test(value) &&
    !value.startsWith('//')
  )
    return value
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
function Example({
  value,
  busy,
  onReview,
  onEdit,
}: {
  value: GrammarExample
  busy: boolean
  onEdit: (
    id: string,
    fields: { highlight: string; explanation: string; grammar_note_id: string },
  ) => void
  onReview: (id: string, status: 'approved' | 'rejected') => void
}) {
  const [highlight, setHighlight] = useState(value.highlight)
  const [explanation, setExplanation] = useState(value.explanation)
  const [ruleId, setRuleId] = useState(value.grammar_note_id)
  const index = value.arabic.indexOf(value.highlight)
  return (
    <Box sx={{ borderTop: '1px solid var(--awm-gold)', pt: 2 }}>
      <Typography
        lang="ar"
        dir="rtl"
        sx={{ fontFamily: 'var(--font-book-naskh)', fontSize: '1.5rem', lineHeight: 2.2 }}
      >
        {index < 0 ? (
          value.arabic
        ) : (
          <>
            {value.arabic.slice(0, index)}
            <mark
              style={{
                background: 'color-mix(in srgb,var(--awm-gold) 30%,transparent)',
                color: 'inherit',
              }}
            >
              {value.highlight}
            </mark>
            {value.arabic.slice(index + value.highlight.length)}
          </>
        )}
      </Typography>
      {value.english && <Typography>{value.english}</Typography>}
      {value.explanation && <Typography sx={{ my: 1 }}>{value.explanation}</Typography>}
      <Typography variant="body2">
        {value.parent_title ? `${value.parent_title} → ` : ''}
        {value.source_title}
        {value.source_timestamp ? ` · ${value.source_timestamp}` : ''}
      </Typography>
      <Typography variant="caption">
        {value.source_kind} · {value.source_id}
        {value.example_cefr ? ` · Example ${value.example_cefr}` : ''}
      </Typography>
      <Stack direction="row" spacing={2}>
        {safeLink(value.source_url) && (
          <a href={safeLink(value.source_url)} target="_blank" rel="noopener noreferrer">
            Open source
          </a>
        )}
        {value.original_url && safeLink(value.original_url) && (
          <a href={safeLink(value.original_url)} target="_blank" rel="noopener noreferrer">
            Original video
          </a>
        )}
      </Stack>
      <TextField
        fullWidth
        label="Highlighted source structure"
        value={highlight}
        onChange={(event) => setHighlight(event.target.value)}
        sx={{ mt: 2 }}
      />
      <TextField
        fullWidth
        multiline
        label="Example explanation"
        value={explanation}
        onChange={(event) => setExplanation(event.target.value)}
        sx={{ mt: 2 }}
      />
      <TextField
        fullWidth
        label="Example rule ID"
        value={ruleId}
        onChange={(event) => setRuleId(event.target.value)}
        sx={{ mt: 2 }}
      />
      <Button
        disabled={busy}
        onClick={() => onEdit(value.id, { highlight, explanation, grammar_note_id: ruleId })}
      >
        Save example
      </Button>
      <Typography variant="caption">Example review {value.review_status}</Typography>
      <Stack direction="row" spacing={1}>
        <Button
          disabled={busy || value.review_status === 'approved'}
          onClick={() => onReview(value.id, 'approved')}
        >
          Approve example
        </Button>
        <Button
          disabled={busy || value.review_status === 'rejected'}
          onClick={() => onReview(value.id, 'rejected')}
        >
          Reject example
        </Button>
      </Stack>
    </Box>
  )
}

export default function GrammarNoteEditor({
  note,
  onClose,
  onSaved,
}: {
  note: GrammarNote
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState(note)
  const [examples, setExamples] = useState<GrammarExample[]>([])
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([fetchGrammarExamples(note.id), fetchGrammarRelatedIds(note.id)])
      .then(([values, related]) => {
        if (active) setDraft((old) => ({ ...old, related_ids: related }))
        if (active) {
          setExamples(values)
          setMore(values.length === 25)
        }
      })
      .catch(() => {
        if (active) setError('Unable to load examples. Reopen this note to retry.')
      })
    return () => {
      active = false
    }
  }, [note.id])
  async function save(status = draft.status, reviewExamples = false) {
    setBusy(true)
    setError('')
    try {
      await editGrammarNote(note.id, {
        title_en: draft.title_en,
        title_ar: draft.title_ar,
        rule_cefr: draft.rule_cefr,
        category: draft.category,
        explanation: draft.explanation,
        detail: draft.detail,
        mechanics: draft.mechanics,
        recognition_tip: draft.recognition_tip,
        transformations: draft.transformations,
        related_ids: draft.related_ids,
        status,
        ...(reviewExamples
          ? {
              reviewed_examples: examples
                .filter((example) => example.review_status === 'candidate')
                .map((example) => example.id),
            }
          : {}),
      })
      onSaved()
      onClose()
    } catch {
      setError('Unable to save this note. Check its fields and retry.')
    } finally {
      setBusy(false)
    }
  }
  async function reviewExample(id: string, status: 'approved' | 'rejected') {
    setBusy(true)
    setError('')
    try {
      await reviewGrammarExample(id, status)
      setExamples((values) =>
        values.map((value) => (value.id === id ? { ...value, review_status: status } : value)),
      )
      onSaved()
    } catch {
      setError('Unable to review this example. Please retry.')
    } finally {
      setBusy(false)
    }
  }
  async function saveExample(
    id: string,
    fields: { highlight: string; explanation: string; grammar_note_id: string },
  ) {
    setBusy(true)
    setError('')
    try {
      await editGrammarExample(id, fields)
      setExamples(await fetchGrammarExamples(note.id))
      setPage(0)
      onSaved()
    } catch {
      setError(
        'Unable to save this example. Use an exact source highlight and a valid canonical rule ID.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function merge() {
    setBusy(true)
    setError('')
    try {
      await mergeGrammarNotes(note.id, target)
      onSaved()
      onClose()
    } catch {
      setError('Unable to merge. Enter the ID of another existing, unmerged rule.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Review Grammar Note</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="caption">
            Rule ID {note.id} · Confidence {Math.round(note.confidence * 100)}%
          </Typography>
          <TextField
            label="English title"
            value={draft.title_en}
            onChange={(event) => setDraft({ ...draft, title_en: event.target.value })}
          />
          <TextField
            label="Arabic grammar name"
            value={draft.title_ar}
            onChange={(event) => setDraft({ ...draft, title_ar: event.target.value })}
            slotProps={{ htmlInput: { dir: 'rtl', lang: 'ar' } }}
          />
          <TextField
            select
            label="Rule CEFR"
            value={draft.rule_cefr}
            onChange={(event) =>
              setDraft({ ...draft, rule_cefr: event.target.value as GrammarNote['rule_cefr'] })
            }
          >
            {CEFR_LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {level}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Category"
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value as GrammarNote['category'] })
            }
          >
            {['nahw', 'sarf', 'balaghah'].map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Learner explanation"
            multiline
            minRows={4}
            value={draft.explanation}
            onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
          />
          <TextField
            label="Advanced note"
            multiline
            minRows={3}
            value={draft.detail}
            onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
          />
          <TextField
            label="Mechanics"
            multiline
            minRows={3}
            value={draft.mechanics}
            onChange={(event) => setDraft({ ...draft, mechanics: event.target.value })}
          />
          <TextField
            label="Recognition tip"
            multiline
            value={draft.recognition_tip}
            onChange={(event) => setDraft({ ...draft, recognition_tip: event.target.value })}
          />
          <TextField
            label="Transformations (one per line)"
            multiline
            value={draft.transformations.join('\n')}
            onChange={(event) =>
              setDraft({ ...draft, transformations: event.target.value.split('\n') })
            }
          />
          <TextField
            label="Related rule IDs (comma separated)"
            value={draft.related_ids.join(', ')}
            onChange={(event) =>
              setDraft({
                ...draft,
                related_ids: event.target.value
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
          />
          <details>
            <summary>Preview canonical note</summary>
            <GrammarNoteRenderer note={{ ...draft, examples }} preview />
          </details>
          <Typography component="h2" variant="h6">
            Source examples
          </Typography>
          <Typography variant="body2">
            Approve reviews the rule and its loaded candidate examples. Additional examples remain
            pending.
          </Typography>
          {examples.map((example) => (
            <Example
              key={example.id}
              value={example}
              onEdit={(id, fields) => void saveExample(id, fields)}
              busy={busy}
              onReview={(id, status) => void reviewExample(id, status)}
            />
          ))}
          {more && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const next = await fetchGrammarExamples(note.id, page + 1)
                  setExamples((old) => [...old, ...next])
                  setPage(page + 1)
                  setMore(next.length === 25)
                } catch {
                  setError('Unable to load more examples. Please retry.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              More examples
            </Button>
          )}
          <TextField
            label="Merge into rule ID"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <Button disabled={busy || !target} onClick={() => void merge()}>
            Merge into this rule
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button disabled={busy} onClick={onClose}>
          Close
        </Button>
        <Button disabled={busy} onClick={() => void save('rejected')}>
          Reject
        </Button>
        <Button disabled={busy} onClick={() => void save()}>
          Save edits
        </Button>
        <Button disabled={busy} variant="contained" onClick={() => void save('approved', true)}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  )
}
