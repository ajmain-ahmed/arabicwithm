import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content/cartoons')

export interface ShowMeta {
  slug: string
  title: string
  titleAr?: string
  description?: string
  cover: string
  level: string
  episodeCount: number
  order?: number
}

export interface EpisodeMeta {
  slug: string
  title: string
  episode: number
  level: string
  tags: string[]
  description?: string
  youtubeId?: string
  youtubeShort?: boolean
}

export interface EpisodeFull extends EpisodeMeta {
  content: string
  show: string
}

// ── All shows ──────────────────────────────────────────────────────────────────
export function getAllShows(): ShowMeta[] {
  const showDirs = fs.readdirSync(CONTENT_DIR).filter((name) => {
    const fullPath = path.join(CONTENT_DIR, name)
    return fs.statSync(fullPath).isDirectory()
  })

  return showDirs
    .map((slug) => {
      const metaPath = path.join(CONTENT_DIR, slug, '_meta.json')
      if (!fs.existsSync(metaPath)) return null

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      const episodes = getEpisodesForShow(slug)

      return {
        slug,
        ...meta,
        episodeCount: episodes.length,
      } as ShowMeta
    })
    .filter(Boolean)
    .sort((a, b) => (a!.order ?? 99) - (b!.order ?? 99)) as ShowMeta[]
}

// ── All episodes for a show ────────────────────────────────────────────────────
export function getEpisodesForShow(show: string): EpisodeMeta[] {
  const showDir = path.join(CONTENT_DIR, show)
  if (!fs.existsSync(showDir)) return []

  const files = fs.readdirSync(showDir).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_')
  )

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(showDir, file), 'utf8')
      const { data } = matter(raw)

      return {
        slug,
        show,
        title: data.title ?? slug,
        youtubeId: data.youtubeId ?? '',
        youtubeShort: data.youtubeShort ?? false,
        level: data.level ?? 'A1',
        episode: data.episode ?? 0,
        tags: data.tags ?? [],
        description: data.description ?? undefined,
      } as EpisodeMeta
    })
    .sort((a, b) => a.episode - b.episode)
}

// ── Single episode with full content ──────────────────────────────────────────
export function getEpisode(show: string, episode: string): EpisodeFull | null {
  const filePath = path.join(CONTENT_DIR, show, `${episode}.md`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)

  return {
    slug: episode,
    show,
    title: data.title ?? episode,
    youtubeId: data.youtubeId ?? '',
    youtubeShort: data.youtubeShort ?? false,
    level: data.level ?? 'A1',
    episode: data.episode ?? 0,
    tags: data.tags ?? [],
    description: data.description ?? undefined,
    content,
  }
}

// ── Static params helpers (for generateStaticParams) ──────────────────────────
export function getAllShowSlugs() {
  return getAllShows().map((s) => ({ show: s.slug }))
}

export function getAllEpisodeParams() {
  const shows = getAllShows()
  return shows.flatMap((show) =>
    getEpisodesForShow(show.slug).map((ep) => ({
      show: show.slug,
      episode: ep.slug,
    }))
  )
}

// ── Single show by slug ───────────────────────────────────────────────────────
export function getShowBySlug(slug: string): ShowMeta | undefined {
  return getAllShows().find((s) => s.slug === slug)
}