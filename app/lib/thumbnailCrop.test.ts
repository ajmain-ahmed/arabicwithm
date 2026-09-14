import { describe, expect, it } from "vitest"
import {
  DEFAULT_THUMBNAIL_CROP,
  normalizeThumbnailCrop,
  thumbnailCropCss,
} from "./thumbnailCrop"

describe("thumbnail crop metadata", () => {
  it("uses a centred, unzoomed crop for missing metadata", () => {
    expect(normalizeThumbnailCrop(null)).toEqual(DEFAULT_THUMBNAIL_CROP)
  })

  it("clamps persisted values to the supported crop range", () => {
    expect(normalizeThumbnailCrop({ x: -10, y: 140, zoom: 9 })).toEqual({
      x: 0,
      y: 100,
      zoom: 3,
    })
  })

  it("builds matching focal point styles for preview and live thumbnails", () => {
    expect(thumbnailCropCss({ x: 32, y: 68, zoom: 1.4 })).toEqual({
      objectPosition: "32% 68%",
      transformOrigin: "32% 68%",
      transform: "scale(1.4)",
    })
  })
})
