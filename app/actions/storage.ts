// app/actions/storage.ts — Supabase Storage uploads for admin covers

"use server"

import { guardAdmin } from "@/app/actions/auth"
import { serviceClient } from "@/app/lib/supabase"

export async function uploadCoverImage(formData: FormData): Promise<string> {
  await guardAdmin()

  const bucket = formData.get("bucket")
  const path = formData.get("path")
  const file = formData.get("file")

  if (typeof bucket !== "string" || typeof path !== "string" || !(file instanceof Blob)) {
    throw new Error("Invalid upload payload: bucket, path, and file are required")
  }

  if (!bucket || !path) {
    throw new Error("Bucket and path must be non-empty")
  }

  const { data, error } = await serviceClient.storage
    .from(bucket)
    .upload(path, file, {
      contentType: "image/webp",
      upsert: true,
    })

  if (error) {
    console.error("[uploadCoverImage] error:", error.message)
    throw new Error(error.message)
  }

  const { data: urlData } = serviceClient.storage.from(bucket).getPublicUrl(data?.path ?? path)

  return urlData.publicUrl
}
