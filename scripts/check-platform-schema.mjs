import { createClient } from '@supabase/supabase-js'
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
let failed = false
for (const table of ['learning_profiles', 'learning_activity_daily', 'memory_reviews', 'memory_sessions', 'memory_legacy_progress', 'subscriptions']) {
  // GET instead of HEAD: some PostgREST versions suppress error bodies on HEAD.
  const { error } = await client.from(table).select('*').limit(0)
  console.log(`${table}: ${error ? `${error.code}: ${error.message}` : 'ready'}`)
  if (error) failed = true
}
const { error } = await client.rpc('memory_totals', { p_user_id: '00000000-0000-0000-0000-000000000000' })
console.log(`memory_totals: ${error ? `${error.code}: ${error.message}` : 'ready'}`)
if (error) failed = true
if (failed) console.log('Apply docs/platform-setup.sql in the connected Supabase project, then run this check again.')
process.exitCode = failed ? 1 : 0
