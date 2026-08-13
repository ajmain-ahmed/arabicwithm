'use client'

import { Favorite, FavoriteBorder } from '@mui/icons-material'
import { CircularProgress, IconButton, Tooltip } from '@mui/material'
import { useMemo, useState } from 'react'
import { removePracticeWord, savePracticeWord } from '@/app/actions/practice'
import { useAuth } from '@/app/AuthContext'
import { stripDiacritics } from '@/app/lib/arabic'
import {
  PENDING_PRACTICE_WORD_KEY,
  createPracticeWordId,
  parsePracticeWords,
  type PracticeWordInput,
} from '@/app/lib/practice'
import { supabase } from '@/app/lib/supabase/client'
import type { VocabEntry } from './index'

function toPracticeWord(entry: VocabEntry): PracticeWordInput {
  const entryType = entry.entry_type === 'phrase' || entry.pos?.toLowerCase() === 'phrase' ? 'phrase' : 'word'
  const headword = entry.headword || entry.lemma || entry.plain || entry.arabic

  return {
    id: createPracticeWordId(entryType, headword, entry.arabic),
    arabic: entry.arabic,
    plain: entry.plain || stripDiacritics(entry.arabic),
    headword,
    transliteration: entry.transliteration,
    english: entry.english,
    cefr: entry.cefr,
    pos: entry.pos,
    entryType,
  }
}

export default function PracticeWordButton({ entry }: { entry: VocabEntry }) {
  const { user } = useAuth()
  const practiceWord = useMemo(() => toPracticeWord(entry), [entry])
  const stored = user ? parsePracticeWords(user.user_metadata).some((word) => word.id === practiceWord.id) : false
  const [override, setOverride] = useState<{ id: string; value: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const saved = override?.id === practiceWord.id ? override.value : stored

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      try {
        window.sessionStorage.setItem(PENDING_PRACTICE_WORD_KEY, JSON.stringify(practiceWord))
      } catch {
        // The account prompt still works if browser storage is unavailable.
      }
      window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'register' } }))
      return
    }

    setSaving(true)
    const nextSaved = !saved
    setOverride({ id: practiceWord.id, value: nextSaved })
    try {
      if (nextSaved) await savePracticeWord(practiceWord)
      else await removePracticeWord(practiceWord.id)
      await supabase.auth.refreshSession()
    } catch {
      setOverride({ id: practiceWord.id, value: saved })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Tooltip title={saved ? 'Remove from Practice' : 'Save to Practice'} placement="top">
      <IconButton
        size="small"
        onClick={handleClick}
        disabled={saving}
        aria-label={saved ? 'Remove word from Practice' : 'Save word to Practice'}
        sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          color: saved ? '#b44a47' : '#9e8a7a',
          bgcolor: 'rgba(255,255,255,0.86)',
          '&:hover': { bgcolor: '#fff', color: '#b44a47' },
        }}
      >
        {saving ? <CircularProgress size={18} color="inherit" /> : saved ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
      </IconButton>
    </Tooltip>
  )
}
