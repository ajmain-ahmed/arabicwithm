'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { useState } from 'react'
import {Box,Button,Collapse,Dialog,DialogActions,DialogContent,DialogTitle,Divider,Tab,Tabs,Typography,useMediaQuery} from '@mui/material'
import LtrSlider from '@/app/components/LtrSlider'
import { FastForwardRounded, MenuBook, PlayArrowRounded, ViewAgenda } from '@mui/icons-material'
import type { BookReaderFont } from '@/app/lib/bookReaderSettings'
import { BOOK_TEXT_SCALE_STEP, MAX_BOOK_TEXT_SCALE, MIN_BOOK_TEXT_SCALE } from '@/app/lib/bookReaderSettings'

const FONT_OPTIONS: Array<{ value: BookReaderFont; label: string }> = [
  { value: 'naskh', label: 'Naskh' },
  { value: 'sans', label: 'Modern' },
  { value: 'amiri', label: 'Classic' },
]

const CARD_SX = { p: 2, border: '1px solid rgba(122,110,101,0.18)', borderRadius: '12px', bgcolor: 'rgba(122,110,101,0.04)' } as const

function LanguageButtons({ language, onLanguageChange, audioLanguages, audioMode = 'single', onAudioModeChange = () => {}, canBilingual = false }: {
  language: 'ar' | 'en'
  onLanguageChange: (language: 'ar' | 'en') => void
  audioLanguages: Array<'ar' | 'en'>
  audioMode?: 'single' | 'bilingual'
  onAudioModeChange?: (mode: 'single' | 'bilingual') => void
  canBilingual?: boolean
}) {
 const {t:awmT}=useWebsiteLocale()

  return <Box sx={{ display: 'flex', gap: 1, mt: 1.25, alignItems: 'stretch' }}>
    {audioLanguages.map(value => <Button
      key={value}
      onClick={() => { onAudioModeChange('single'); onLanguageChange(value) }}
      variant={language === value ? 'contained' : 'outlined'}
      aria-pressed={language === value}
      sx={{ flex: 1, minWidth: 0, color: language === value ? '#fff' : 'var(--awm-bark)', bgcolor: language === value ? '#b8860b' : 'transparent', borderColor: 'rgba(184,134,11,0.4)', borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: language === value ? '#966d09' : 'rgba(184,134,11,0.08)' } }}
    >
      {value === 'ar' ? 'العربية' : awmT("English")}
    </Button>)}
    <Collapse in={canBilingual} orientation="horizontal" timeout={260} unmountOnExit={false}>
      <Button onClick={() => onAudioModeChange(audioMode === 'bilingual' ? 'single' : 'bilingual')} variant={audioMode === 'bilingual' ? 'contained' : 'outlined'} aria-pressed={audioMode === 'bilingual'} sx={{ flex: 1, minWidth: 0, color: audioMode === 'bilingual' ? '#fff' : 'var(--awm-bark)', bgcolor: audioMode === 'bilingual' ? '#b8860b' : 'transparent', borderColor: 'rgba(184,134,11,0.4)', borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: audioMode === 'bilingual' ? '#966d09' : 'rgba(184,134,11,0.08)' } }}>
        <UiText>{"English + العربية"}</UiText></Button>
    </Collapse>
  </Box>
}

function AudioSection({ language, onLanguageChange, audioLanguages, audioRate, onAudioRateChange, audioMode, onAudioModeChange, canBilingual, structured }: {
  language: 'ar' | 'en'
  onLanguageChange: (language: 'ar' | 'en') => void
  audioLanguages: Array<'ar' | 'en'>
  audioRate: number
  onAudioRateChange: (rate: number) => void
  audioMode: 'single' | 'bilingual'
  onAudioModeChange: (mode: 'single' | 'bilingual') => void
  canBilingual: boolean
  structured: boolean
}) {
 const {t:awmT}=useWebsiteLocale()

  return <Box sx={CARD_SX}>
    <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600 }}><UiText>{"Narration language"}</UiText></Typography>
    {structured && <Typography sx={{ mt: 0.5, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans)', fontSize: 13 }}><UiText>{"This lesson shows Arabic and English together. Choose the narration language."}</UiText></Typography>}
    <LanguageButtons language={language} onLanguageChange={onLanguageChange} audioLanguages={audioLanguages} audioMode={audioMode} onAudioModeChange={onAudioModeChange} canBilingual={canBilingual} />
    <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
      <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600 }}><UiText>{"Audio speed"}</UiText></Typography>
      <Typography aria-live="polite" sx={{ color: 'var(--awm-gold)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700 }}>{audioRate}×</Typography>
    </Box>
    <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '32px minmax(150px, 1fr) 42px', alignItems: 'center', columnGap: { xs: 1.5, sm: 2.5 } }}>
      <PlayArrowRounded data-testid="slower-audio-icon" aria-hidden="true" sx={{ color: 'var(--awm-muted)', fontSize: 19 }} />
      <LtrSlider
        value={audioRate}
        min={0.5}
        max={2}
        step={0.25}
        marks={[{ value: 0.5, label: '0.5×' }, { value: 1, label: '1×' }, { value: 1.5, label: '1.5×' }, { value: 2, label: '2×' }]}
        onChange={(_, value) => onAudioRateChange(value as number)}
        aria-label={awmT("Audiobook playback speed")}
        sx={{ color: '#b8860b', '& .MuiSlider-markLabel': { fontFamily: 'var(--font-sans), sans-serif', fontSize: 10 } }}
      />
      <FastForwardRounded data-testid="faster-audio-icon" aria-hidden="true" sx={{ color: 'var(--awm-muted)', fontSize: 23 }} />
    </Box>
  </Box>
}

export default function BookReaderSettingsDialog({
  open,
  onClose,
  readerFont,
  onReaderFontChange,
  textScale,
  onTextScaleChange,
  view,
  onViewChange,
  language,
  onLanguageChange,
  audioRate,
  onAudioRateChange,
  hasAudio,
  audioLanguages = ['ar', 'en'],
  audioMode = 'single',
  onAudioModeChange = () => {},
  canBilingual = false,
  structured = false,
}: {
  open: boolean
  onClose: () => void
  readerFont: BookReaderFont
  onReaderFontChange: (font: BookReaderFont) => void
  textScale: number
  onTextScaleChange: (scale: number) => void
  view: 'lines' | 'book'
  onViewChange: (view: 'lines' | 'book') => void
  structured?: boolean
  language: 'ar' | 'en'
  onLanguageChange: (language: 'ar' | 'en') => void
  audioRate: number
  onAudioRateChange: (rate: number) => void
  hasAudio: boolean
  audioLanguages?: Array<'ar' | 'en'>
  audioMode?: 'single' | 'bilingual'
  onAudioModeChange?: (mode: 'single' | 'bilingual') => void
  canBilingual?: boolean
}) {
 const {t:awmT}=useWebsiteLocale()

  const mobile = useMediaQuery('(max-width:599.95px)')
  const [mobileTab, setMobileTab] = useState<'general' | 'audio'>('general')
  const generalContent = <>
    <Box sx={CARD_SX}>
      {!structured && <>
        <Typography sx={{ mb: 1.25, color: 'var(--awm-bark)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600 }}><UiText>{"Reading view"}</UiText></Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
          <Button onClick={() => onViewChange('lines')} variant={view === 'lines' ? 'contained' : 'outlined'} startIcon={<ViewAgenda sx={{ fontSize: 17 }} />} aria-pressed={view === 'lines'} sx={{ minWidth: 0, color: view === 'lines' ? '#fff' : 'var(--awm-bark)', bgcolor: view === 'lines' ? '#b8860b' : 'transparent', borderColor: 'rgba(184,134,11,0.4)', borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: view === 'lines' ? '#966d09' : 'rgba(184,134,11,0.08)' } }}><UiText>{"Line by line"}</UiText></Button>
          <Button onClick={() => onViewChange('book')} variant={view === 'book' ? 'contained' : 'outlined'} startIcon={<MenuBook sx={{ fontSize: 17 }} />} aria-pressed={view === 'book'} sx={{ minWidth: 0, color: view === 'book' ? '#fff' : 'var(--awm-bark)', bgcolor: view === 'book' ? '#b8860b' : 'transparent', borderColor: 'rgba(184,134,11,0.4)', borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: view === 'book' ? '#966d09' : 'rgba(184,134,11,0.08)' } }}><UiText>{"Book view"}</UiText></Button>
        </Box>
      </>}
      {structured && !hasAudio && <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}><UiText>{"This lesson shows Arabic and English together."}</UiText></Typography>}
      {!hasAudio && <LanguageButtons language={language} onLanguageChange={onLanguageChange} audioLanguages={audioLanguages} audioMode={audioMode} onAudioModeChange={onAudioModeChange} canBilingual={canBilingual} />}
    </Box>
    <Box sx={CARD_SX}>
      <Typography sx={{ mb: 1.25, color: 'var(--awm-bark)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600 }}><UiText>{"Arabic font"}</UiText></Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
        {FONT_OPTIONS.map(({ value, label }) => <Button key={value} onClick={() => onReaderFontChange(value)} variant={readerFont === value ? 'contained' : 'outlined'} sx={{ minWidth: 0, color: readerFont === value ? '#fff' : 'var(--awm-bark)', bgcolor: readerFont === value ? '#b8860b' : 'transparent', borderColor: 'rgba(184,134,11,0.4)', borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: readerFont === value ? '#966d09' : 'rgba(184,134,11,0.08)' }}}><UiText>{label}</UiText></Button>)}
      </Box>
    </Box>
    <Box sx={CARD_SX}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600 }}><UiText>{"Text size"}</UiText></Typography>
          <Typography sx={{ mt: 0.25, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12.5 }}><UiText>{"Adjust the chapter text"}</UiText></Typography>
        </Box>
        <Typography aria-live="polite" sx={{ color: 'var(--awm-gold)', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700 }}>{Math.round(textScale * 100)}%</Typography>
      </Box>
      <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '32px minmax(150px, 1fr) 42px', alignItems: 'center', columnGap: { xs: 1.5, sm: 2.5 } }}>
        <Typography aria-hidden="true" sx={{ color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>A</Typography>
        <LtrSlider value={textScale} min={MIN_BOOK_TEXT_SCALE} max={MAX_BOOK_TEXT_SCALE} step={BOOK_TEXT_SCALE_STEP} onChange={(_, value) => onTextScaleChange(value as number)} aria-label={awmT("Book text size")} sx={{ color: '#b8860b', '& .MuiSlider-thumb': { width: 18, height: 18 }, '& .MuiSlider-track, & .MuiSlider-rail': { height: 5 } }} />
        <Typography aria-hidden="true" sx={{ color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 24, lineHeight: 1, fontWeight: 700, textAlign: 'center' }}>A</Typography>
      </Box>
    </Box>
  </>
  const audioContent = hasAudio ? <AudioSection language={language} onLanguageChange={onLanguageChange} audioLanguages={audioLanguages} audioRate={audioRate} onAudioRateChange={onAudioRateChange} audioMode={audioMode} onAudioModeChange={onAudioModeChange} canBilingual={canBilingual} structured={structured} /> : null
  return (
    <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: { width: '100%', maxWidth: 480, m: 2, borderRadius: '16px' } } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Divider textAlign="center" sx={{ color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', p: 2 }}><UiText>{"Reading settings"}</UiText></Divider>
      </DialogTitle>
      {mobile && <Tabs value={mobileTab} onChange={(_, value) => setMobileTab(value)} variant="fullWidth" aria-label={awmT("Reading settings sections")} sx={{ borderBottom: '1px solid rgba(122,110,101,0.18)' }}>
        <Tab value="general" label={awmT("General settings")} />
        <Tab value="audio" label={awmT("Audio settings")} disabled={!hasAudio} />
      </Tabs>}
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px!important' }}>
        {mobile ? mobileTab === 'general' ? generalContent : audioContent : <>
          {generalContent}
          {hasAudio && <Divider textAlign="center" sx={{ color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}><UiText>{"Audio settings"}</UiText></Divider>}
          {audioContent}
        </>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: '#2c1a0e', color: '#f5ede0', borderRadius: '9px', px: 3, textTransform: 'none', '&:hover': { bgcolor: '#1a0f08' }}}><UiText>{"Done"}</UiText></Button>
      </DialogActions>
    </Dialog>
  )
}
