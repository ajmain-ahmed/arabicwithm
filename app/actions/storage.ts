// app/actions/storage.ts — Supabase Storage uploads for admin covers

"use server"

import { saveChapterAudioForAdmin, fetchChapterAudioForAdmin } from '@/app/actions/audiobooks'
import { guardAdmin } from "@/app/actions/auth"
import { serviceClient } from "@/app/lib/supabase"
import { randomUUID } from 'node:crypto'
import { actionResult, type ActionResult } from '@/app/lib/actionResult'
import { bookCoverUploadPath } from '@/app/lib/bookCoverUpload'
import { COVER_VARIANT_WIDTHS, coverVariantPaths } from '@/app/lib/imageVariantPaths'
import { AUDIO_PATH_PATTERN, AUDIO_MIME, audioUploadBody, validateAudioFile } from '@/app/lib/audioUpload'

const ALLOWED_BUCKETS = new Set(["covers"])
// Single path segment under a fixed prefix; slugs are admin free-text, so the
// security property is "no traversal", not a specific slug charset.
const COVER_PATH_PATTERN = /^(cartoons|episodes|books)\/[^/\\]+\.webp$/
const MAX_FILE_BYTES = 5 * 1024 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isWebPHeader(header: Uint8Array): boolean {
  return (
    header[0] === 0x52 && // R
    header[1] === 0x49 && // I
    header[2] === 0x46 && // F
    header[3] === 0x46 && // F
    header[8] === 0x57 && // W
    header[9] === 0x45 && // E
    header[10] === 0x42 && // B
    header[11] === 0x50 // P
  )
}

export async function uploadCoverImage(formData: FormData): Promise<string | ActionResult<string>> {
  await guardAdmin()

  const bucket = formData.get("bucket")
  const path = formData.get("path")
  const file = formData.get("file")

  if (typeof bucket !== "string" || typeof path !== "string" || !(file instanceof Blob)) {
    throw new Error("Invalid upload payload: bucket, path, and file are required")
  }

  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new Error("Unsupported upload bucket")
  }
  if (!COVER_PATH_PATTERN.test(path)) {
    throw new Error("Cover path must look like {cartoons|episodes|books}/{slug}.webp")
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("Cover image must be 5 MB or smaller")
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!isWebPHeader(header)) {
    throw new Error("Cover image must be a WebP file")
  }

  if (path.startsWith('books/')) {
    // Encoding stays in the browser: the deployed Worker cannot load native Sharp.
    // Every object is new, so failures and unsaved drafts never alter an old cover.
    const variants = COVER_VARIANT_WIDTHS.map(width => formData.get(`variant${width}`))
    for (const variant of variants) {
      if (!(variant instanceof Blob) || !variant.size || variant.size > MAX_FILE_BYTES || !isWebPHeader(new Uint8Array(await variant.slice(0, 12).arrayBuffer()))) {
        return { ok: false, error: 'Please refresh Admin and upload the cover again. The image previews could not be prepared.' }
      }
    }
    return actionResult('book cover upload', async () => {
      const destination = bookCoverUploadPath(path)
      const paths = coverVariantPaths(destination)
      const uploads = [...variants.map((body, index) => ({ path: paths[index], body: body as Blob })), { path: destination, body: file }]
      for (const item of uploads) {
        const { error } = await serviceClient.storage.from(bucket).upload(item.path, item.body, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
        if (error) throw new Error(`Unable to store book cover asset ${item.path}: ${error.message}`)
      }
      return serviceClient.storage.from(bucket).getPublicUrl(destination).data.publicUrl
    }, "We couldn't upload this cover. Please try again.")
  }

  const { data, error } = await serviceClient.storage
    .from(bucket)
    .upload(path, file, {
      contentType: "image/webp",
      // Note: Supabase's storage gateway currently serves objects with
      // `cache-control: no-cache` regardless of this value — the covers API
      // route sets its own caching headers. Record it anyway so the objects
      // are correct if platform behavior ever changes.
      cacheControl: "86400",
      upsert: true,
    })

  if (error) {
    console.error("[uploadCoverImage] error:", error.message)
    throw new Error("Cover upload failed. Please try again.")
  }
  const { syncImageVariants } = await import('@/app/lib/imageVariants')
  await syncImageVariants(file, path)

  const { data: urlData } = serviceClient.storage.from(bucket).getPublicUrl(data?.path ?? path)

  return urlData.publicUrl
}

export async function uploadAudiobookAudio(formData: FormData): Promise<string> {
  await guardAdmin()
  const chapterId = formData.get('chapterId')
  const file = formData.get('file')
  if (typeof chapterId !== 'string' || !UUID_PATTERN.test(chapterId) || !(file instanceof File)) throw new Error('A valid chapter and audio file are required.')
  const extension = await validateAudioFile(file, file.name)
  const { data: chapter, error: chapterError } = await serviceClient.from('chapters').select('id').eq('id', chapterId).maybeSingle()
  if (chapterError || !chapter) throw new Error('Chapter not found.')
  const previous = await fetchChapterAudioForAdmin(chapterId)
  const path = `${chapterId}/ar/${randomUUID()}.${extension}`
  const { error } = await serviceClient.storage.from('audiobooks').upload(path, audioUploadBody(file, extension), { contentType: AUDIO_MIME[extension], upsert: false })
  if (error) {
    console.error('[uploadAudiobookAudio] error:', error.message)
    throw new Error(`Audio storage upload failed: ${error.message}`)
  }
  try {
    await saveChapterAudioForAdmin({ chapterId, sourceType: 'supabase_storage', storagePath: path, externalVideoId: null, durationSeconds: null, narrator: previous?.narrator ?? null, isPublished: previous?.isPublished ?? true })
  } catch (cause) {
    // Never remove an object if a write succeeded before revalidation failed.
    await removeAudiobookAudio(path).catch(() => {})
    throw cause
  }
  return path
}

export async function removeAudiobookAudio(path: string): Promise<void> {
  await guardAdmin()
  if (!AUDIO_PATH_PATTERN.test(path)) throw new Error('Invalid audiobook path.')
  const { data: reference, error: referenceError } = await serviceClient.from('book_chapter_audio').select('chapter_id').eq('storage_path', path).maybeSingle()
  if (referenceError || reference) throw new Error('Remove the chapter audiobook reference before deleting its file.')
  const { error } = await serviceClient.storage.from('audiobooks').remove([path])
  if (error) throw new Error('Unable to remove audiobook file.')
}
