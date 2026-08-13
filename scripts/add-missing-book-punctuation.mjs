import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const TERMINAL_PUNCTUATION = /[.!?؟…]/u
const TRAILING_QUOTES = /["'”’»)]*$/u

function punctuationForTranslation(translation) {
  const sentence = String(translation ?? '').trim().replace(TRAILING_QUOTES, '')
  if (sentence.endsWith('?') || sentence.endsWith('؟')) return '؟'
  if (sentence.endsWith('!')) return '!'
  if (sentence.endsWith('…')) return '…'
  return '.'
}

function addMissingPunctuation(block) {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return { block, changed: false }
  if (typeof block.punctuation === 'string' && block.punctuation.trim()) return { block, changed: false }

  const tokens = Array.isArray(block.tokens) ? block.tokens : []
  const lastToken = tokens.at(-1)
  if (lastToken && TERMINAL_PUNCTUATION.test(String(lastToken.suffix ?? ''))) {
    return { block, changed: false }
  }

  return {
    block: { ...block, punctuation: punctuationForTranslation(block.translation) },
    changed: true,
  }
}

async function main() {
  const [bookSlug, ...flags] = process.argv.slice(2)
  if (!bookSlug) {
    throw new Error('Usage: node --env-file=.env.local scripts/add-missing-book-punctuation.mjs <book-slug> [--write]')
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase service configuration is missing')
  }

  const write = flags.includes('--write')
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: book, error: bookError } = await client
    .from('books')
    .select('id, title')
    .eq('slug', bookSlug)
    .single()
  if (bookError) throw bookError

  const { data: chapters, error: chapterError } = await client
    .from('chapters')
    .select('id, chapter_number, title, content')
    .eq('book_id', book.id)
    .order('chapter_number')
  if (chapterError) throw chapterError

  let changedBlocks = 0
  let questionMarks = 0
  const updates = []

  for (const chapter of chapters ?? []) {
    if (!Array.isArray(chapter.content)) throw new Error(`Chapter ${chapter.chapter_number} has invalid content`)
    let chapterChanges = 0
    const content = chapter.content.map((block) => {
      const result = addMissingPunctuation(block)
      if (result.changed) {
        chapterChanges += 1
        changedBlocks += 1
        if (result.block.punctuation === '؟') questionMarks += 1
      }
      return result.block
    })
    updates.push({ id: chapter.id, number: chapter.chapter_number, title: chapter.title, content, changed: chapterChanges })
  }

  console.log(`${book.title}: ${chapters?.length ?? 0} chapters, ${changedBlocks} blocks need punctuation (${questionMarks} questions).`)
  for (const update of updates) console.log(`Chapter ${update.number}: ${update.changed} changes`)

  if (!write) {
    console.log('Dry run only. Add --write to update Supabase.')
    return
  }

  for (const update of updates) {
    if (update.changed === 0) continue
    const { error } = await client.from('chapters').update({ content: update.content }).eq('id', update.id)
    if (error) throw error
  }
  console.log('Supabase chapters updated successfully.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
