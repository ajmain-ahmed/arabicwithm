"use client"

import React, { useRef, useState } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Typography,
} from "@mui/material"
import { CenterFocusStrong, Close, Crop, ZoomIn, ZoomOut } from "@mui/icons-material"
import {
  DEFAULT_THUMBNAIL_CROP,
  MAX_THUMBNAIL_ZOOM,
  normalizeThumbnailCrop,
  thumbnailCropCss,
  type ThumbnailCrop,
} from "@/app/lib/thumbnailCrop"

interface ThumbnailCropperProps {
  open: boolean
  imageSrc: string
  value: ThumbnailCrop
  aspectRatio?: string
  title?: string
  description?: string
  onClose: () => void
  onConfirm: (crop: ThumbnailCrop) => void
}

interface DragStart {
  pointerId: number
  clientX: number
  clientY: number
  crop: ThumbnailCrop
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export default function ThumbnailCropper({
  open,
  imageSrc,
  value,
  aspectRatio = "4 / 5",
  title = "Reposition image",
  description = "Drag to keep the main subject in frame. The preview matches the image container on the site.",
  onClose,
  onConfirm,
}: ThumbnailCropperProps) {
  const [draft, setDraft] = useState(() => normalizeThumbnailCrop(value))
  const dragStart = useRef<DragStart | null>(null)

  const moveBy = (deltaX: number, deltaY: number, width: number, height: number, start = draft) => {
    setDraft({
      ...start,
      x: clamp(start.x - (deltaX / Math.max(width, 1)) * 100 / start.zoom),
      y: clamp(start.y - (deltaY / Math.max(height, 1)) * 100 / start.zoom),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="thumbnail-crop-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: "14px 14px 0 0", sm: "16px" },
            m: { xs: 0, sm: 2 },
            alignSelf: { xs: "flex-end", sm: "center" },
            width: { xs: "100%", sm: "calc(100% - 32px)" },
          },
        },
      }}
    >
      <DialogTitle
        id="thumbnail-crop-title"
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#2c1a0e", fontFamily: "var(--font-heading)", fontWeight: 600 }}
      >
        {title}
        <IconButton onClick={onClose} aria-label="Close crop editor" size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 1 }}>
        <Typography sx={{ color: "#7a6e65", fontFamily: "Jost, sans-serif", fontSize: "0.88rem" }}>
          {description}
        </Typography>

        <Box
          role="application"
          tabIndex={0}
          aria-label="Thumbnail preview. Drag the image or use arrow keys to reposition it."
          onKeyDown={(event) => {
            const amount = event.shiftKey ? 5 : 1
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
            event.preventDefault()
            setDraft((current) => ({
              ...current,
              x: clamp(current.x + (event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0)),
              y: clamp(current.y + (event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0)),
            }))
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            dragStart.current = {
              pointerId: event.pointerId,
              clientX: event.clientX,
              clientY: event.clientY,
              crop: draft,
            }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const start = dragStart.current
            if (!start || start.pointerId !== event.pointerId) return
            moveBy(
              event.clientX - start.clientX,
              event.clientY - start.clientY,
              event.currentTarget.clientWidth,
              event.currentTarget.clientHeight,
              start.crop
            )
          }}
          onPointerUp={(event) => {
            dragStart.current = null
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
          onPointerCancel={() => { dragStart.current = null }}
          sx={{
            position: "relative",
            width: "min(100%, 360px)",
            aspectRatio,
            alignSelf: "center",
            overflow: "hidden",
            borderRadius: "12px",
            bgcolor: "#0e2e1f",
            border: "2px solid rgba(184,134,11,0.55)",
            boxShadow: "0 14px 36px rgba(44,26,14,0.2)",
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
            "&:active": { cursor: "grabbing" },
            "&:focus-visible": { outline: "3px solid #b8860b", outlineOffset: 3 },
          }}
        >
          <Box
            component="img"
            draggable={false}
            src={imageSrc}
            alt=""
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
              pointerEvents: "none",
              ...thumbnailCropCss(draft),
            }}
          />
          <Box aria-hidden="true" sx={{ position: "absolute", inset: 10, border: "1px solid rgba(255,255,255,0.72)", borderRadius: "8px", pointerEvents: "none" }} />
          <CenterFocusStrong aria-hidden="true" sx={{ position: "absolute", left: "50%", top: "50%", translate: "-50% -50%", color: "rgba(255,255,255,0.72)", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.55))", pointerEvents: "none" }} />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "center", gap: 1.25, px: { xs: 0, sm: 2 } }}>
          <ZoomOut sx={{ color: "#7a6e65" }} />
          <Slider
            value={draft.zoom}
            min={1}
            max={MAX_THUMBNAIL_ZOOM}
            step={0.01}
            onChange={(_, zoom) => setDraft((current) => ({ ...current, zoom: zoom as number }))}
            aria-label="Thumbnail zoom"
            valueLabelDisplay="auto"
            valueLabelFormat={(zoom) => `${Math.round(zoom * 100)}%`}
            sx={{ color: "#b8860b" }}
          />
          <ZoomIn sx={{ color: "#7a6e65" }} />
        </Box>

        <Button
          onClick={() => setDraft({ ...DEFAULT_THUMBNAIL_CROP })}
          size="small"
          sx={{ alignSelf: "center", color: "#7a6e65", textTransform: "none", fontFamily: "Jost, sans-serif" }}
        >
          Reset position
        </Button>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: "#7a6e65", textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Crop />}
          onClick={() => onConfirm(normalizeThumbnailCrop(draft))}
          sx={{ bgcolor: "#2c1a0e", color: "#f5ede0", borderRadius: "10px", textTransform: "none", "&:hover": { bgcolor: "#1a0f08" } }}
        >
          Confirm crop
        </Button>
      </DialogActions>
    </Dialog>
  )
}
