import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required.')

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const config = {
  public: false,
  fileSizeLimit: 52_428_800,
  allowedMimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'],
}
const { data: existing } = await supabase.storage.getBucket('audiobooks')
const result = existing
  ? await supabase.storage.updateBucket('audiobooks', config)
  : await supabase.storage.createBucket('audiobooks', config)
if (result.error) throw result.error
console.log('Private audiobooks bucket is configured.')
