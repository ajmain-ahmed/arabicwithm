'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowForward, ExploreOutlined, MenuBook, PlayCircleOutlineRounded, PsychologyOutlined, Refresh, VolumeOff, VolumeUp } from '@mui/icons-material'
import { Box, Button, Chip, CircularProgress, IconButton, Popover, Tooltip, Typography } from '@mui/material'
import { WordTooltip, type VocabEntry } from '@/app/components/vocab-tooltip'
import SocialVideoEmbed from '@/app/components/SocialVideoEmbed'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { getEpisodeVideoSources, getYouTubeThumbnailUrl, type ExploreEpisode, type VideoProvider } from '@/app/lib/cartoons'
import type { ExploreBookPage } from '@/app/actions/books'
import { dispatchWordLookup } from '@/app/lib/activity'
import { usePlayerStore } from '@/store/playerStore'
import { fetchExploreFeedPage } from '@/app/actions/explore'
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
}: {
  entry: VocabEntry
  context: string
  itemIndex: number
  onOpen: OpenDefinition
}) {
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
      sx={{
        display: 'inline-block',
        mx: '0.1em',
        cursor: 'pointer',
        borderBottom: '2px dotted var(--awm-gold)',
        transition: 'background-color .12s ease',
        '&:hover, &:focus-visible': { bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', outline: 'none' },
      }}
    >
      {entry.arabic}
    </Box>
  )
}

function ExploreVideo({
  episode,
  active,
  onEnded,
  onPlaybackChange,
  soundEnabled,
  itemIndex,
  onDefinitionOpen,
}: {
  episode: ExploreEpisode
  active: boolean
  onEnded: () => void
  onPlaybackChange: (playing: boolean) => void
  soundEnabled: boolean
  itemIndex: number
  onDefinitionOpen: OpenDefinition
}) {
  const [currentTime, setCurrentTime] = useState(0)
  const sources = useMemo(() => getEpisodeVideoSources(episode), [episode])
  const [selectedProvider, setSelectedProvider] = useState<VideoProvider | undefined>(sources[0]?.provider)
  const [soundAllowed, setSoundAllowed] = useState(false)
  const [fallbackMutedFor, setFallbackMutedFor] = useState<string | null>(null)
  const source = sources.find((candidate) => candidate.provider === selectedProvider) ?? sources[0]
  const activeSourceKey = active && source ? `${source.provider}:${source.id}` : null
  const fallbackMuted = activeSourceKey != null && fallbackMutedFor === activeSourceKey
  const isYouTube = source?.provider === 'youtube'
  const {
    wrapRef,
    isReady,
    isPlaying,
    playVideo,
    pauseVideo,
    mute,
    unMute,
    playWithSound,
    autoplayBlocked,
    errorCode,
    retry,
  } = useYouTubePlayer(
    active && isYouTube ? source.id : undefined,
    setCurrentTime,
    undefined,
    { autoplay: active, muted: !soundEnabled || !soundAllowed, onEnded }
  )
  const soundMuted = !soundEnabled || !soundAllowed || fallbackMuted

  useEffect(() => {
    if (!active) return
    onPlaybackChange(isPlaying)
    return () => onPlaybackChange(false)
  }, [active, isPlaying, onPlaybackChange])

  useEffect(() => {
    if (!isReady) return
    if (active) {
      if (soundEnabled && soundAllowed && !fallbackMuted) unMute()
      else mute()
      playVideo()
    } else {
      pauseVideo()
    }
  }, [active, fallbackMuted, isReady, mute, pauseVideo, playVideo, soundEnabled, soundAllowed, unMute])

  useEffect(() => {
    if (!active || !autoplayBlocked || !activeSourceKey) return
    mute()
    playVideo()
    const timer = window.setTimeout(() => setFallbackMutedFor(activeSourceKey), 0)
    return () => window.clearTimeout(timer)
  }, [active, activeSourceKey, autoplayBlocked, mute, playVideo])

  useEffect(() => {
    if (!active || !isYouTube || !isReady || isPlaying || !soundEnabled || fallbackMuted || !activeSourceKey) return
    const timer = window.setTimeout(() => {
      setFallbackMutedFor(activeSourceKey)
      mute()
      playVideo()
    }, 1_500)
    return () => window.clearTimeout(timer)
  }, [active, activeSourceKey, fallbackMuted, isPlaying, isReady, isYouTube, mute, playVideo, soundEnabled])

  const toggleSound = () => {
    if (soundMuted) {
      setSoundAllowed(true)
      setExploreSoundPreference(true)
      setFallbackMutedFor(null)
      playWithSound()
    } else {
      setSoundAllowed(false)
      setExploreSoundPreference(false)
      setFallbackMutedFor(null)
      mute()
    }
  }

  const activeLine = useMemo(() => {
    let result = -1
    for (let index = 0; index < episode.transcriptLines.length; index += 1) {
      const timestamp = episode.transcriptLines[index].timestamp
      if (timestamp != null && timestamp <= currentTime) result = index
      else if (timestamp != null) break
    }
    return result
  }, [currentTime, episode.transcriptLines])

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          width: { xs: '100%', md: '100%' },
          maxWidth: { xs: 'calc((100dvh - 122px - env(safe-area-inset-bottom)) * 0.5625)', md: 'none' },
          height: { xs: 'auto', md: '100%' },
          maxHeight: '100%',
          aspectRatio: { xs: '9 / 16', md: 'auto' },
          mx: 'auto',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: { xs: 0, md: '18px' },
          bgcolor: '#090909',
          boxShadow: { xs: 'none', md: '0 22px 60px rgba(14,46,31,0.24)' },
        }}
      >
        {!active && episode.cover && (
          <Box
            component="img"
            src={episode.cover ?? getYouTubeThumbnailUrl(episode.youtubeId) ?? ''}
            alt=""
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.72 }}
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
          <Box sx={{ position: 'absolute', zIndex: 3, bottom: 14, left: 14, right: 76, display: 'flex', gap: 0.65, flexWrap: 'wrap' }}>
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
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 700,
                  '&:hover': { bgcolor: candidate.provider === source?.provider ? '#d4a843' : 'rgba(0,0,0,0.8)' },
                }}
              />
            ))}
          </Box>
        )}
        <Box sx={{ position: 'absolute', zIndex: 4, left: { xs: 6, md: 12 }, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 0.85 }}>
          <Tooltip title={soundMuted ? 'Turn sound on' : 'Mute'} placement="right">
            <IconButton
              onClick={toggleSound}
              aria-label={soundMuted ? 'Turn Explore sound on' : 'Mute Explore video'}
              sx={{ width: 44, height: 44, bgcolor: 'transparent', color: 'var(--awm-gold-light)', filter: 'drop-shadow(0 1px 3px #000)', '&:hover': { bgcolor: 'transparent', transform: 'scale(1.08)' }, '&:active': { transform: 'scale(.95)' }, '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 } }}
            >
              {soundMuted ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Go to episode" placement="right">
            <IconButton
              component={Link}
              href={`/cartoons/${episode.showSlug}/${episode.slug}`}
              aria-label={`Go to episode: ${episode.title}`}
              sx={{ width: 44, height: 44, bgcolor: 'transparent', color: 'var(--awm-gold-light)', filter: 'drop-shadow(0 1px 3px #000)', '&:hover': { bgcolor: 'transparent', transform: 'scale(1.08)' }, '&:active': { transform: 'scale(.95)' }, '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 } }}
            >
              <PlayCircleOutlineRounded />
            </IconButton>
          </Tooltip>
          <Tooltip title="Practise this episode in Memory" placement="right">
            <IconButton
              component={Link}
              href={`/memory?episode=${encodeURIComponent(episode.id)}`}
              aria-label={`Practise ${episode.title} in Memory`}
              sx={{ width: 44, height: 44, bgcolor: 'transparent', color: 'var(--awm-gold-light)', filter: 'drop-shadow(0 1px 3px #000)', '&:hover': { bgcolor: 'transparent', transform: 'scale(1.08)' }, '&:active': { transform: 'scale(.95)' }, '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 } }}
            >
              <PsychologyOutlined />
            </IconButton>
          </Tooltip>
        </Box>
        {active && isYouTube && isReady && !isPlaying && errorCode == null && (
          <Button onClick={() => { if (soundEnabled) { setSoundAllowed(true); setFallbackMutedFor(null); playWithSound() } else { mute(); playVideo() } }} startIcon={<PlayCircleOutlineRounded />} sx={{ position: 'absolute', zIndex: 4, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', bgcolor: 'background.paper', color: 'text.primary', borderRadius: '9999px', minHeight: 44 }}>Play video</Button>
        )}
        {errorCode != null && isYouTube && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,0,0,0.78)', p: 3 }}>
            <Box sx={{ textAlign: 'center', color: '#fff' }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>YouTube could not start this video.</Typography>
              <Typography sx={{ mt: 0.5, mb: 1.5, fontFamily: 'Jost, sans-serif', fontSize: 12, opacity: 0.78 }}>Player error {errorCode}</Typography>
              <Button onClick={retry} variant="contained" startIcon={<Refresh />} sx={{ bgcolor: '#b8860b', color: '#fff', textTransform: 'none' }}>
                Retry video
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          minWidth: 0,
          height: '100%',
          maxHeight: 'calc(100dvh - 64px)',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(44,26,14,0.08)',
          borderRadius: '18px',
          bgcolor: 'var(--awm-white)',
          boxShadow: '0 16px 46px rgba(44,26,14,0.08)',
        }}
      >
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(44,26,14,0.07)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={episode.level} size="small" sx={{ bgcolor: '#0e2e1f', color: '#fff', fontWeight: 700 }} />
            {episode.tags.slice(0, 3).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.09)', color: '#8b6508' }} />)}
          </Box>
          {episode.description && <Typography sx={{ mt: 1.5, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13.5, lineHeight: 1.55 }}>{episode.description}</Typography>}
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.5, py: 2 }}>
          {episode.transcriptLines.map((line, index) => (
            <Box
              key={`${line.timestamp ?? 'line'}-${index}`}
              sx={{
                px: 1.5,
                py: 1.2,
                mb: 0.75,
                borderInlineStart: '3px solid',
                borderColor: index === activeLine ? '#b8860b' : 'transparent',
                borderRadius: '8px',
                bgcolor: index === activeLine ? 'rgba(184,134,11,0.09)' : 'transparent',
                transition: 'background-color .18s ease, border-color .18s ease',
              }}
            >
              <Typography lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-book-naskh), "EB Garamond", serif', fontSize: 22, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.65, textAlign: 'right' }}>
                {(line.words?.length ?? 0) > 0
                  ? (line.words ?? []).map((word, wordIndex) => (
                      <ExploreDefinitionWord
                        key={`${word.plain}-${wordIndex}`}
                        entry={word}
                        context={`episode:${episode.id}:line:${index}`}
                        itemIndex={itemIndex}
                        onOpen={onDefinitionOpen}
                      />
                    ))
                  : line.arabic}
              </Typography>
              {line.translation && <Typography sx={{ mt: 0.35, fontFamily: 'Jost, sans-serif', fontSize: 13, color: 'var(--awm-muted)', lineHeight: 1.55 }}>{line.translation}</Typography>}
            </Box>
          ))}
        </Box>

      </Box>
    </>
  )
}

function ExploreBookPageSlide({ page, itemIndex, onDefinitionOpen }: { page: ExploreBookPage; itemIndex: number; onDefinitionOpen: OpenDefinition }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        px: { xs: 1.5, sm: 3, md: 6 },
        py: { xs: 1.5, md: 3 },
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
            <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#d4a843', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Random reading · Page {page.pageNumber}
            </Typography>
          </Box>
          <Typography component="h2" sx={{ mt: 0.6, fontFamily: 'var(--font-heading)', fontSize: { xs: 23, md: 30 }, fontWeight: 600, lineHeight: 1.15 }}>
            {page.bookTitle}
          </Typography>
          <Typography sx={{ mt: 0.4, fontFamily: 'Jost, sans-serif', fontSize: 12.5, opacity: 0.76 }}>
            Chapter {page.chapterNumber}: {page.chapterTitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2.25, md: 4 }, py: { xs: 1.5, md: 2.5 } }}>
          {page.blocks.map((block, blockIndex) => (
            <Box key={blockIndex} sx={{ py: { xs: 1, md: 1.35 }, borderBottom: blockIndex < page.blocks.length - 1 ? '1px solid color-mix(in srgb, var(--awm-bark) 8%, transparent)' : 0 }}>
              <Typography component="div" lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-book-naskh), "EB Garamond", serif', fontSize: { xs: 22, md: 28 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.85, textAlign: 'right' }}>
                {block.words.map((word, wordIndex) => (
                  <ExploreDefinitionWord
                    key={`${word.plain}-${wordIndex}`}
                    entry={word}
                    context={`book:${page.id}:block:${blockIndex}`}
                    itemIndex={itemIndex}
                    onOpen={onDefinitionOpen}
                  />
                ))}
                {block.punctuation}
              </Typography>
              {block.translation && (
                <Typography sx={{ mt: 0.35, fontFamily: 'Jost, sans-serif', fontSize: { xs: 13, md: 14.5 }, color: 'var(--awm-muted)', lineHeight: 1.6 }}>
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

export default function ExploreFeed({ seed, initialItems, initialHasMore }: { seed: string; initialItems: ExploreFeedItem[]; initialHasMore: boolean }) {
  const setGlobalVideoPlaying = usePlayerStore((state) => state.setIsPlaying)
  const soundEnabled = useSyncExternalStore(subscribeToExploreSoundPreference, getExploreSoundPreference, () => true)
  const [items, setItems] = useState(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedDefinition, setSelectedDefinition] = useState<SelectedDefinition | null>(null)
  const [pageVisible, setPageVisible] = useState(true)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<number, HTMLElement>())
  const definitionCacheRef = useRef(new Map<string, VocabEntry>())
  const activeIndexRef = useRef(0)
  const advancedFromRef = useRef<number | null>(null)
  const programmaticTargetRef = useRef<number | null>(null)
  const scrollLockUntilRef = useRef(0)
  const nextPageRef = useRef(1)
  const loadingBatchRef = useRef(false)
  const seenKeysRef = useRef(new Set(initialItems.map(feedItemKey)))

  const loadNextBatch = useCallback(async () => {
    if (loadingBatchRef.current || !hasMore) return
    loadingBatchRef.current = true
    setLoadingMore(true)
    try {
      const batch = await fetchExploreFeedPage(seed, nextPageRef.current)
      nextPageRef.current += 1
      const fresh = batch.items.filter((item) => {
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
  }, [hasMore, seed])

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
    setActiveIndex(nextIndex)
    itemRefs.current.get(nextIndex)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [items.length])

  const openDefinition = useCallback<OpenDefinition>((entry, anchor, context, itemIndex) => {
    const cacheKey = definitionCacheKey(context, entry)
    const cachedEntry = definitionCacheRef.current.get(cacheKey) ?? entry
    definitionCacheRef.current.set(cacheKey, cachedEntry)
    setSelectedDefinition({ cacheKey, entry: cachedEntry, anchor, itemIndex })
    dispatchWordLookup()
  }, [])

  useEffect(() => () => setGlobalVideoPlaying(false), [setGlobalVideoPlaying])

  useEffect(() => {
    const handleVisibility = () => setPageVisible(document.visibilityState === 'visible')
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    if (!pageVisible || items[activeIndex]?.kind !== 'book') return
    if (selectedDefinition?.itemIndex === activeIndex) return
    const timer = window.setTimeout(() => advanceOnce(activeIndex), EXPLORE_READING_DURATION_MS)
    return () => window.clearTimeout(timer)
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

  if (items.length === 0) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center', bgcolor: 'var(--awm-cream-light)' }}>
        <Box><ExploreOutlined sx={{ fontSize: 54, color: 'var(--awm-gold)' }} /><Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 30, color: 'var(--awm-bark)' }}>No videos to explore yet</Typography></Box>
      </Box>
    )
  }

  return (
    <Box
      ref={feedRef}
      component="main"
      sx={{
        height: { xs: 'calc(100dvh - 108px - env(safe-area-inset-bottom))', md: 'calc(100dvh - 64px)' },
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        overscrollBehaviorY: 'contain',
        bgcolor: 'var(--awm-cream-light)',
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
            gridTemplateColumns: item.kind === 'video' ? { xs: '1fr', md: 'minmax(330px, 500px) minmax(0, 1fr)' } : undefined,
            alignItems: 'center',
            gap: { xs: 0, md: 3 },
            maxWidth: 1220,
            mx: 'auto',
            px: { xs: 0, md: 3, lg: 5 },
            py: { xs: 0, md: 3 },
            position: 'relative',
          }}
        >
          {item.kind === 'video' ? (
            <>
              <ExploreVideo
                episode={item.episode}
                active={index === activeIndex && pageVisible}
                onEnded={() => advanceOnce(index)}
                onPlaybackChange={setGlobalVideoPlaying}
                soundEnabled={soundEnabled}
                itemIndex={index}
                onDefinitionOpen={openDefinition}
              />
            </>
          ) : (
            <ExploreBookPageSlide page={item.page} itemIndex={index} onDefinitionOpen={openDefinition} />
          )}
        </Box>
      ))}
      {loadingMore && (
        <Box component="section" sx={{ height: '100%', display: 'grid', placeItems: 'center', bgcolor: 'var(--awm-cream-light)' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={34} sx={{ color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1.5, fontFamily: 'Jost, sans-serif', fontSize: 13, color: 'var(--awm-muted)' }}>Loading more…</Typography>
          </Box>
        </Box>
      )}
      {!loadingMore && !hasMore && items.length > 1 && (
        <Box component="section" sx={{ height: '100%', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center', bgcolor: 'var(--awm-cream-light)' }}>
          <Box>
            <ExploreOutlined sx={{ fontSize: 54, color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 30, color: 'var(--awm-bark)' }}>You've explored it all</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: 'Jost, sans-serif', fontSize: 14, color: 'var(--awm-muted)' }}>Keep scrolling to start back at the beginning.</Typography>
          </Box>
        </Box>
      )}
      <Popover
        open={Boolean(selectedDefinition)}
        anchorEl={selectedDefinition?.anchor ?? null}
        onClose={() => setSelectedDefinition(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        disableRestoreFocus
        slotProps={{ paper: { sx: { mt: 1, width: 'min(320px, calc(100vw - 28px))', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)', boxShadow: '0 14px 42px rgba(44,26,14,.2)' } } }}
      >
        {selectedDefinition && <Box key={selectedDefinition.cacheKey} sx={{ p: 2.5 }}><WordTooltip entry={selectedDefinition.entry} /></Box>}
      </Popover>
    </Box>
  )
}
