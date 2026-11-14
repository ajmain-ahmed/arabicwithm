import { FEATURED_VARIANT_WIDTHS } from '@/app/lib/imageVariantPaths'

/** Browser encoding keeps native image addons out of the Admin Worker route. */
export async function prepareFeaturedImage(file: File, signal: AbortSignal): Promise<Blob[]> {
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { image.src = ''; reject(new Error('Artwork preparation timed out. Please try again.')) }
      signal.addEventListener('abort', abort, { once: true })
      const cleanup = () => signal.removeEventListener('abort', abort)
      image.onload = () => { cleanup(); resolve() }
      image.onerror = () => { cleanup(); reject(new Error('This image could not be read. Please choose another image.')) }
      image.src = url
    })
    if (image.width * image.height > 40_000_000) throw new Error('Please choose a smaller image.')
    return await Promise.all(FEATURED_VARIANT_WIDTHS.map(width => new Promise<Blob>((resolve, reject) => {
      signal.throwIfAborted()
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, width / image.width)
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext('2d')
      if (!context) { reject(new Error('Your browser could not prepare this image.')); return }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob?.type === 'image/webp' ? resolve(blob) : reject(new Error('Your browser could not prepare this image.')), 'image/webp', .85)
    })))
  } finally { URL.revokeObjectURL(url) }
}
