export interface ThumbnailCrop {
  /** Horizontal focal point, stored as a percentage from the left edge. */
  x: number
  /** Vertical focal point, stored as a percentage from the top edge. */
  y: number
  /** Non-destructive scale applied after object-fit: cover. */
  zoom: number
}

export const DEFAULT_THUMBNAIL_CROP: ThumbnailCrop = Object.freeze({
  x: 50,
  y: 50,
  zoom: 1,
})

export const MAX_THUMBNAIL_ZOOM = 3

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizeThumbnailCrop(value: unknown): ThumbnailCrop {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_THUMBNAIL_CROP }
  }

  const crop = value as Partial<Record<keyof ThumbnailCrop, unknown>>
  const x = Number(crop.x)
  const y = Number(crop.y)
  const zoom = Number(crop.zoom)

  return {
    x: Number.isFinite(x) ? clamp(x, 0, 100) : DEFAULT_THUMBNAIL_CROP.x,
    y: Number.isFinite(y) ? clamp(y, 0, 100) : DEFAULT_THUMBNAIL_CROP.y,
    zoom: Number.isFinite(zoom)
      ? clamp(zoom, DEFAULT_THUMBNAIL_CROP.zoom, MAX_THUMBNAIL_ZOOM)
      : DEFAULT_THUMBNAIL_CROP.zoom,
  }
}

export function thumbnailCropCss(cropValue?: ThumbnailCrop | null, scaleMultiplier = 1) {
  const crop = normalizeThumbnailCrop(cropValue)
  const focalPoint = `${crop.x}% ${crop.y}%`

  return {
    objectPosition: focalPoint,
    transformOrigin: focalPoint,
    transform: `scale(${crop.zoom * scaleMultiplier})`,
  } as const
}
