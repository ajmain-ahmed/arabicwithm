'use client'

import React, { useState, useEffect, useCallback, startTransition } from 'react'
import { isAdminUser } from '@/app/actions/vocab'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    Box, Button, Container, Typography,
    Skeleton,
    IconButton, Dialog, Breadcrumbs, Link,
} from '@mui/material'
import {
    NavigateNext, NavigateBefore,
    Settings, Close,
} from '@mui/icons-material'
import { useVocabStore } from '@/store/vocabStore'
import TutorialDialog, { useTutorialSeen } from '../components/TutorialDialog'
import AuthDialog from '@/app/components/AuthDialog'
import LoadingView from '../components/LoadingView'
import { PillToggle, DesktopTextScaleSlider, SettingsDialog } from '../components/QuizSettings'
import ThemePlaylistSidebar from '../components/ThemePlaylistSidebar'
import FlashcardQuiz from '../components/FlashcardQuiz'
import type { VocabRow, ThemeProgress, ExampleRow } from '@/app/actions/vocab'


/* ─────────────────────────────────────────────
   Slug → DB level mapping
───────────────────────────────────────────── */
const SLUG_TO_LEVEL: Record<string, string> = {
    Beginner: 'A0',
    Apprentice: 'A1',
    Competent: 'A2',
    Proficient: 'B1',
    'Highly-Proficient': 'B2',
    Expert: 'C1',
    Native: 'C2',
}

const SLUG_LABELS: Record<string, string> = {
    Beginner: 'Beginner | A0',
    Apprentice: 'Apprentice | A1',
    Competent: 'Competent | A2',
    Proficient: 'Proficient | B1',
    'Highly-Proficient': 'Highly Proficient | B2',
    Expert: 'Expert | C1',
    Native: 'Native | C2',
}

export default function FlashcardSlugPage() {
    const [textScale, setTextScale] = useState(1.1)
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const slug = (params?.slug as string) ?? 'beginner'
    const level = SLUG_TO_LEVEL[slug] ?? 'A0'
    const label = SLUG_LABELS[slug] ?? slug
    const themeQueryParam = searchParams.get('theme')

    const fetchTheme = useVocabStore(s => s.fetchTheme)
    const fetchThemeList = useVocabStore(s => s.fetchThemeList)
    const loadingThemeId = useVocabStore(s => s.loadingThemeId)

    const [themes, setThemes] = useState<ThemeProgress[]>([])
    const [themesLoading, setThemesLoading] = useState(true)
    const [themesError, setThemesError] = useState<string | null>(null)
    const [selectedTheme, setSelectedTheme] = useState<ThemeProgress | null>(null)
    const [activeQueue, setActiveQueue] = useState<VocabRow[]>([])
    const [activeExamples, setActiveExamples] = useState<ExampleRow[]>([])
    const [initialCardIndex, setInitialCardIndex] = useState<number | undefined>(undefined)
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    const [quizKey, setQuizKey] = useState(0)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [themesOpen, setThemesOpen] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)

    const [themeTransitionReady, setThemeTransitionReady] = useState(false)
    const [vocabTransitionReady, setVocabTransitionReady] = useState(false)

    useEffect(() => {
        if (themesLoading || !selectedTheme) return
        const timer = setTimeout(() => setThemeTransitionReady(true), 400)
        return () => clearTimeout(timer)
    }, [themesLoading, selectedTheme])

    const { seen: tutorialSeen, markSeen: markTutorialSeen } = useTutorialSeen()
    const [tutorialOpen, setTutorialOpen] = useState(false)

    useEffect(() => {
        if (!tutorialSeen) {
            const timer = setTimeout(() => setTutorialOpen(true), 800)
            return () => clearTimeout(timer)
        }
    }, [tutorialSeen])

    useEffect(() => {
        isAdminUser().then(setIsAdmin).catch(() => setIsAdmin(false))
    }, [])

    // Load the selected theme's vocabulary
    const handleThemeSelect = useCallback(async (theme: ThemeProgress, cardIndex?: number) => {
        if (!theme?.theme_id) return
        setSelectedTheme(theme)
        try {
            const { vocab, examples } = await fetchTheme(theme.theme_id, level)
            setActiveQueue(vocab)
            setActiveExamples(examples)

            if (cardIndex !== undefined) {
                setInitialCardIndex(cardIndex)
            } else {
                setInitialCardIndex(0)
            }

            setQuizKey(k => k + 1)
        } catch (err) {
            console.error(err)
            setActiveQueue([])
            setActiveExamples([])
            setInitialCardIndex(0)
        }
    }, [fetchTheme, level])

    // Fetch themes whenever level changes
    useEffect(() => {
        let cancelled = false
        startTransition(() => {
            setThemesLoading(true)
            setThemesError(null)
            setSelectedTheme(null)
        })
        fetchThemeList(level)
            .then(async (data) => {
                if (cancelled) return
                setThemes(data)
                setThemesLoading(false)

                const targetTheme = themeQueryParam
                    ? data.find((t: ThemeProgress) => t?.theme_id === themeQueryParam)
                    : null

                if (targetTheme) {
                    await handleThemeSelect(targetTheme)
                } else if (data[0]) {
                    await handleThemeSelect(data[0])
                }
            })
            .catch(err => {
                console.error(err)
                if (!cancelled) {
                    setThemes([])
                    setThemesLoading(false)
                    setThemesError(err?.message ?? 'Failed to load themes')
                }
            })
        return () => { cancelled = true }
    }, [level, themeQueryParam, fetchThemeList, handleThemeSelect])

    const validThemes = themes.filter((t) => t?.theme_id != null)

    const goToPreviousTheme = useCallback(() => {
        if (!selectedTheme) return
        const currentIdx = validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id)
        if (currentIdx > 0) {
            handleThemeSelect(validThemes[currentIdx - 1])
        }
    }, [selectedTheme, validThemes, handleThemeSelect])

    const goToNextTheme = useCallback(() => {
        if (!selectedTheme) return
        const currentIdx = validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id)
        if (currentIdx >= 0 && currentIdx < validThemes.length - 1) {
            handleThemeSelect(validThemes[currentIdx + 1])
        }
    }, [selectedTheme, validThemes, handleThemeSelect])

    const handleQuizComplete = useCallback(() => {
        if (!selectedTheme) return
        const currentIdx = validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id)
        const nextTheme = validThemes[currentIdx + 1]
        if (nextTheme) {
            handleThemeSelect(nextTheme)
        }
    }, [selectedTheme, validThemes, handleThemeSelect])

    const isLoadingVocab = selectedTheme != null && loadingThemeId === selectedTheme.theme_id

    useEffect(() => {
        if (isLoadingVocab) return
        const timer = setTimeout(() => setVocabTransitionReady(true), 400)
        return () => clearTimeout(timer)
    }, [isLoadingVocab])

    return (
        <>

            <TutorialDialog
                open={tutorialOpen}
                onClose={() => {
                    setTutorialOpen(false)
                    markTutorialSeen()
                }}
            />

            {/* Mobile themes dialog */}
            <Dialog open={themesOpen} onClose={() => setThemesOpen(false)} fullScreen sx={{ display: { sm: 'none' } }} slotProps={{ paper: { sx: { background: '#faf7f2' } } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{
                        background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)',
                        px: 2.5, py: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexShrink: 0,
                    }}>
                        <Box>
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.25rem', fontWeight: 700, color: '#f5ede0', lineHeight: 1.2 }}>
                                {label}
                            </Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(245,237,224,0.6)', fontWeight: 500, mt: 0.25 }}>
                                {validThemes.reduce((s, t) => s + t.total_words, 0)} words · {validThemes.length} themes
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setThemesOpen(false)} size="small" aria-label="Close themes panel" sx={{ color: '#f5ede0', ml: 1 }}>
                            <Close sx={{ fontSize: '1.5rem' }} />
                        </IconButton>
                    </Box>

                    <Box sx={{ overflowY: 'auto', flex: 1, py: 0.5 }}>
                        {validThemes.map((theme) => {
                            const isActive = selectedTheme?.theme_id === theme.theme_id
                            return (
                                <Box
                                    key={theme.theme_id}
                                    onClick={() => {
                                        handleThemeSelect(theme)
                                        setThemesOpen(false)
                                    }}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                        px: 2.5, py: 1.5, cursor: 'pointer',
                                        background: isActive ? 'rgba(184,134,11,0.08)' : 'transparent',
                                        borderLeft: isActive ? '3px solid #b8860b' : '3px solid transparent',
                                        borderBottom: '1px solid rgba(184,134,11,0.07)',
                                        transition: 'all 0.15s',
                                        '&:hover': { background: isActive ? 'rgba(184,134,11,0.1)' : 'rgba(184,134,11,0.04)' },
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif', fontSize: '0.95rem',
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive ? '#2c1a0e' : '#3d3028', lineHeight: 1.25,
                                        }}>
                                            {theme.display_name}
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#9e8a7a' }}>
                                            {theme.total_words} words
                                        </Typography>
                                    </Box>
                                </Box>
                            )
                        })}
                    </Box>
                </Box>
            </Dialog>

            <SettingsDialog
                open={settingsOpen} onClose={() => setSettingsOpen(false)}
                showDiacritics={showDiacritics} onToggleDiacritics={() => setShowDiacritics(p => !p)}
                textScale={textScale} onTextScaleChange={setTextScale}
            />

            <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
                <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
                    {/* Breadcrumbs */}
                    <Breadcrumbs
                        separator={<NavigateNext sx={{ fontSize: 16, color: '#9e8a7a' }} />}
                        sx={{ mb: 2, '& .MuiBreadcrumbs-li': { fontFamily: 'Jost, sans-serif' } }}
                    >
                        <Link
                            underline="hover"
                            color="inherit"
                            onClick={() => router.push('/flashcards')}
                            sx={{ cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#7a6e65' }}
                        >
                            Flashcards
                        </Link>
                        <Link
                            underline="hover"
                            color="inherit"
                            onClick={() => router.push(`/flashcards/${slug}/themes`)}
                            sx={{ cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#7a6e65' }}
                        >
                            {label.split(' | ')[0]}
                        </Link>
                        {selectedTheme && (
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#2c1a0e', fontWeight: 600 }}>
                                {selectedTheme.display_name}
                            </Typography>
                        )}
                    </Breadcrumbs>

                    {/* Mobile controls */}
                    {selectedTheme && (
                        <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, mr: 1 }}>
                                {selectedTheme.display_name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                                <Button size="small" onClick={() => setThemesOpen(true)} variant="outlined" sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: '20px', px: 1.5, py: '4px', borderColor: 'rgba(14,46,31,0.35)', color: '#0e2e1f', '&:hover': { background: 'rgba(14,46,31,0.06)', borderColor: '#0e2e1f' } }}>Themes</Button>
                                <IconButton onClick={() => setSettingsOpen(true)} size="small" aria-label="Quiz settings" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}><Settings sx={{ fontSize: '1rem' }} /></IconButton>
                            </Box>
                        </Box>
                    )}

                    {/* Main content */}
                    {(themesLoading && !selectedTheme) || !themeTransitionReady ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '1fr 360px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                            <LoadingView label="Loading themes…" isLoading={themesLoading && !selectedTheme} />
                            <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.15)', borderRadius: '10px', overflow: 'hidden', display: { xs: 'none', lg: 'block' } }}>
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: 0 }} />
                                {[...Array(5)].map((_, i) => (
                                    <Box key={i} sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(184,134,11,0.07)', display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                        <Skeleton variant="circular" width={28} height={28} />
                                        <Box sx={{ flex: 1 }}><Skeleton variant="text" width="70%" height={14} /><Skeleton variant="text" width="40%" height={12} sx={{ mt: 0.5 }} /></Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '1fr 360px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                            <Box>
                                {selectedTheme && (
                                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.6rem', fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {selectedTheme.display_name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Button
                                                size="small"
                                                onClick={goToPreviousTheme}
                                                disabled={validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id) <= 0}
                                                startIcon={<NavigateBefore sx={{ fontSize: '1rem !important' }} />}
                                                sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.8rem', textTransform: 'none', borderRadius: '20px', px: 1.5, py: '4px', borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65', '&:hover': { background: 'rgba(122,110,101,0.06)', borderColor: '#7a6e65' }, '&:disabled': { opacity: 0.35, borderColor: 'rgba(122,110,101,0.15)' } }}
                                            >
                                                Prev
                                            </Button>
                                            <Button
                                                size="small"
                                                onClick={goToNextTheme}
                                                disabled={validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id) >= validThemes.length - 1}
                                                endIcon={<NavigateNext sx={{ fontSize: '1rem !important' }} />}
                                                sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.8rem', textTransform: 'none', borderRadius: '20px', px: 1.5, py: '4px', borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65', '&:hover': { background: 'rgba(122,110,101,0.06)', borderColor: '#7a6e65' }, '&:disabled': { opacity: 0.35, borderColor: 'rgba(122,110,101,0.15)' } }}
                                            >
                                                Next
                                            </Button>
                                        </Box>
                                    </Box>
                                )}
                                {isLoadingVocab || !vocabTransitionReady ? (
                                    <LoadingView label="Loading words…" isLoading={isLoadingVocab} />
                                ) : selectedTheme && activeQueue.length > 0 ? (
                                    <FlashcardQuiz
                                        textScale={textScale}
                                        key={quizKey}
                                        initialQueue={activeQueue}
                                        allExamples={activeExamples}
                                        showDiacritics={showDiacritics}
                                        onComplete={handleQuizComplete}
                                        initialCardIndex={initialCardIndex}
                                        isAdmin={isAdmin}
                                        onWordEdited={async () => {
                                            if (!selectedTheme) return
                                            const { vocab, examples } = await fetchTheme(selectedTheme.theme_id, level)
                                            setActiveQueue(vocab)
                                            setActiveExamples(examples)
                                            setQuizKey(k => k + 1)
                                        }}
                                        onWordDeleted={async () => {
                                            if (!selectedTheme) return
                                            const { vocab, examples } = await fetchTheme(selectedTheme.theme_id, level)
                                            setActiveQueue(vocab)
                                            setActiveExamples(examples)
                                            setQuizKey(k => k + 1)
                                        }}
                                    />
                                ) : selectedTheme ? (
                                    <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '2rem 1rem', md: '3rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center' }}>
                                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e' }}>
                                            No words yet
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#7a6e65', maxWidth: 400 }}>
                                            This theme doesn&apos;t have any words for <strong>{label}</strong> yet.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '2rem 1rem', md: '3rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center' }}>
                                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e' }}>
                                            {themesError ? 'Something went wrong' : 'No themes found'}
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#7a6e65', maxWidth: 400 }}>
                                            {themesError ?? `There are no themes for ${label} yet.`}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                            {validThemes.length > 0 && (
                                <Box sx={{ display: { xs: 'none', lg: 'block' }, position: 'sticky', top: 80, maxHeight: 'calc(100vh - 100px)' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                        <DesktopTextScaleSlider textScale={textScale} onChange={setTextScale} />
                                        <Box sx={{ width: 162, flexShrink: 0 }}>
                                            <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics(p => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                                        </Box>
                                    </Box>
                                    <ThemePlaylistSidebar
                                        themes={validThemes}
                                        selectedTheme={selectedTheme}
                                        onSelectTheme={(t) => handleThemeSelect(t)}
                                        label={label}
                                        onOpenTutorial={() => setTutorialOpen(true)}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}
                </Container>
            </Box>
            <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
        </>
    )
}
