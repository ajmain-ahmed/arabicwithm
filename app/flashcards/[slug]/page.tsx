'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { isAdminUser } from '@/app/actions/vocab'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    Box, Button, Container, Typography,
    Skeleton,
    IconButton, Dialog, Breadcrumbs, Link,
} from '@mui/material'
import {
    NavigateNext, NavigateBefore,
    Settings, Close, CheckCircle,
    Add, NavigateNext as NavigateNextIcon,
} from '@mui/icons-material'
import { useVocabStore } from '@/store/vocabStore'
import TutorialDialog, { useTutorialSeen } from '../components/TutorialDialog'
import AuthDialog from '@/app/components/AuthDialog'
import LoadingView from '../components/LoadingView'
import { PillToggle, DesktopTextScaleSlider, SettingsDialog } from '../components/QuizSettings'
import ThemePlaylistSidebar from '../components/ThemePlaylistSidebar'
import FlashcardQuiz from '../components/FlashcardQuiz'
import type { VocabRow, WordProgress, ThemeProgress, ExampleRow, FormRow } from '@/app/actions/vocab'


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

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type CardStatus = 'new' | 'revision' | 'completed'
type FilterType = 'all' | 'new' | 'revision' | 'completed'

type CardState = VocabRow & {
    status: CardStatus
}

function buildQueue(vocab: VocabRow[], progress: WordProgress[]): CardState[] {
    const progressMap = new Map(progress.map(p => [p.vocab_id, p]))
    return vocab.map(v => {
        const p = progressMap.get(v.id)
        const s = p?.status

        let status: CardStatus = 'new'
        if (s === 1) status = 'completed'
        else if (s === 0) status = 'revision'

        return { ...v, status }
    })
}

function themeDoneCount(t: { completed_count: number; revision_count: number }): number {
    return t.completed_count + t.revision_count
}

function themeProgressPct(t: { completed_count: number; revision_count: number; total_words: number }): number {
    return t.total_words > 0 ? Math.round((themeDoneCount(t) / t.total_words) * 100) : 0
}


/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
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
    const themeCache = useVocabStore(s => s.themeCache)

    const [themes, setThemes] = useState<ThemeProgress[]>([])
    const [themesLoading, setThemesLoading] = useState(true)
    const [themesError, setThemesError] = useState<string | null>(null)
    const [selectedTheme, setSelectedTheme] = useState<ThemeProgress | null>(null)
    const [activeQueue, setActiveQueue] = useState<CardState[]>([])
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
        if (!themesLoading && selectedTheme) {
            const timer = setTimeout(() => setThemeTransitionReady(true), 400)
            return () => clearTimeout(timer)
        } else {
            setThemeTransitionReady(false)
        }
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

    const flushRef = useRef<(() => Promise<void>) | null>(null)
    const flush = useCallback(() => flushRef.current?.() ?? Promise.resolve(), [])

    // Flush on tab hide or page unload — covers browser navigation and closing the tab
    useEffect(() => {
        const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
        const onBeforeUnload = () => { flush() }
        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [flush])

    // Fetch themes whenever level changes
    useEffect(() => {
        let cancelled = false
        setThemesLoading(true)
        setThemesError(null)
        setSelectedTheme(null)
        fetchThemeList(level)
            .then(async (data) => {
                if (cancelled) return
                setThemes(data)
                setThemesLoading(false)

                // If ?theme= query param is present, select that theme
                const targetTheme = themeQueryParam
                    ? data.find((t: ThemeProgress) => t?.theme_id === themeQueryParam)
                    : null

                if (targetTheme) {
                    await handleThemeSelect(targetTheme)
                } else {
                    const firstIncomplete = data.find((t: ThemeProgress) =>
                        t?.theme_id != null &&
                        (t.total_words === 0 || themeDoneCount(t) < t.total_words)
                    ) ?? data[0]

                    if (firstIncomplete) {
                        await handleThemeSelect(firstIncomplete)
                    }
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
    }, [slug, level, themeQueryParam])

    // Flush pending writes before switching themes, then load the new one
    const handleThemeSelect = useCallback(async (theme: ThemeProgress, cardIndex?: number) => {
        if (!theme?.theme_id) return
        await flush()  // <-- batch write happens here on theme switch
        setSelectedTheme(theme)
        try {
            const { vocab, progress, examples } = await fetchTheme(theme.theme_id, level)
            const queue = buildQueue(vocab, progress)
            setActiveQueue(queue)
            setActiveExamples(examples)

            if (cardIndex !== undefined) {
                setInitialCardIndex(cardIndex)
            } else {
                const firstIncomplete = queue.findIndex(c => c.status === 'new')
                setInitialCardIndex(firstIncomplete === -1 ? 0 : firstIncomplete)
            }

            setQuizKey(k => k + 1)
        } catch (err) {
            console.error(err)
            setActiveQueue([])
            setActiveExamples([])
            setInitialCardIndex(0)
        }
    }, [fetchTheme, level, flush])

    // Keep sidebar counts in sync with quiz actions
    const handleThemeProgressUpdate = useCallback((theme: string, progress: { completedCount: number; revisionCount: number }) => {
        setThemes(prev => prev.map(t =>
            t.theme_id === theme
                ? { ...t, completed_count: progress.completedCount, revision_count: progress.revisionCount }
                : t
        ))
        setSelectedTheme(prev => prev && prev.theme_id === theme
            ? { ...prev, completed_count: progress.completedCount, revision_count: progress.revisionCount }
            : prev
        )
    }, [])

    // Auto-advance to next unfinished theme
    const validThemes = useMemo(() => themes.filter((t) => t?.theme_id != null), [themes])

    const themesForSidebar = useMemo(() => {
        return validThemes.map(t => {
            const cacheKey = `${t.theme_id}:${level}`
            const cached = themeCache[cacheKey]
            if (cached) {
                const completed = cached.progress.filter(p => p.status === 1).length
                const revision = cached.progress.filter(p => p.status === 0).length
                return { ...t, completed_count: completed, revision_count: revision }
            }
            return t
        })
    }, [validThemes, themeCache, level])

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
        const nextTheme = validThemes.slice(currentIdx + 1).find(t =>
            t.total_words === 0 || themeDoneCount(t) < t.total_words
        )
        if (nextTheme) {
            handleThemeSelect(nextTheme)
        }
    }, [selectedTheme, validThemes, handleThemeSelect])

    const advanceToNextTheme = useCallback(() => {
        if (!selectedTheme) return
        const currentIdx = validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id)
        const nextTheme = validThemes.slice(currentIdx + 1).find(t =>
            t.total_words === 0 || themeDoneCount(t) < t.total_words
        )
        if (nextTheme) {
            handleThemeSelect(nextTheme)
        }
    }, [selectedTheme, validThemes, handleThemeSelect])

    const isLoadingVocab = selectedTheme != null && loadingThemeId === selectedTheme.theme_id

    useEffect(() => {
        if (!isLoadingVocab) {
            const timer = setTimeout(() => setVocabTransitionReady(true), 400)
            return () => clearTimeout(timer)
        } else {
            setVocabTransitionReady(false)
        }
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
                        {validThemes.map((theme, idx) => {
                            const progress = themeProgressPct(theme)
                            const isActive = selectedTheme?.theme_id === theme.theme_id
                            const isComplete = progress === 100

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
                                    <Box sx={{
                                        width: 32, height: 32, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '50%',
                                        background: isActive ? 'rgba(184,134,11,0.15)' : isComplete ? 'rgba(46,125,50,0.08)' : 'rgba(122,110,101,0.08)',
                                    }}>
                                        {isComplete ? <CheckCircle sx={{ fontSize: '1.1rem', color: '#2e7d32' }} />
                                            : isActive ? <Box sx={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #b8860b', ml: '2px' }} />
                                                : <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#7a6e65' }}>{idx + 1}</Typography>
                                        }
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif', fontSize: '0.95rem',
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive ? '#2c1a0e' : '#3d3028', lineHeight: 1.25,
                                        }}>
                                            {theme.display_name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.4 }}>
                                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#9e8a7a' }}>
                                                {theme.total_words} words
                                            </Typography>
                                            {theme.revision_count > 0 && (
                                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#1565c0' }}>
                                                    · {theme.revision_count} revision
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, background: 'rgba(184,134,11,0.1)', overflow: 'hidden' }}>
                                            <Box sx={{
                                                height: '100%', borderRadius: 2, width: `${progress}%`,
                                                background: isComplete ? 'linear-gradient(90deg, #2e7d32, #4caf50)' : 'linear-gradient(90deg, #b8860b, #d4a843)',
                                                transition: 'width 0.4s ease',
                                            }} />
                                        </Box>
                                    </Box>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', fontWeight: 600,
                                        color: isComplete ? '#2e7d32' : isActive ? '#b8860b' : '#9e8a7a', flexShrink: 0,
                                    }}>
                                        {progress}%
                                    </Typography>
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
                        separator={<NavigateNextIcon sx={{ fontSize: 16, color: '#9e8a7a' }} />}
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

                    {/* Mobile controls -->
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
                                        <Box sx={{ flex: 1 }}><Skeleton variant="text" width="70%" height={14} /><Skeleton variant="text" width="40%" height={12} sx={{ mt: 0.5 }} /><Skeleton variant="rounded" height={3} width="100%" sx={{ mt: 0.75, borderRadius: 2 }} /></Box>
                                        <Skeleton variant="text" width={28} height={12} />
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
                                        theme={selectedTheme.theme_id}
                                        allExamples={activeExamples}
                                        showDiacritics={showDiacritics}

                                        onComplete={handleQuizComplete}
                                        themeLabel={selectedTheme.display_name}
                                        totalInTheme={selectedTheme.total_words}
                                        alreadyCompletedCount={themeDoneCount(selectedTheme)}
                                        initialCardIndex={initialCardIndex}
                                        flushRef={flushRef}
                                        levelCode={level}
                                        onThemeProgressUpdate={handleThemeProgressUpdate}
                                        onOpenAuthDialog={() => setAuthDialogOpen(true)}
                                        isAdmin={isAdmin}
                                        onWordEdited={async () => {
                                            if (!selectedTheme) return
                                            await flush()
                                            const { vocab, progress, examples } = await fetchTheme(selectedTheme.theme_id, level)
                                            setActiveQueue(buildQueue(vocab, progress))
                                            setActiveExamples(examples)
                                            setQuizKey(k => k + 1)
                                        }}
                                        onWordDeleted={async () => {
                                            if (!selectedTheme) return
                                            await flush()
                                            const { vocab, progress, examples } = await fetchTheme(selectedTheme.theme_id, level)
                                            setActiveQueue(buildQueue(vocab, progress))
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
                                        themes={themesForSidebar}
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