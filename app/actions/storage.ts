// app/actions/storage.ts — Supabase Storage uploads for admin covers

"use server"

import { guardAdmin } from "@/app/actions/auth"
import { serviceClient } from "@/app/lib/supabase"

const ALLOWED_BUCKETS = new Set(["covers"])
// Single path segment under a fixed prefix; slugs are admin free-text, so the
// security property is "no traversal", not a specific slug charset.
const COVER_PATH_PATTERN = /^(cartoons|episodes|books)\/[^/\\]+\.webp$/
const MAX_FILE_BYTES = 5 * 1024 * 1024

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

export async function uploadCoverImage(formData: FormData): Promise<string> {
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

  const { data, error } = await serviceClient.storage
    .from(bucket)
    .upload(path, file, {
      contentType: "image/webp",
      upsert: true,
    })

  if (error) {
    console.error("[uploadCoverImage] error:", error.message)
    throw new Error("Cover upload failed. Please try again.")
  }

  const { data: urlData } = serviceClient.storage.from(bucket).getPublicUrl(data?.path ?? path)

  return urlData.publicUrl
}
