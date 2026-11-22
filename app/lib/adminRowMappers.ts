import type { BookRow, ChapterRow, EpisodeRow, PhraseRow, ShowRow } from '@/app/actions/admin'
import { chapterPublished } from '@/app/lib/chapterPublicationRead'
import { normalizeThumbnailCrop } from '@/app/lib/thumbnailCrop'

function toStringOrNull(value: unknown): string | null {
  return value == null || value === '' ? null : String(value)
}

export function mapShowRow(row: Record<string, unknown>): ShowRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    title_ar: toStringOrNull(row.title_ar),
    description: toStringOrNull(row.description),
    cover: toStringOrNull(row.cover),
    cover_crop: normalizeThumbnailCrop(row.cover_crop),
    level: String(row.level),
    category: toStringOrNull(row.category),
  }
}

export function mapEpisodeRow(row: Record<string, unknown>): EpisodeRow {
  return {
    id: String(row.id),
    show_id: String(row.show_id),
    slug: String(row.slug),
    title: String(row.title),
    level: String(row.level),
    tags: Array.isArray(row.tags) ? row.tags.map(value => String(value)) : [],
    description: toStringOrNull(row.description),
    youtube_id: toStringOrNull(row.youtube_id),
    instagram_id: toStringOrNull(row.instagram_id),
    tiktok_id: toStringOrNull(row.tiktok_id),
    facebook_id: toStringOrNull(row.facebook_id),
    cover: toStringOrNull(row.cover),
    cover_crop: normalizeThumbnailCrop(row.cover_crop),
    created_at: toStringOrNull(row.created_at),
  }
}

export function mapBookRow(row: Record<string, unknown>): BookRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    is_completed: row.is_completed !== false,
    author: toStringOrNull(row.author),
    reading_time_minutes: typeof row.reading_time_minutes === 'number' && row.reading_time_minutes > 0
      ? Math.round(row.reading_time_minutes)
      : null,
    title_ar: toStringOrNull(row.title_ar),
    description: toStringOrNull(row.description),
    cover: toStringOrNull(row.cover),
    cover_crop: normalizeThumbnailCrop(row.cover_crop),
    level: String(row.level),
    category: toStringOrNull(row.category),
    created_at: toStringOrNull(row.created_at),
    updated_at: toStringOrNull(row.updated_at),
  }
}

export function mapChapterRow(row: Record<string, unknown>): ChapterRow {
  return {
    id: String(row.id),
    book_id: String(row.book_id),
    slug: String(row.slug),
    title: String(row.title),
    chapter_number: Number(row.chapter_number),
    productionStatus: toStringOrNull(row.production_status),
    is_published: chapterPublished(row),
    created_at: toStringOrNull(row.created_at),
    updated_at: toStringOrNull(row.updated_at),
  }
}

export function mapPhraseRow(row: Record<string, unknown>): PhraseRow {
  return {
    id: Number(row.id),
    phrase_ar_di: String(row.phrase_ar_di),
    phrase_tr: String(row.phrase_tr),
    english: String(row.english),
    cefr: String(row.cefr ?? ''),
    notes: row.notes ? String(row.notes) : null,
  }
}
