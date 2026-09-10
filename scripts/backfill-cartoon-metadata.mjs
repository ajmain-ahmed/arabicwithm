import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { missingMetadataPatch } from './episode-metadata.mjs'
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
const apply = process.argv.includes('--apply')
const client = createClient(url, key, { auth: { persistSession: false } })
const reviewed = JSON.parse(readFileSync(new URL('./reviewed-episode-metadata.json', import.meta.url), 'utf8'))
let changed = 0
for (let offset = 0; ; offset += 100) {
  const { data, error } = await client.from('episodes').select('id, slug, description, tags, transcript').order('id').range(offset, offset + 99)
  if (error) throw new Error(error.message)
  for (const episode of data) {
    const review = reviewed[episode.slug]
    const matches = review?.transcriptHash === createHash('sha256').update(JSON.stringify(episode.transcript)).digest('hex')
    if (review && !matches) { console.log(`Skipped changed transcript: ${episode.slug}`); continue }
    const patch = matches ? {
      ...(!episode.description?.trim() ? { description: review.description } : {}),
      ...(!episode.tags?.length ? { tags: review.tags } : {}),
    } : missingMetadataPatch(episode)
    if (!patch) continue
    for (const [field, value] of Object.entries(patch)) {
      if (apply) {
        let update = client.from('episodes').update({ [field]: value }).eq('id', episode.id)
        // Compare-and-set: preserve metadata written by an editor after the read.
        update = episode[field] == null ? update.is(field, null) : update.eq(field, field === 'tags' ? '{}' : episode[field])
        const { data: updated, error: updateError } = await update.select('id')
        if (updateError) throw new Error(`${episode.slug}: ${updateError.message}`)
        if (!updated.length) { console.log(`Skipped concurrent edit: ${episode.slug} ${field}`); continue }
      }
      changed += 1
      console.log(`${apply ? 'Updated' : 'Would update'} ${episode.slug} ${field}: ${JSON.stringify(value)}`)
    }
  }
  if (data.length < 100) break
}
console.log(`${changed} field changes. ${apply ? 'Backfill complete; revalidate cartoons-public before serving cached catalogue pages.' : 'Dry run only. Pass --apply to write missing metadata.'}`)
