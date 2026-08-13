'use client'

import {
  Favorite,
  FavoriteBorder,
  LocalLibraryOutlined,
  PlayArrow,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removePracticeWord } from '@/app/actions/practice'
import { formatCefr, formatPos } from '@/app/lib/display'
import { practiceCategoryFor, type PracticeCategory, type PracticeWord } from '@/app/lib/practice'
import { supabase } from '@/app/lib/supabase/client'

type Filter = 'all' | Exclude<PracticeCategory, 'other'>

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All Words' },
  { value: 'nouns', label: 'Nouns' },
  { value: 'verbs', label: 'Verbs' },
  { value: 'phrases', label: 'Phrases' },
]

function amountOptions(total: number): number[] {
  if (total <= 0) return []
  return [...new Set([5, 10, 15, 20, 25, total].filter((amount) => amount <= total))].sort((a, b) => a - b)
}

function RegisterPrompt() {
  const openRegister = () => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'register' } }))
  return (
    <Container maxWidth="md" sx={{ py: { xs: 7, md: 11 } }}>
      <Paper elevation={0} sx={{ p: { xs: 4, md: 7 }, textAlign: 'center', border: '1px solid rgba(184,134,11,0.2)', bgcolor: '#fff', borderRadius: '14px' }}>
        <FavoriteBorder sx={{ fontSize: 48, color: '#b8860b', mb: 2 }} />
        <Typography component="h1" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 36, md: 48 }, fontWeight: 700, color: '#2c1a0e' }}>
          Your Practice Library
        </Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#7a6e65', maxWidth: 560, mx: 'auto', mt: 1.5, mb: 3 }}>
          Create an account to save words from cartoons and books, then practise them with personalised flashcards.
        </Typography>
        <Button variant="contained" onClick={openRegister} sx={{ bgcolor: '#b8860b', color: '#fff', textTransform: 'none', borderRadius: '9999px', px: 4, '&:hover': { bgcolor: '#966d09' } }}>
          Create an Account
        </Button>
      </Paper>
    </Container>
  )
}

export default function PracticePage({ authenticated, initialWords }: { authenticated: boolean; initialWords: PracticeWord[] }) {
  const router = useRouter()
  const [words, setWords] = useState(initialWords)
  const [filter, setFilter] = useState<Filter>('all')
  const options = amountOptions(words.length)
  const [amount, setAmount] = useState(options[0] ?? 0)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')

  const counts = useMemo(() => {
    const next = { nouns: 0, verbs: 0, phrases: 0 }
    words.forEach((word) => {
      const category = practiceCategoryFor(word)
      if (category !== 'other') next[category] += 1
    })
    return next
  }, [words])

  const visibleWords = filter === 'all' ? words : words.filter((word) => practiceCategoryFor(word) === filter)

  if (!authenticated) return <RegisterPrompt />

  const removeWord = async (wordId: string) => {
    setRemoving(wordId)
    try {
      await removePracticeWord(wordId)
      const remaining = words.filter((word) => word.id !== wordId)
      setWords(remaining)
      const nextOptions = amountOptions(remaining.length)
      if (!nextOptions.includes(amount)) setAmount(nextOptions.at(-1) ?? 0)
      await supabase.auth.refreshSession()
    } catch {
      setError('That word could not be removed. Please try again.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Box sx={{ minHeight: '70vh', bgcolor: '#faf7f2', py: { xs: 4, md: 7 } }}>
      <Container maxWidth="xl">
        <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: '14px', bgcolor: '#0e2e1f', color: '#fff', p: { xs: 3, md: 5 }, mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', gap: 4, alignItems: { lg: 'center' } }}>
            <Box>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#d4a843', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 12 }}>
                My vocabulary
              </Typography>
              <Typography component="h1" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontWeight: 700, fontSize: { xs: 38, md: 52 }, lineHeight: 1.05, mt: 0.75 }}>
                Practice
              </Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', color: 'rgba(255,255,255,0.7)', mt: 1, maxWidth: 520 }}>
                Review saved words in a varied set that prioritises new and challenging vocabulary.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(90px, 1fr))' }, gap: 1.5 }}>
              {[
                ['Total', words.length],
                ['Nouns', counts.nouns],
                ['Verbs', counts.verbs],
                ['Phrases', counts.phrases],
              ].map(([label, value]) => (
                <Box key={label} sx={{ minWidth: 90, px: 2, py: 1.5, border: '1px solid rgba(212,168,67,0.3)', bgcolor: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', color: '#fff', fontSize: 28, fontWeight: 700 }}>{value}</Typography>
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#d4a843', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ minWidth: { lg: 220 } }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.7)', mb: 0.75 }}>Words to practise</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 80, bgcolor: '#fff' }}>
                  <Select value={amount} onChange={(event) => setAmount(Number(event.target.value))} disabled={!words.length} aria-label="Number of words to practise">
                    {options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  disabled={!words.length || !amount}
                  onClick={() => router.push(`/practice/session?count=${amount}`)}
                  sx={{ flex: 1, bgcolor: '#d4a843', color: '#0e2e1f', fontFamily: 'Jost, sans-serif', fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#e2ba5a' } }}
                >
                  Start Practice
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
          <Paper component="aside" elevation={0} sx={{ p: 1.5, border: '1px solid rgba(44,26,14,0.09)', borderRadius: '10px', position: { md: 'sticky' }, top: { md: 88 } }}>
            <Typography sx={{ px: 1.5, pt: 1, pb: 1.25, fontFamily: 'Jost, sans-serif', fontWeight: 700, color: '#2c1a0e', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Categories</Typography>
            {FILTERS.map((item) => {
              const count = item.value === 'all' ? words.length : counts[item.value]
              return (
                <Button
                  key={item.value}
                  fullWidth
                  onClick={() => setFilter(item.value)}
                  sx={{ justifyContent: 'space-between', color: filter === item.value ? '#0e2e1f' : '#7a6e65', bgcolor: filter === item.value ? 'rgba(184,134,11,0.12)' : 'transparent', textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: filter === item.value ? 700 : 500, px: 1.5, my: 0.25 }}
                >
                  <span>{item.label}</span><Chip label={count} size="small" sx={{ height: 22, fontSize: 11 }} />
                </Button>
              )
            })}
          </Paper>

          <Box>
            {visibleWords.length === 0 ? (
              <Paper elevation={0} sx={{ p: { xs: 4, md: 7 }, textAlign: 'center', border: '1px dashed rgba(184,134,11,0.35)', borderRadius: '12px' }}>
                <LocalLibraryOutlined sx={{ fontSize: 44, color: '#b8860b', mb: 1.5 }} />
                <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', color: '#2c1a0e', fontSize: 28, fontWeight: 700 }}>No saved words here yet</Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#7a6e65', mt: 1 }}>Hover over Arabic words in cartoons or books and select the heart.</Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
                {visibleWords.map((word) => (
                  <Paper key={word.id} elevation={0} sx={{ position: 'relative', p: 2.5, border: '1px solid rgba(44,26,14,0.09)', borderRadius: '10px', minHeight: 190 }}>
                    <IconButton disabled={removing === word.id} onClick={() => void removeWord(word.id)} aria-label={`Remove ${word.arabic} from Practice`} sx={{ position: 'absolute', top: 8, right: 8, color: '#b44a47' }}>
                      <Favorite fontSize="small" />
                    </IconButton>
                    <Typography lang="ar" dir="rtl" sx={{ pr: 4, fontFamily: '"EB Garamond", Georgia, serif', color: '#2c1a0e', fontSize: 34, fontWeight: 700, textAlign: 'center' }}>{word.arabic}</Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#9e8a7a', fontSize: 13, textAlign: 'center', mt: 0.5 }}>{word.transliteration}</Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#2c1a0e', textAlign: 'center', mt: 1.5 }}>{word.english || 'Definition unavailable'}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap', mt: 2 }}>
                      {word.pos && <Chip size="small" label={formatPos(word.pos)} sx={{ bgcolor: 'rgba(184,134,11,0.12)', color: '#966d09' }} />}
                      {word.cefr && <Chip size="small" label={formatCefr(word.cefr)} variant="outlined" />}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Container>
      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError('')}><Alert severity="error" onClose={() => setError('')}>{error}</Alert></Snackbar>
    </Box>
  )
}
