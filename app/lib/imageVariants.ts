import 'server-only'
import sharp from 'sharp'
import { serviceClient } from '@/app/lib/supabase'
import { coverVariantPaths, FEATURED_VARIANT_WIDTHS, featuredVariantPaths, COVER_VARIANT_WIDTHS } from '@/app/lib/imageVariantPaths'

export async function syncImageVariants(file: Blob, path: string): Promise<void> {
  const featured = path.startsWith('featured/')
  const paths = featured ? featuredVariantPaths(path) : coverVariantPaths(path)
  const widths = featured ? FEATURED_VARIANT_WIDTHS : COVER_VARIANT_WIDTHS
  if (!paths.length || paths.length !== widths.length) throw new Error('Invalid image variant source path.')
  const bytes = Buffer.from(await file.arrayBuffer())
  const source = sharp(bytes, { animated: false })
  const metadata = await source.metadata()
  if ((metadata.pages ?? 1) > 1) {
    await removeImageVariants(path)
    return
  }
  for (let index = 0; index < widths.length; index++) {
    const output = await source.clone().resize({ width: widths[index], withoutEnlargement: true })
      [featured ? 'avif' : 'webp']({ quality: featured ? 60 : 82 }).toBuffer()
    const { error } = await serviceClient.storage.from('covers').upload(paths[index], output, {
      contentType: featured ? 'image/avif' : 'image/webp',
      cacheControl: '86400',
      upsert: true,
    })
    if (error) throw new Error(`Unable to save image variant: ${error.message}`)
  }
}

export async function removeImageVariants(path: string): Promise<void> {
  const paths = path.startsWith('featured/') ? featuredVariantPaths(path) : coverVariantPaths(path)
  if (!paths.length) return
  const { error } = await serviceClient.storage.from('covers').remove(paths)
  if (error) throw new Error(`Unable to remove image variants: ${error.message}`)
}
