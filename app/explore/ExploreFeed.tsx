'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowForward, ExploreOutlined, KeyboardArrowDown, KeyboardArrowUp, MenuBook, PlayCircleOutlineRounded, PsychologyOutlined, VolumeOff, VolumeUp } from '@mui/icons-material'
import { Box, Button, Chip, CircularProgress, IconButton, Popover, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import { WordTooltip, HtmlTooltip, MobileDefinitionSheet, type VocabEntry } from '@/app/components/vocab-tooltip'
import CefrChip from '@/app/components/CefrChip'
import SocialVideoEmbed from '@/app/components/SocialVideoEmbed'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { getEpisodeVideoSources, getYouTubeThumbnailUrl, type ExploreEpisode, type VideoProvider } from '@/app/lib/cartoons'
import type { ExploreBookPage } from '@/app/actions/books'
import { dispatchWordLookup } from '@/app/lib/activity'
import { usePlayerStore } from '@/store/playerStore'
import { useExploreFeedCache } from '@/store/exploreFeedStore'
import { LoadingCircle } from '@/app/components/PageLoading'
import { fetchExploreFeedPage } from '@/app/actions/explore'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'
import {
  EXPLORE_PREFETCH_AHEAD,
  EXPLORE_READING_DURATION_MS,
  definitionCacheKey,
  getExploreSoundPreference,
  nextExploreIndex,
  setExploreSoundPreference,
  subscribeToExploreSoundPreference,
  type ExploreFeedItem,
} from '@/app/lib/explore'

function feedItemKey(item: ExploreFeedItem): string {
  return item.kind === 'video' ? `video:${item.episode.id}` : `book:${item.page.id}`
}

type OpenDefinition = (
  entry: VocabEntry,
  anchor: HTMLElement,
  context: string,
  itemIndex: number,
) => void

interface SelectedDefinition {
  cacheKey: string
  entry: VocabEntry
  anchor: HTMLElement
  itemIndex: number
}

function ExploreDefinitionWord({
  entry,
  context,
  itemIndex,
  onOpen,
  onPeek,
}: {
  entry: VocabEntry
  context: string
  itemIndex: number
  onOpen: OpenDefinition
  onPeek: (itemIndex: number | null) => void
}) {
  const theme = useTheme()
  /* Same breakpoint as the episode page: below lg, taps open the shared
     definition popover; at lg and above, hovering opens an instant tooltip. */
  const isTouchLayout = useMediaQuery(theme.breakpoints.down('lg'))
  const [hoverOpen, setHoverOpen] = useState(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    clearLeaveTimer()
    leaveTimerRef.current = setTimeout(() => {
      setHoverOpen(false)
      onPeek(null)
    }, 60)
  }, [clearLeaveTimer, onPeek])

  const handleHoverOpen = useCallback(() => {
    clearLeaveTimer()
    setHoverOpen(true)
    onPeek(itemIndex)
    dispatchWordLookup()
  }, [clearLeaveTimer, itemIndex, onPeek])

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer])

  const wordStyles = {
    display: 'inline-block',
    mx: '0.1em',
    cursor: 'pointer',
    borderBottom: '2px dotted var(--awm-gold)',
    transition: 'background-color .12s ease',
    '&:hover, &:focus-visible': { bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', outline: 'none' },
  } as const

  if (isTouchLayout) {
    const open = (target: HTMLElement) => onOpen(entry, target, context, itemIndex)
    return (
      <Box
        component="span"
        className="vocab-word"
        role="button"
        tabIndex={0}
        aria-label={`Show definition for ${entry.arabic}`}
        onClick={(event) => {
          event.stopPropagation()
          open(event.currentTarget)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          open(event.currentTarget)
        }}
        sx={wordStyles}
      >
        {entry.arabic}
      </Box>
    )
  }

  return (
    <HtmlTooltip
      open={hoverOpen}
      title={
        hoverOpen ? (
          <Box
            onMouseEnter={clearLeaveTimer}
            onMouseLeave={scheduleClose}
            sx={{ p: 2.5 }}
          >
            <WordTooltip entry={entry} />
          </Box>
        ) : (
          <></>
        )
      }
      placement="bottom"
      arrow
      describeChild
      disableHoverListener
      disableFocusListener
      disableTouchListener
      slotProps={{
        popper: {
          modifiers: [
            { name: 'preventOverflow', enabled: true, options: { padding: 16, boundary: 'viewport' } },
            { name: 'flip', enabled: true, options: { padding: 16 } },
          ],
        },
      }}
    >
      <Box
        component="span"
        className="vocab-word"
        onMouseEnter={handleHoverOpen}
        onMouseLeave={scheduleClose}
        sx={wordStyles}
      >
        {entry.arabic}
      </Box>
    </HtmlTooltip>
  )
}

function ExploreVideo({
  episode,
  active,
  onEnded,
  onPlaybackChange,
  soundEnabled,
  railTop,
  onPrev,
  onNext,
  onStarted,
}: {
  episode: ExploreEpisode
  active: boolean
  onEnded: () => void
  onPlaybackChange: (playing: boolean) => void
  soundEnabled: boolean
  railTop?: ReactNode
  onPrev?: () => void
  onNext?: () => void
  onStarted?: () => void
}) {
  const isPhone = useMediaQuery('(max-width:899.95px)')
  const sources = useMemo(() => getEpisodeVideoSources(episode), [episode])
  const [selectedProvider, setSelectedProvider] = useState<VideoProvider | undefined>(sources[0]?.provider)
  const soundBlockedRef = useRef(false)
  const source = sources.find((candidate) => candidate.provider === selectedProvider) ?? sources[0]
  const isYouTube = source?.provider === 'youtube'
  const {
    wrapRef,
    isReady,
    isPlaying,
    isMuted,
    playVideo,
    pauseVideo,
    mute,
    unMute,
    playWithSound,
    autoplayBlocked,
    errorCode,
  } = useYouTubePlayer(
    active && isYouTube ? source.id : undefined,
    undefined,
    undefined,
    { autoplay: true, muted: !soundEnabled, verifySoundState: isPhone, mutedAutoplayFallback: isPhone, onEnded }
  )
  /* The player is the source of truth once ready: the user can also unmute
     or change volume with YouTube's own controls, which fire onVolumeChange. */
  const phoneMuted = isPhone && isMuted
  const soundMuted = isReady ? isMuted : !soundEnabled

  useEffect(() => {
    if (!active) return
    onPlaybackChange(isPlaying)
  }, [active, isPlaying, onPlaybackChange])

  useEffect(() => {
    if (!isReady) return
    if (!active) {
      pauseVideo()
      return
    }
    // One policy rejection enables a muted fallback for this player. Starting
    // that fallback must not trigger another automatic unmute/play loop.
    if (autoplayBlocked || (phoneMuted && soundEnabled)) soundBlockedRef.current = true
    if (soundEnabled && !soundBlockedRef.current) unMute()
    else mute()
    playVideo()
    onStarted?.()
  }, [active, autoplayBlocked, phoneMuted, isReady, mute, pauseVideo, playVideo, soundEnabled, unMute, onStarted])

  useEffect(() => {
    const requestSound = () => {
      if (!active || !isReady || !soundEnabled || !soundBlockedRef.current) return
      soundBlockedRef.current = false
      playWithSound()
    }
    window.addEventListener('awm-explore-gesture', requestSound)
    return () => window.removeEventListener('awm-explore-gesture', requestSound)
  }, [active, isReady, playWithSound, soundEnabled])

  const toggleSound = () => {
    if (soundMuted) {
      soundBlockedRef.current = false
      setExploreSoundPreference(true)
      playWithSound()
    } else {
      setExploreSoundPreference(false)
      mute()
    }
  }

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: { md: 'center' },
          justifyContent: { md: 'center' },
          gap: { md: 1.5 },
        }}
      >
        {/* 9:16 frame sized to the available height (container units), so the
            player never letterboxes. Desktop: card + action rail as a row. */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'center', gap: { md: 2.25 }, containerType: 'size', width: '100%' }}>
        {/* Prev/next chevrons at the left midpoint of the video (desktop). */}
        {(onPrev || onNext) && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 1.25, alignItems: 'center', alignSelf: 'center', flexShrink: 0 }}>
            <Tooltip title="Previous video" placement="right">
              <IconButton
                onClick={onPrev}
                aria-label="Previous video"
                sx={{
                  width: 50, height: 50,
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.14)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.24)', transform: 'scale(1.08)' },
                  '&:active': { transform: 'scale(.95)' },
                  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
                }}
              >
                <KeyboardArrowUp />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next video" placement="right">
              <IconButton
                onClick={onNext}
                aria-label="Next video"
                sx={{
                  width: 50, height: 50,
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.14)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.24)', transform: 'scale(1.08)' },
                  '&:active': { transform: 'scale(.95)' },
                  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
                }}
              >
                <KeyboardArrowDown />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box
          data-explore-player={active ? 'active' : 'inactive'}
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            height: { xs: '100%', md: 'auto' },
            aspectRatio: { xs: 'auto', md: '9 / 16' },
            /* Mobile fills the stage; desktop retains the height-fitted 9:16 card. */
            '@supports (width: 1cqh)': { width: { xs: '100%', md: 'min(100%, 56.25cqh)' } },
            overflow: 'hidden',
            borderRadius: { xs: 0, md: '20px' },
            boxShadow: { xs: 'none', md: '0 30px 80px rgba(0,0,0,0.55)' },
            border: { md: '1px solid rgba(255,255,255,0.08)' },
          }}
        >
        {!active && episode.cover && (
          <Box
            component="img"
            src={episode.cover ?? getYouTubeThumbnailUrl(episode.youtubeId) ?? ''}
            alt=""
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1, ...thumbnailCropCss(episode.coverCrop) }}
          />
        )}
        {active && source?.provider !== 'youtube' && source && (
          <SocialVideoEmbed source={source} autoplay muted={soundMuted} title={episode.title} />
        )}
        <Box
          ref={wrapRef}
          sx={{
            display: isYouTube ? 'block' : 'none',
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
        {sources.length > 1 && (
          <Box sx={{ position: 'absolute', zIndex: 3, bottom: { xs: 'max(14px, env(safe-area-inset-bottom))', md: 14 }, left: { xs: 'max(14px, env(safe-area-inset-left))', md: 14 }, right: { xs: 'max(76px, calc(env(safe-area-inset-right) + 62px))', md: 76 }, display: 'flex', gap: 0.65, flexWrap: 'wrap' }}>
            {sources.map((candidate) => (
              <Chip
                key={candidate.provider}
                label={candidate.label}
                clickable
                onClick={() => setSelectedProvider(candidate.provider)}
                size="small"
                sx={{
                  height: 27,
                  bgcolor: candidate.provider === source?.provider ? '#d4a843' : 'rgba(0,0,0,0.62)',
                  color: candidate.provider === source?.provider ? '#0e2e1f' : '#fff',
                  fontFamily: 'var(--font-sans), sans-serif',
                  fontWeight: 700,
                  '&:hover': { bgcolor: candidate.provider === source?.provider ? '#d4a843' : 'rgba(0,0,0,0.8)' },
                }}
              />
            ))}
          </Box>
        )}
        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', zIndex: 3, left: 0, right: 0, bottom: 0, px: 2.25, pb: 2, pt: 6, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.72))', pointerEvents: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
            <CefrChip level={episode.level} size="small" />
            {episode.tags.slice(0, 2).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', height: 22, fontSize: 11 }} />)}
          </Box>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 600, color: '#fff', lineHeight: 1.25, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
            {episode.title}
          </Typography>
          <Typography sx={{ mt: 0.35, fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            {episode.showTitle}
          </Typography>
        </Box>
        {errorCode != null && isYouTube && (
          <Box sx={{ position: 'absolute', zIndex: 5, inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,0,0,0.82)', p: 3 }}>
            <Box sx={{ textAlign: 'center', color: '#fff' }}>
              <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700 }}>This video cannot be played here.</Typography>
              <Typography sx={{ mt: 0.5, mb: 1.5, fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, opacity: 0.78 }}>It may be unavailable or restricted from embedded playback.</Typography>
              <Button component="a" href={`https://www.youtube.com/watch?v=${encodeURIComponent(source.id)}`} target="_blank" rel="noopener noreferrer" variant="contained" endIcon={<ArrowForward />} sx={{ bgcolor: '#b8860b', color: '#fff', textTransform: 'none' }}>
                Open on YouTube
              </Button>
            </Box>
          </Box>
        )}
        </Box>
        <Box sx={{
          position: { xs: 'absolute', md: 'static' },
          zIndex: 4,
          right: { xs: 'max(6px, env(safe-area-inset-right))', md: 'auto' },
          top: { xs: '50%', md: 'auto' },
          transform: { xs: 'translateY(-50%)', md: 'none' },
          mb: { md: 2.5 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 0.85, md: 1.4 },
        }}>
          {railTop}
          {/* A native fallback uses YouTube's controls without API commands. */}
          {(!isYouTube || isReady) && <Tooltip title={soundMuted ? 'Turn sound on' : 'Mute'} placement="left">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                onClick={toggleSound}
                aria-label={soundMuted ? 'Turn Explore sound on' : 'Mute Explore video'}
                sx={{
                  width: { xs: 44, md: 50 }, height: { xs: 44, md: 50 },
                  color: { xs: 'var(--awm-gold-light)', md: '#fff' },
                  bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.14)' },
                  filter: { xs: 'drop-shadow(0 1px 3px #000)', md: 'none' },
                  '&:hover': { bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.24)' }, transform: 'scale(1.08)' },
                  '&:active': { transform: 'scale(.95)' },
                  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
                }}
              >
                {soundMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
              <Typography sx={{ display: { xs: 'none', md: 'block' }, fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{soundMuted ? 'Sound' : 'Mute'}</Typography>
            </Box>
          </Tooltip>}
          <Tooltip title="Go to episode" placement="left">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                component={Link}
                href={`/cartoons/${episode.showSlug}/${episode.slug}`}
                aria-label={`Go to episode: ${episode.title}`}
                sx={{
                  width: { xs: 44, md: 50 }, height: { xs: 44, md: 50 },
                  color: { xs: 'var(--awm-gold-light)', md: '#fff' },
                  bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.14)' },
                  filter: { xs: 'drop-shadow(0 1px 3px #000)', md: 'none' },
                  '&:hover': { bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.24)' }, transform: 'scale(1.08)' },
                  '&:active': { transform: 'scale(.95)' },
                  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
                }}
              >
                <PlayCircleOutlineRounded />
              </IconButton>
              <Typography sx={{ display: { xs: 'none', md: 'block' }, fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Full episode</Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Practise this episode in Memory" placement="left">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                component={Link}
                href={`/memory?episode=${encodeURIComponent(episode.id)}`}
                aria-label={`Practise ${episode.title} in Memory`}
                sx={{
                  width: { xs: 44, md: 50 }, height: { xs: 44, md: 50 },
                  color: { xs: 'var(--awm-gold-light)', md: '#fff' },
                  bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.14)' },
                  filter: { xs: 'drop-shadow(0 1px 3px #000)', md: 'none' },
                  '&:hover': { bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.24)' }, transform: 'scale(1.08)' },
                  '&:active': { transform: 'scale(.95)' },
                  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
                }}
              >
                <PsychologyOutlined />
              </IconButton>
              <Typography sx={{ display: { xs: 'none', md: 'block' }, fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Memory</Typography>
            </Box>
          </Tooltip>
        </Box>
        </Box>

      </Box>

    </>
  )
}

function ExploreBookPageSlide({ page, itemIndex, onDefinitionOpen, onDefinitionPeek }: { page: ExploreBookPage; itemIndex: number; onDefinitionOpen: OpenDefinition; onDefinitionPeek: (itemIndex: number | null) => void }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        px: { xs: 1.5, sm: 3, md: 6 },
        pt: { xs: 1.5, md: 3 },
        pb: { xs: 'calc(12px + env(safe-area-inset-bottom))', md: 3 },
      }}
    >
      <Box
        sx={{
          width: 'min(920px, 100%)',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid color-mix(in srgb, var(--awm-gold) 24%, transparent)',
          borderRadius: { xs: '16px', md: '22px' },
          bgcolor: 'var(--awm-white)',
          boxShadow: '0 22px 60px rgba(44,26,14,0.12)',
        }}
      >
        <Box sx={{ px: { xs: 2.25, md: 4 }, py: { xs: 1.75, md: 2.5 }, bgcolor: '#0e2e1f', color: '#fff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MenuBook sx={{ color: '#d4a843', fontSize: 20 }} />
            <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', color: '#d4a843', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Random reading · Page {page.pageNumber}
            </Typography>
          </Box>
          <Typography component="h2" sx={{ mt: 0.6, fontFamily: 'var(--font-heading)', fontSize: { xs: 23, md: 30 }, fontWeight: 600, lineHeight: 1.15 }}>
            {page.bookTitle}
          </Typography>
          <Typography sx={{ mt: 0.4, fontFamily: 'var(--font-sans), sans-serif', fontSize: 12.5, opacity: 0.76 }}>
            Chapter {page.chapterNumber}: {page.chapterTitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2.25, md: 4 }, py: { xs: 1.5, md: 2.5 } }}>
          {page.blocks.map((block, blockIndex) => (
            <Box key={blockIndex} sx={{ py: { xs: 1, md: 1.35 }, borderBottom: blockIndex < page.blocks.length - 1 ? '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)' : 0 }}>
              <Typography component="div" lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-book-naskh), var(--font-serif), serif', fontSize: { xs: 22, md: 28 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.85, textAlign: 'right' }}>
                {block.words.map((word, wordIndex) => (
                  <ExploreDefinitionWord
                    key={`${word.plain}-${wordIndex}`}
                    entry={word}
                    context={`book:${page.id}:block:${blockIndex}`}
                    itemIndex={itemIndex}
                    onOpen={onDefinitionOpen}
                    onPeek={onDefinitionPeek}
                  />
                ))}
                {block.punctuation}
              </Typography>
              {block.translation && (
                <Typography sx={{ mt: 0.35, fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13, md: 14.5 }, color: 'var(--awm-muted)', lineHeight: 1.6 }}>
                  {block.translation}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Box sx={{ px: { xs: 2.25, md: 4 }, py: { xs: 1.5, md: 2 }, borderTop: '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)' }}>
          <Button
            component={Link}
            href={`/books/${encodeURIComponent(page.bookSlug)}/${encodeURIComponent(page.chapterSlug)}`}
            fullWidth
            variant="contained"
            endIcon={<ArrowForward />}
            sx={{ bgcolor: '#0e2e1f', color: '#fff', borderRadius: '10px', py: 1.1, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#174832' } }}
          >
            Continue to chapter
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default function ExploreFeed({ railTop }: { railTop?: ReactNode }) {
  const theme = useTheme()
  const [hydrated,setHydrated] = useState(false)
  useEffect(()=>setHydrated(true),[])
  const videosOnly = useMediaQuery(theme.breakpoints.down('md'))
  const isMobileDefinitionLayout = useMediaQuery(theme.breakpoints.down('lg'))
  const setGlobalVideoPlaying = usePlayerStore((state) => state.setIsPlaying)
  const soundEnabled = useSyncExternalStore(subscribeToExploreSoundPreference, getExploreSoundPreference, () => true)
  /* Session cache: returning visitors restore the feed instantly and only a
     fresh batch is fetched; first-time visitors fetch page 0 client-side. */
  const cachedItems = useExploreFeedCache((state) => state.items)
  const setCachedItems = useExploreFeedCache((state) => state.setItems)
  const [items, setItems] = useState<ExploreFeedItem[]>(()=>cachedItems.filter(item=>!videosOnly||item.kind==='video'))
  useEffect(()=>{if(videosOnly)setItems(current=>current.filter(item=>item.kind==='video'))},[videosOnly])
  const [hasMore, setHasMore] = useState(cachedItems.length > 0)
  const [initialLoaded, setInitialLoaded] = useState(cachedItems.length > 0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedDefinition, setSelectedDefinition] = useState<SelectedDefinition | null>(null)
  /* Peek state is kept in a ref on purpose: every hover/leave writes it, and a
     useState here would re-render the whole feed (videos + all text) on each
     word hover, which makes the definition tooltip janky. The auto-advance
     timer below polls the ref. */
  const peekItemIndexRef = useRef<number | null>(null)
  const [pageVisible, setPageVisible] = useState(true)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<number, HTMLElement>())
  const definitionCacheRef = useRef(new Map<string, VocabEntry>())
  const activeIndexRef = useRef(0)
  const advancedFromRef = useRef<number | null>(null)
  const programmaticTargetRef = useRef<number | null>(null)
  const scrollLockUntilRef = useRef(0)
  const seedRef = useRef(crypto.randomUUID())
  const nextPageRef = useRef(1)
  const loadingBatchRef = useRef(false)
  const seenKeysRef = useRef(new Set(cachedItems.map(feedItemKey)))
  const initialLoadStartedRef = useRef(false)
  /* On a cached return visit the user lands on the first FRESH item, with the
     previously watched items scrollable above it. */
  const restoreCountRef = useRef(cachedItems.length)
  const startAtRef = useRef<number | null>(null)

  /* Keep the session cache in sync so a remount (or the For You view) can
     restore without re-fetching. Only the WATCHED prefix is cached: on return
     the feed lands on a fresh video with exactly the previously watched items
     scrollable above it. watchedCount grows only when a video actually starts
     playing, so transient scroll events can't inflate the cache. */
  const [watchedCount, setWatchedCount] = useState(cachedItems.length > 0 ? cachedItems.length : 1)
  useEffect(() => {
    setCachedItems(items.slice(0, watchedCount))
  }, [items, watchedCount, setCachedItems])

  useEffect(() => {
    if (!hydrated || initialLoadStartedRef.current) return
    initialLoadStartedRef.current = true
    const restore = cachedItems.length > 0
    setItems((current) => (restore ? current : []))
    setLoadingMore(true)
    void fetchExploreFeedPage(seedRef.current, 0, videosOnly)
      .then((batch) => {
        const fresh = batch.items.filter(item=>!videosOnly||item.kind==='video').filter((item) => {
          const key = feedItemKey(item)
          if (seenKeysRef.current.has(key)) return false
          seenKeysRef.current.add(key)
          return true
        })
        setItems((current) => [...current, ...fresh])
        setHasMore(batch.hasMore)
        nextPageRef.current = 1
        if (restoreCountRef.current > 0 && fresh.length > 0) {
          startAtRef.current = restoreCountRef.current
        }
      })
      .catch(() => undefined)
      .finally(() => {
        setLoadingMore(false)
        setInitialLoaded(true)
      })
  }, [cachedItems, videosOnly, hydrated])

  const loadNextBatch = useCallback(async () => {
    if (loadingBatchRef.current || !hasMore) return
    loadingBatchRef.current = true
    setLoadingMore(true)
    try {
      const batch = await fetchExploreFeedPage(seedRef.current, nextPageRef.current, videosOnly)
      nextPageRef.current += 1
      const fresh = batch.items.filter(item=>!videosOnly||item.kind==='video').filter((item) => {
        const key = feedItemKey(item)
        if (seenKeysRef.current.has(key)) return false
        seenKeysRef.current.add(key)
        return true
      })
      if (fresh.length > 0) setItems((current) => [...current, ...fresh])
      setHasMore(batch.hasMore)
    } catch {
      // Leave hasMore set so a later approach retries the same page.
    } finally {
      loadingBatchRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, videosOnly])

  useEffect(() => {
    if (activeIndex >= items.length - EXPLORE_PREFETCH_AHEAD) void loadNextBatch()
  }, [activeIndex, items.length, loadNextBatch])

  const setItemRef = useCallback((index: number, node: HTMLElement | null) => {
    if (node) itemRefs.current.set(index, node)
    else itemRefs.current.delete(index)
  }, [])

  const activateIndex = useCallback((index: number) => {
    if (activeIndexRef.current === index) return
    activeIndexRef.current = index
    advancedFromRef.current = null
    setSelectedDefinition(null)
    peekItemIndexRef.current = null
    setActiveIndex(index)
  }, [])

  const advanceOnce = useCallback((fromIndex: number) => {
    if (activeIndexRef.current !== fromIndex || advancedFromRef.current === fromIndex) return
    const nextIndex = nextExploreIndex(fromIndex, items.length)
    if (nextIndex === null) return

    advancedFromRef.current = fromIndex
    activeIndexRef.current = nextIndex
    programmaticTargetRef.current = nextIndex
    scrollLockUntilRef.current = Date.now() + 1_000
    setSelectedDefinition(null)
    peekItemIndexRef.current = null
    setActiveIndex(nextIndex)
    itemRefs.current.get(nextIndex)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [items.length])

  /* Manual prev/next navigation (chevron buttons) — same bookkeeping as the
     auto-advance path so the IntersectionObserver doesn't fight the scroll. */
  const goToIndex = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return
    programmaticTargetRef.current = index
    scrollLockUntilRef.current = Date.now() + 1_000
    setSelectedDefinition(null)
    peekItemIndexRef.current = null
    activeIndexRef.current = index
    setActiveIndex(index)
    itemRefs.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [items.length])

  /* Cached return visit: once the fresh batch has been appended, land on the
     first new item so earlier (cached) items sit above it. */
  useEffect(() => {
    const target = startAtRef.current
    if (target == null || items.length <= target) return
    startAtRef.current = null
    goToIndex(target)
  }, [items.length, goToIndex])

  const openDefinition = useCallback<OpenDefinition>((entry, anchor, context, itemIndex) => {
    anchor.focus({ preventScroll: true })
    const cacheKey = definitionCacheKey(context, entry)
    const cachedEntry = definitionCacheRef.current.get(cacheKey) ?? entry
    definitionCacheRef.current.set(cacheKey, cachedEntry)
    setSelectedDefinition({ cacheKey, entry: cachedEntry, anchor, itemIndex })
    dispatchWordLookup()
  }, [])

  const handleDefinitionPeek = useCallback((index: number | null) => {
    peekItemIndexRef.current = index
  }, [])

  useEffect(() => () => setGlobalVideoPlaying(false), [setGlobalVideoPlaying])

  /* Tab visibility only gates book auto-advance. Videos deliberately keep
     playing while the tab is hidden so returning users resume mid-video
     instead of restarting it. */
  useEffect(() => {
    const handleVisibility = () => setPageVisible(document.visibilityState === 'visible')
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    if (!pageVisible || items[activeIndex]?.kind !== 'book') return
    if (selectedDefinition?.itemIndex === activeIndex) return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      // Paused while a definition is peeked for this page.
      if (peekItemIndexRef.current === activeIndex) return
      if (Date.now() - startedAt < EXPLORE_READING_DURATION_MS) return
      window.clearInterval(timer)
      advanceOnce(activeIndex)
    }, 250)
    return () => window.clearInterval(timer)
  }, [activeIndex, advanceOnce, items, pageVisible, selectedDefinition?.itemIndex])

  useEffect(() => {
    const root = feedRef.current
    if (!root) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
      if (!visible) return
      const visibleIndex = Number((visible.target as HTMLElement).dataset.index ?? 0)
      if (Date.now() < scrollLockUntilRef.current && programmaticTargetRef.current !== visibleIndex) return
      if (programmaticTargetRef.current === visibleIndex) programmaticTargetRef.current = null
      activateIndex(visibleIndex)
    }, { root, threshold: [0.55, 0.7, 0.85] })
    itemRefs.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [activateIndex, items])

  if (items.length === 0 && !initialLoaded) {
    return (
      <Box sx={{ height: { xs: 'calc(100dvh - var(--awm-navbar-height) - env(safe-area-inset-bottom, 0px))', md: 'calc(100dvh - var(--awm-navbar-height) - var(--awm-explore-switch-height, 0px))' }, bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' }, display: 'grid', placeItems: 'center' }}>
        <LoadingCircle size={62} dark />
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center', bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' } }}>
        <Box><ExploreOutlined sx={{ fontSize: 54, color: 'var(--awm-gold)' }} /><Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 30, color: { xs: 'var(--awm-bark)', md: '#f5ede0' } }}>No videos to explore yet</Typography></Box>
      </Box>
    )
  }

  return (
      <Box sx={{ position: 'relative', height: { xs: 'calc(100dvh - var(--awm-navbar-height) - env(safe-area-inset-bottom, 0px))', md: 'calc(100dvh - var(--awm-navbar-height) - var(--awm-explore-switch-height, 0px))' }, '@supports (height: 100dvh)': { height: { xs: 'calc(100dvh - var(--awm-navbar-height) - env(safe-area-inset-bottom, 0px))', md: 'calc(100dvh - var(--awm-navbar-height) - var(--awm-explore-switch-height, 0px))' } }, minHeight: { xs: 0, md: 'calc(100vh - var(--awm-navbar-height) - var(--awm-explore-switch-height, 0px))' } }}>
      <Box
        id="explore-feed"
        ref={feedRef}
        onPointerDownCapture={() => window.dispatchEvent(new Event('awm-explore-gesture'))}
      component="div"
      sx={{
        height: '100%',
        width: '100%',
        maxWidth: '100vw',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollSnapType: 'y mandatory',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
        /* TikTok-style: the feed scrolls but never shows a scrollbar. */
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        /* Desktop is a TikTok-style immersive stage; mobile keeps the cream page. */
        bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' },
        ...(isMobileDefinitionLayout && selectedDefinition ? { overflowY: 'hidden' } : {}),
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.kind === 'video' ? `video-${item.episode.id}` : `book-${item.page.id}-${index}`}
          ref={(node: HTMLElement | null) => setItemRef(index, node)}
          data-index={index}
          component="section"
          sx={{
            height: '100%',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            display: item.kind === 'video' ? 'grid' : 'block',
            gridTemplateColumns: '1fr',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: { xs: 0, md: 2.5 },
            maxWidth: 1536,
            mx: 'auto',
            px: { xs: 0, md: 3, lg: 5 },
            py: { xs: 0, md: 2 },
            position: 'relative',
            bgcolor: { xs: 'var(--awm-cream-light)', md: 'transparent' },
          }}
        >
          {item.kind === 'video' ? (
            <>
              <ExploreVideo
                episode={item.episode}
                active={index === activeIndex}
                onEnded={() => advanceOnce(index)}
                onPlaybackChange={setGlobalVideoPlaying}
                soundEnabled={soundEnabled}
                railTop={index === activeIndex ? railTop : undefined}
                onPrev={() => goToIndex(activeIndex <= 0 ? items.length - 1 : activeIndex - 1)}
                onNext={() => goToIndex(items.length === 0 ? 0 : (activeIndex + 1) % items.length)}
                onStarted={() => setWatchedCount((count) => Math.max(count, index + 1))}
              />
            </>
          ) : (
            <ExploreBookPageSlide page={item.page} itemIndex={index} onDefinitionOpen={openDefinition} onDefinitionPeek={handleDefinitionPeek} />
          )}
      </Box>
      ))}
      {loadingMore && (
        <Box component="section" sx={{ height: '100%', display: 'grid', placeItems: 'center', bgcolor: { xs: 'var(--awm-cream-light)', md: 'transparent' } }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={34} sx={{ color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1.5, fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: { xs: 'var(--awm-muted)', md: 'rgba(245,237,224,0.7)' } }}>Loading more…</Typography>
          </Box>
        </Box>
      )}
      {!loadingMore && !hasMore && items.length > 1 && (
        <Box component="section" sx={{ height: '100%', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center', bgcolor: { xs: 'var(--awm-cream-light)', md: 'transparent' } }}>
          <Box>
            <ExploreOutlined sx={{ fontSize: 54, color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 30, color: { xs: 'var(--awm-bark)', md: '#f5ede0' } }}>You&apos;ve explored it all</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: 'var(--font-sans), sans-serif', fontSize: 14, color: { xs: 'var(--awm-muted)', md: 'rgba(245,237,224,0.7)' } }}>Keep scrolling to start back at the beginning.</Typography>
          </Box>
        </Box>
      )}
      {isMobileDefinitionLayout ? (
        <MobileDefinitionSheet
          open={Boolean(selectedDefinition)}
          entry={selectedDefinition?.entry ?? null}
          onClose={() => setSelectedDefinition(null)}
        />
      ) : (
        <Popover
          open={Boolean(selectedDefinition)}
          anchorEl={selectedDefinition?.anchor ?? null}
          onClose={() => setSelectedDefinition(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          slotProps={{ paper: { sx: { mt: 1, width: 'min(320px, calc(100vw - 28px))', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)', boxShadow: '0 14px 42px rgba(44,26,14,.2)' } } }}
        >
          {selectedDefinition && <Box key={selectedDefinition.cacheKey} sx={{ p: 2.5 }}><WordTooltip entry={selectedDefinition.entry} /></Box>}
        </Popover>
      )}
    </Box>
    </Box>
  )
}
