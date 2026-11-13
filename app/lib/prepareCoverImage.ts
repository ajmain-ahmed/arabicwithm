import { COVER_VARIANT_WIDTHS } from '@/app/lib/imageVariantPaths'

export const MAX_COVER_SOURCE_BYTES = 20 * 1024 * 1024
export const COVER_UPLOAD_TIMEOUT_MS = 45_000
const EXTENSIONS = /\.(?:jpe?g|png|webp|gif|avif|bmp|svg|ico)$/i

/** Decode once, then produce the existing WebP original and responsive sizes. */
export async function prepareCoverImage(file: File, signal: AbortSignal, variants = false): Promise<{ original: Blob; variants: Blob[] }> {
  if (!file.size) throw new Error('This image is empty. Please choose another cover.')
  if (file.size > MAX_COVER_SOURCE_BYTES) throw new Error('This image is too large. Please choose an image of 20 MB or smaller.')
  if (!file.type.startsWith('image/') && !EXTENSIONS.test(file.name)) throw new Error('Please choose a JPG, PNG or WebP image.')
  signal.throwIfAborted()
  const image = new Image(), url = URL.createObjectURL(file)
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { image.src = ''; reject(new Error('Cover preparation timed out. Please try again.')) }
      const clear = () => signal.removeEventListener('abort', abort)
      image.onload = () => { clear(); resolve() }
      image.onerror = () => { clear(); reject(new Error("This image couldn't be read. Please choose a different image.")) }
      signal.addEventListener('abort', abort, { once: true })
      image.src = url
    })
    if (!image.width || !image.height || image.width * image.height > 40_000_000) throw new Error('This image is too large to process. Please choose a smaller image.')
    const encode = (maxWidth: number, maxHeight: number, quality: number) => new Promise<Blob>((resolve, reject) => {
      signal.throwIfAborted()
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) { reject(new Error('Your browser could not prepare this cover. Please try again.')); return }
      const abort = () => reject(new Error('Cover preparation timed out. Please try again.'))
      signal.addEventListener('abort', abort, { once: true })
      try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          signal.removeEventListener('abort', abort)
          if (!blob || blob.type !== 'image/webp') { reject(new Error('Your browser could not prepare a WebP cover. Please try another browser.')); return }
          resolve(blob)
        }, 'image/webp', quality)
      } catch { signal.removeEventListener('abort', abort); reject(new Error("This image couldn't be prepared. Please choose another image.")) }
    })
    const original = await encode(1280, 1280, .85)
    const previews: Blob[] = []
    if (variants) for (const width of COVER_VARIANT_WIDTHS) previews.push(await encode(width, 1280, .82))
    return { original, variants: previews }
  } finally { URL.revokeObjectURL(url); image.onload = null; image.onerror = null }
}
