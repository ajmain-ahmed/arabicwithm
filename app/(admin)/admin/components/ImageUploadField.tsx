"use client"

import React, { useState, useRef, useCallback } from "react"
import { Box, Button, Typography, CircularProgress } from "@mui/material"
import { CloudUpload, DeleteOutlined, ImageOutlined } from "@mui/icons-material"
import { uploadCoverImage } from "@/app/actions/storage"
import { errorMessage } from "@/app/lib/errors"

interface ImageUploadFieldProps {
  label: string
  bucket: string
  path: string
  previewUrl: string | null
  onUploaded?: (url: string) => void
  onRemove?: () => void
}

const MAX_CANVAS_WIDTH = 1280
const MAX_CANVAS_HEIGHT = 1280
const WEBP_QUALITY = 0.85

async function fileToWebpBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_CANVAS_WIDTH || height > MAX_CANVAS_HEIGHT) {
        const scale = Math.min(MAX_CANVAS_WIDTH / width, MAX_CANVAS_HEIGHT / height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not create canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("WebP conversion failed"))
            return
          }
          resolve(blob)
        },
        "image/webp",
        WEBP_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image for conversion"))
    }

    img.src = url
  })
}

export default function ImageUploadField({
  label,
  bucket,
  path,
  previewUrl,
  onUploaded,
  onRemove,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      setError(null)

      try {
        const objectUrl = URL.createObjectURL(file)
        setLocalPreview(objectUrl)

        const webpBlob = await fileToWebpBlob(file)
        const formData = new FormData()
        formData.append("bucket", bucket)
        formData.append("path", path)
        formData.append("file", webpBlob, "cover.webp")

        const publicUrl = await uploadCoverImage(formData)
        onUploaded?.(publicUrl)
      } catch (err: unknown) {
        setError(errorMessage(err) ?? "Upload failed")
        setLocalPreview(null)
      } finally {
        setUploading(false)
        if (inputRef.current) {
          inputRef.current.value = ""
        }
      }
    },
    [bucket, path, onUploaded]
  )

  const activePreview = localPreview ?? previewUrl

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography
        sx={{
          fontFamily: "Jost, sans-serif",
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
            height: 120,
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
          {activePreview ? (
            <Box
              component="img"
              src={activePreview}
              alt={label}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <ImageOutlined sx={{ fontSize: 40, color: "rgba(122,110,101,0.4)" }} />
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 200 }}>
          <Button
            variant="outlined"
            component="label"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
            sx={{
              textTransform: "none",
              fontFamily: "Jost, sans-serif",
              fontWeight: 600,
              borderRadius: "10px",
              borderColor: "rgba(184,134,11,0.4)",
              color: "#2c1a0e",
              "&:hover": { borderColor: "#b8860b", backgroundColor: "rgba(184,134,11,0.06)" },
            }}
          >
            {uploading ? "Uploading…" : "Upload cover"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </Button>

          {activePreview && onRemove && (
            <Button
              onClick={() => {
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

          {path && (
            <Typography
              sx={{
                fontFamily: "Jost, sans-serif",
                fontSize: "0.75rem",
                color: "#9e8a7a",
              }}
            >
              {path}
            </Typography>
          )}
        </Box>
      </Box>

      {error && (
        <Typography
          sx={{
            fontFamily: "Jost, sans-serif",
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
    </Box>
  )
}
