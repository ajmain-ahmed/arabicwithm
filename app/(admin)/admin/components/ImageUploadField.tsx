"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Box, Button, Typography, CircularProgress } from "@mui/material"
import { CloudUpload, Crop, DeleteOutlined, ImageOutlined } from "@mui/icons-material"
import { uploadCoverImage } from "@/app/actions/storage"
import { prepareCoverImage, COVER_UPLOAD_TIMEOUT_MS } from '@/app/lib/prepareCoverImage'
import { COVER_VARIANT_WIDTHS } from '@/app/lib/imageVariantPaths'
import { thumbnailCropCss, type ThumbnailCrop } from "@/app/lib/thumbnailCrop"
import ThumbnailCropper from "./EpisodeThumbnailCropper"

interface ImageUploadFieldProps {
  label: string
  bucket: string
  path: string
  previewUrl: string | null
  previewAspectRatio?: string
  previewCrop?: ThumbnailCrop
  onCropChange?: (crop: ThumbnailCrop) => void
  onUploaded?: (url: string) => void
  onRemove?: () => void
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
}

export default function ImageUploadField({
  label,
  bucket,
  path,
  previewUrl,
  previewAspectRatio = "1 / 1",
  previewCrop,
  onCropChange,
  onUploaded,
  onRemove,
  onUploadingChange,
  disabled = false,
}: ImageUploadFieldProps) {
  const [failedPreview, setFailedPreview] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const controller = useRef<AbortController | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const generation = useRef(0)
  const uploadBusy = useRef(false)
  const uploadChange = useRef(onUploadingChange)
  useEffect(() => { uploadChange.current = onUploadingChange }, [onUploadingChange])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    controller.current?.abort(); setStatus(''); setError(null)
    generation.current += 1; uploadBusy.current = false; setUploading(false); uploadChange.current?.(false)
    setLocalPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current)
      return null
    })
    setCropOpen(false)
    return () => { controller.current?.abort(); generation.current += 1; uploadBusy.current = false; uploadChange.current?.(false) }
  }, [path])

  useEffect(() => () => {
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview)
  }, [localPreview])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || uploadBusy.current || disabled) return
      if (!path) { setError('The cover upload is not ready yet. Please try again.'); return }
      const version = generation.current, attempt = new AbortController()
      controller.current = attempt
      uploadBusy.current = true; uploadChange.current?.(true)
      setUploading(true); setError(null); setStatus(`Selected: ${file.name}`)
      let timer: ReturnType<typeof setTimeout> | undefined
      let prepared = false
      try {
        const result = await Promise.race([
          (async () => {
            const image = await prepareCoverImage(file, attempt.signal, path.startsWith('books/'))
            prepared = true
            if (version !== generation.current || attempt.signal.aborted) return null
            const objectUrl = URL.createObjectURL(image.original)
            setLocalPreview(objectUrl)
            const formData = new FormData()
            formData.append('bucket', bucket); formData.append('path', path)
            formData.append('file', image.original, 'cover.webp')
            image.variants.forEach((blob, index) => formData.append(`variant${COVER_VARIANT_WIDTHS[index]}`, blob, `cover-${COVER_VARIANT_WIDTHS[index]}.webp`))
            return uploadCoverImage(formData)
          })(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => { attempt.abort(); reject(new Error('Cover upload timed out. Please try again.')) }, COVER_UPLOAD_TIMEOUT_MS) }),
        ])
        if (version !== generation.current || attempt.signal.aborted || !result) return
        if (typeof result !== 'string' && !result.ok) { setError(result.error); setStatus(''); setLocalPreview(null); return }
        const publicUrl = typeof result === 'string' ? result : result.data
        onUploaded?.(publicUrl)
        setLocalPreview(null)
        setStatus(path.startsWith('books/') ? 'Cover uploaded. Save this book to keep the change.' : 'Cover uploaded. Save to keep the change.')
        if (onCropChange) setCropOpen(true)
      } catch (err: unknown) {
        if (version !== generation.current) return
        const message = err instanceof Error ? err.message : ''
        if (process.env.NODE_ENV === 'development') console.error('[cover upload]', err)
        setError(attempt.signal.aborted ? 'Cover upload timed out. Please try again.' : !prepared && message ? message : "We couldn't upload this cover. Please try again.")
        setStatus(''); setLocalPreview(null)
      } finally {
        clearTimeout(timer)
        if (version === generation.current) {
          uploadBusy.current = false; uploadChange.current?.(false); setUploading(false)
          if (inputRef.current) inputRef.current.value = ''
        }
      }
    },
    [bucket, path, disabled, onCropChange, onUploaded]
  )

  const activePreview = localPreview ?? previewUrl
  const previewFailed = activePreview !== null && failedPreview === activePreview

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography
        sx={{
          fontFamily: "var(--font-sans), sans-serif",
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "#7a6e65",
        }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            width: 120,
            aspectRatio: previewAspectRatio,
            borderRadius: "12px",
            border: "1px solid rgba(122,110,101,0.2)",
            backgroundColor: "rgba(245,237,224,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {activePreview && !previewFailed ? (
            <Box
              component="img"
              src={activePreview}
              alt={label}
              onError={() => { setFailedPreview(activePreview); if (process.env.NODE_ENV === 'development') console.warn('[cover preview] Unable to display the selected cover.') }}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: path.startsWith("books/") ? "contain" : "cover",
                ...thumbnailCropCss(previewCrop),
              }}
            />
          ) : (
            <Box role="img" aria-label={previewFailed ? "Cover preview unavailable" : "No cover selected"}><ImageOutlined sx={{ fontSize: 40, color: "rgba(122,110,101,0.4)" }} /></Box>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: "1 1 200px", maxWidth: "100%" }}>
          <Button
            variant="outlined"
            component="label"
            disabled={uploading || disabled || !path}
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
            sx={{
              textTransform: "none",
              fontFamily: "var(--font-sans), sans-serif",
              fontWeight: 600,
              borderRadius: "10px",
              borderColor: "rgba(184,134,11,0.4)",
              color: "#2c1a0e",
              "&:hover": { borderColor: "#b8860b", backgroundColor: "rgba(184,134,11,0.06)" },
            }}
          >
            {uploading ? "Uploading cover…" : "Upload cover"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              disabled={uploading || disabled || !path}
              hidden
              onChange={handleFileChange}
            />
          </Button>

          {activePreview && onRemove && (
            <Button
              disabled={uploading || disabled}
              onClick={() => {
                setStatus(''); setError(null)
                setLocalPreview(null)
                onRemove()
              }}
              startIcon={<DeleteOutlined />}
              size="small"
              color="error"
              sx={{ textTransform: "none", borderRadius: "8px" }}
            >
              Reset cover
            </Button>
          )}

          {activePreview && previewCrop && onCropChange && (
            <Button
              disabled={uploading || disabled}
              onClick={() => setCropOpen(true)}
              startIcon={<Crop />}
              size="small"
              variant="outlined"
              sx={{
                textTransform: "none",
                fontFamily: "var(--font-sans), sans-serif",
                fontWeight: 600,
                borderRadius: "8px",
                borderColor: "rgba(184,134,11,0.4)",
                color: "#2c1a0e",
              }}
            >
              Reposition image
            </Button>
          )}

          {path && !path.startsWith("books/") && (
            <Typography
              sx={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: "0.75rem",
                overflowWrap: "anywhere",
                color: "#9e8a7a",
              }}
            >
              {path}
            </Typography>
          )}
        </Box>
      </Box>

      {previewFailed && <Typography role="alert" sx={{ color: "var(--awm-muted)", fontSize: 13 }}>Cover preview unavailable. Please check the image or try uploading again.</Typography>}
      {status && <Typography role="status" sx={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--awm-muted)", overflowWrap: "anywhere" }}>{status}</Typography>}
      {error && (
        <Typography
          role="alert"
          sx={{
            overflowWrap: "anywhere",
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: "0.8rem",
            color: "#c0392b",
            background: "rgba(192,57,43,0.06)",
            border: "1px solid rgba(192,57,43,0.2)",
            borderRadius: "8px",
            px: 1.5,
            py: 1,
          }}
        >
          {error}
        </Typography>
      )}

      {activePreview && previewCrop && onCropChange && cropOpen && (
        <ThumbnailCropper
          open={cropOpen}
          imageSrc={activePreview}
          value={previewCrop}
          aspectRatio={previewAspectRatio}
          onClose={() => setCropOpen(false)}
          onConfirm={(crop) => {
            onCropChange(crop)
            setCropOpen(false)
          }}
        />
      )}
    </Box>
  )
}
