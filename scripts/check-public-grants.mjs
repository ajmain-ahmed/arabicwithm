import { createClient } from '@supabase/supabase-js'

// Probes what the anon (publishable) key can do against each table, using only
// non-mutating operations: select limit(0), and update/delete with an
// impossible predicate (matches zero rows even when granted).
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const NIL_UUID = '00000000-0000-0000-0000-000000000000'
const tables = [
  { name: 'shows', predicate: { col: 'id', val: NIL_UUID } },
  { name: 'episodes', predicate: { col: 'id', val: NIL_UUID } },
  { name: 'hanswehr_dictionary', predicate: { col: 'id', val: -1 } },
  { name: 'phrases', predicate: { col: 'id', val: -1 } },
  // Controls: hardened by existing migrations, must be denied.
  { name: 'subscriptions', predicate: { col: 'user_id', val: NIL_UUID }, control: true },
  { name: 'chapters', predicate: { col: 'id', val: -1 }, control: true },
]

function verdict(error) {
  if (!error) return 'GRANTED'
  if (error.code === '42501' || /permission denied/i.test(error.message)) return 'denied'
  if (error.code === '401') return 'denied'
  return `denied (${error.code}: ${error.message.slice(0, 60)})`
}

let exposed = false
for (const t of tables) {
  const { error: selErr } = await anon.from(t.name).select('*').limit(0)
  const { error: updErr } = await anon
    .from(t.name)
    .update({ updated_at: '1970-01-01' })
    .eq(t.predicate.col, t.predicate.val)
  const { error: delErr } = await anon
    .from(t.name)
    .delete()
    .eq(t.predicate.col, t.predicate.val)
  const grants = [selErr, updErr, delErr].some((e) => !e)
  if (grants && !t.control) exposed = true
  console.log(
    `${t.control ? '[control] ' : ''}${t.name}: ` +
    `select=${verdict(selErr)} update=${verdict(updErr)} delete=${verdict(delErr)}`,
  )
}
console.log(
  exposed
    ? '\nRESULT: anon key has privileges on at least one content table. Harden before launch.'
    : '\nRESULT: all content tables deny the anon key.',
)
process.exitCode = exposed ? 1 : 0
