'use client'
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { VolumeUp } from '@mui/icons-material'
import { fetchWordOfTheDay, type VocabularyEntry } from '@/app/actions/vocabulary'
import { speakArabic } from '@/app/lib/pronunciation'
import { platformDate } from '@/app/lib/entitlements'
export default function WordOfTheDay() {
  const [word, setWord] = useState<VocabularyEntry | null>(null)
  const [error, setError] = useState('')
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    let cancelled = false
    let date = ''
    const refresh = () => {
      if (date === platformDate()) return
      date = platformDate()
      fetchWordOfTheDay().then(value => { if (!cancelled) setWord(value) }).catch(() => { date = '' })
    }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  if (!word) return null
  async function speak() {
    if (!word) return
    setSpeaking(true); setError('')
    try { await speakArabic(word.arabic) } catch (e) { setError(e instanceof Error ? e.message : 'Audio unavailable.') } finally { setSpeaking(false) }
  }
  return <Paper component="section" variant="outlined" sx={{ mx: { xs: 2, md: 5 }, mt: 4, p: { xs: 3, md: 4 }, borderRadius: '16px' }}>
    <Typography variant="h2" sx={{ fontSize: 28 }}>Word of the Day</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 1 }}><Typography lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-serif)', fontSize: 42 }}>{word.arabic}</Typography><Button onClick={() => void speak()} disabled={speaking} startIcon={<VolumeUp />} aria-label={`Pronounce ${word.arabic}`}>Listen</Button></Box>
    {word.arabicDefinition && <Typography lang="ar" dir="rtl" sx={{ mt: 1 }}>{word.arabicDefinition}</Typography>}
    <Typography sx={{ mt: 1 }} color="text.secondary">{word.english}</Typography>
    {error && <Alert severity="info" sx={{ mt: 2 }}>{error}</Alert>}
  </Paper>
}
