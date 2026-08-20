'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowForward, ExploreOutlined, MenuBook, PlayArrow, Refresh, VolumeOff, VolumeUp } from '@mui/icons-material'
import { Box, Button, Chip, Typography } from '@mui/material'
import { HtmlTooltip, WordTooltip } from '@/app/components/vocab-tooltip'
import SocialVideoEmbed from '@/app/components/SocialVideoEmbed'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { getEpisodeVideoSources, getYouTubeThumbnailUrl, type ExploreEpisode, type VideoProvider } from '@/app/lib/cartoons'
import type { ExploreBookPage } from '@/app/actions/books'

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

function ExploreVideo({
  episode,
  active,
  onEnded,
}: {
  episode: ExploreEpisode
  active: boolean
  onEnded: () => void
}) {
  const [currentTime, setCurrentTime] = useState(0)
  const sources = useMemo(() => getEpisodeVideoSources(episode), [episode])
  const [selectedProvider, setSelectedProvider] = useState<VideoProvider | undefined>(sources[0]?.provider)
  const [soundMuted, setSoundMuted] = useState(false)
  const source = sources.find((candidate) => candidate.provider === selectedProvider) ?? sources[0]
  const isYouTube = source?.provider === 'youtube'
  const {
    wrapRef,
    isReady,
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
    { autoplay: active, muted: false, onEnded }
  )

  useEffect(() => {
    if (!isReady) return
    if (active) {
      playVideo()
    } else {
      pauseVideo()
    }
  }, [active, isReady, pauseVideo, playVideo])

  const toggleSound = () => {
    if (soundMuted) {
      unMute()
      playVideo()
      setSoundMuted(false)
    } else {
      mute()
      setSoundMuted(true)
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
          width: '100%',
          height: '100%',
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
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.72 }}
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
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.18), transparent 36%, rgba(0,0,0,0.78))',
          }}
        />
        {sources.length > 1 && (
          <Box sx={{ position: 'absolute', zIndex: 3, top: 14, left: 14, right: 108, display: 'flex', gap: 0.65, flexWrap: 'wrap' }}>
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
        <Box
          component="button"
          type="button"
          onClick={toggleSound}
          sx={{ position: 'absolute', zIndex: 3, top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 0.7, px: 1.1, py: 0.55, border: 0, borderRadius: '9999px', bgcolor: 'rgba(0,0,0,0.62)', color: '#fff', cursor: 'pointer' }}
        >
          {soundMuted ? <VolumeOff sx={{ fontSize: 15 }} /> : <VolumeUp sx={{ fontSize: 15 }} />}
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: 10.5, fontWeight: 600 }}>{soundMuted ? 'Muted' : 'Sound on'}</Typography>
        </Box>
        {autoplayBlocked && errorCode == null && isYouTube && (
          <Box sx={{ position: 'absolute', zIndex: 2, inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,0,0,0.58)', p: 3 }}>
            <Button
              onClick={playWithSound}
              variant="contained"
              startIcon={<PlayArrow />}
              sx={{ bgcolor: '#d4a843', color: '#0e2e1f', borderRadius: '9999px', px: 2.5, py: 1.1, textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#e2bd62' } }}
            >
              Play with sound
            </Button>
          </Box>
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
        <Box sx={{ position: 'absolute', left: 18, right: 18, bottom: { xs: 78, md: 20 }, color: '#fff' }}>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d4a843' }}>
            {episode.showTitle}
          </Typography>
          <Typography component="h2" sx={{ mt: 0.5, fontFamily: 'var(--font-heading)', fontSize: { xs: 24, md: 28 }, fontWeight: 600, lineHeight: 1.12 }}>
            {episode.title}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          minWidth: 0,
          height: '100%',
          maxHeight: 'calc(100dvh - 48px)',
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
                      <HtmlTooltip
                        key={`${word.plain}-${wordIndex}`}
                        title={<Box sx={{ p: 2.5 }}><WordTooltip entry={word} /></Box>}
                        placement="top"
                        arrow
                        describeChild
                      >
                        <Box
                          component="span"
                          className="vocab-word"
                          tabIndex={0}
                          sx={{
                            display: 'inline-block',
                            mx: '0.12em',
                            cursor: 'help',
                            borderBottom: '2px dotted var(--awm-gold)',
                            transition: 'background-color .15s ease',
                            '&:hover, &:focus-visible': { bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)' },
                          }}
                        >
                          {word.arabic}
                        </Box>
                      </HtmlTooltip>
                    ))
                  : line.arabic}
              </Typography>
              {line.translation && <Typography sx={{ mt: 0.35, fontFamily: 'Jost, sans-serif', fontSize: 13, color: 'var(--awm-muted)', lineHeight: 1.55 }}>{line.translation}</Typography>}
            </Box>
          ))}
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: '1px solid rgba(44,26,14,0.07)' }}>
          <Button component={Link} href={`/cartoons/${episode.showSlug}/${episode.slug}`} fullWidth variant="contained" endIcon={<ArrowForward />} sx={{ bgcolor: '#0e2e1f', color: '#fff', borderRadius: '10px', py: 1.15, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#174832' } }}>
            Go to episode
          </Button>
        </Box>
      </Box>
    </>
  )
}

type ExploreItem =
  | { kind: 'video'; episode: ExploreEpisode }
  | { kind: 'book'; page: ExploreBookPage }

function buildExploreItems(episodes: readonly ExploreEpisode[], bookPages: readonly ExploreBookPage[]): ExploreItem[] {
  const videos = shuffled(episodes)
  const pages = shuffled(bookPages)
  if (videos.length === 0) return pages.map((page) => ({ kind: 'book' as const, page }))

  const items: ExploreItem[] = []
  let pageIndex = 0
  videos.forEach((episode, index) => {
    items.push({ kind: 'video', episode })
    if ((index + 1) % 3 === 0 && pages.length > 0) {
      items.push({ kind: 'book', page: pages[pageIndex % pages.length] })
      pageIndex += 1
    }
  })
  return items
}

function ExploreBookPageSlide({ page }: { page: ExploreBookPage }) {
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
                  <HtmlTooltip
                    key={`${word.plain}-${wordIndex}`}
                    title={<Box sx={{ p: 2.5 }}><WordTooltip entry={word} /></Box>}
                    placement="top"
                    arrow
                    describeChild
                  >
                    <Box component="span" tabIndex={0} sx={{ display: 'inline-block', mx: '0.1em', cursor: 'help', borderBottom: '2px dotted var(--awm-gold)' }}>
                      {word.arabic}
                    </Box>
                  </HtmlTooltip>
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

export default function ExploreFeed({ episodes, bookPages }: { episodes: ExploreEpisode[]; bookPages: ExploreBookPage[] }) {
  const [orderedItems, setOrderedItems] = useState<ExploreItem[] | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<number, HTMLElement>())

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOrderedItems(buildExploreItems(episodes, bookPages)))
    return () => window.cancelAnimationFrame(frame)
  }, [bookPages, episodes])

  const setItemRef = useCallback((index: number, node: HTMLElement | null) => {
    if (node) itemRefs.current.set(index, node)
    else itemRefs.current.delete(index)
  }, [])

  const playNextVideo = useCallback((fromIndex: number) => {
    if (!orderedItems) return

    let nextIndex = orderedItems.findIndex((item, index) => index > fromIndex && item.kind === 'video')
    if (nextIndex < 0) nextIndex = orderedItems.findIndex((item) => item.kind === 'video')
    if (nextIndex < 0 || nextIndex === fromIndex) return

    setActiveIndex(nextIndex)
    itemRefs.current.get(nextIndex)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [orderedItems])

  useEffect(() => {
    const root = feedRef.current
    if (!root) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
      if (visible) setActiveIndex(Number((visible.target as HTMLElement).dataset.index ?? 0))
    }, { root, threshold: [0.55, 0.7, 0.85] })
    itemRefs.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [orderedItems])

  if (orderedItems == null) {
    return <Box component="main" sx={{ height: { xs: 'calc(100dvh - 56px)', md: '100dvh' }, bgcolor: 'var(--awm-cream-light)' }} />
  }

  if (orderedItems.length === 0) {
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
        height: { xs: 'calc(100dvh - 56px)', md: '100dvh' },
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        overscrollBehaviorY: 'contain',
        bgcolor: 'var(--awm-cream-light)',
      }}
    >
      {orderedItems.map((item, index) => (
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
                active={index === activeIndex}
                onEnded={() => playNextVideo(index)}
              />
              <Button
                component={Link}
                href={`/cartoons/${item.episode.showSlug}/${item.episode.slug}`}
                variant="contained"
                endIcon={<ArrowForward />}
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  position: 'absolute',
                  left: 18,
                  right: 18,
                  bottom: 18,
                  bgcolor: 'var(--awm-cream)',
                  color: '#0e2e1f',
                  borderRadius: '10px',
                  py: 1.15,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'var(--awm-white)' },
                }}
              >
                Go to episode
              </Button>
            </>
          ) : (
            <ExploreBookPageSlide page={item.page} />
          )}
        </Box>
      ))}
    </Box>
  )
}
