"use server"

import { getAuthenticatedUserId } from "@/app/actions/auth"
import { rateLimit } from "@/app/lib/rateLimit"
import { serviceClient } from "@/app/lib/supabase"
import {
  PRACTICE_WORDS_METADATA_KEY,
  createPracticeWordId,
  parsePracticeWords,
  type PracticeRating,
  type PracticeWord,
  type PracticeWordInput,
} from "@/app/lib/practice"

const MAX_SAVED_WORDS = 250

export interface PracticeLibraryResult {
  authenticated: boolean
  words: PracticeWord[]
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function sanitizeWord(input: PracticeWordInput): PracticeWordInput {
  const entryType = input.entryType === "phrase" ? "phrase" : "word"
  const arabic = cleanString(input.arabic, 200)
  const headword = cleanString(input.headword, 200)
  const id = cleanString(input.id, 250) || createPracticeWordId(entryType, headword, arabic)
  const plain = cleanString(input.plain, 200)

  if (!id || !arabic || !plain) throw new Error("Invalid practice word")

  return {
    id,
    arabic,
    plain,
    headword: headword || undefined,
    transliteration: cleanString(input.transliteration, 250),
    english: cleanString(input.english, 500),
    cefr: cleanString(input.cefr, 10) || undefined,
    pos: cleanString(input.pos, 50) || undefined,
    entryType,
  }
}

/* Serialize each user's read-modify-write so two tabs saving at once can't
   lose updates (last write would win on a stale read). In-process only —
   consistent with rateLimit.ts's single-instance assumption. */
const userPersistQueues = new Map<string, Promise<void>>()
const MAX_PERSIST_QUEUES = 10_000

async function serializeForUser<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const previous = userPersistQueues.get(userId) ?? Promise.resolve()
  const run = previous.catch(() => undefined).then(task)
  userPersistQueues.set(userId, run.then(() => undefined, () => undefined))
  if (userPersistQueues.size > MAX_PERSIST_QUEUES) {
    userPersistQueues.delete(userPersistQueues.keys().next().value!)
  }
  return run
}

async function readPracticeContext(userId: string) {
  const { data, error } = await serviceClient.auth.admin.getUserById(userId)
  if (error || !data.user) {
    console.error('[readPracticeContext] auth.admin.getUserById failed:', error)
    throw new Error("Unable to load your practice profile.")
  }

  return {
    userId,
    metadata: data.user.user_metadata as Record<string, unknown>,
    words: parsePracticeWords(data.user.user_metadata as Record<string, unknown>),
  }
}

async function getPracticeContext() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null
  return readPracticeContext(userId)
}

async function persistWords(userId: string, metadata: Record<string, unknown>, words: PracticeWord[]) {
  const { error } = await serviceClient.auth.admin.updateUserById(userId, {
    user_metadata: { ...metadata, [PRACTICE_WORDS_METADATA_KEY]: words },
  })
  if (error) {
    console.error('[persistWords] auth.admin.updateUserById failed:', error)
    throw new Error("Unable to save practice words. Please try again.")
  }
}

export async function fetchPracticeLibrary(): Promise<PracticeLibraryResult> {
  const context = await getPracticeContext()
  return context
    ? { authenticated: true, words: context.words }
    : { authenticated: false, words: [] }
}

export async function savePracticeWord(input: PracticeWordInput): Promise<PracticeWord> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error("AUTH_REQUIRED")
  const limited = rateLimit(`practice:${userId}`, 30, 60 * 1000)
  if (!limited.ok) throw new Error("Too many saves. Please try again shortly.")

  return serializeForUser(userId, async () => {
    const context = await readPracticeContext(userId)
    const safeInput = sanitizeWord(input)
    const existingIndex = context.words.findIndex((word) => word.id === safeInput.id)
    const existing = existingIndex >= 0 ? context.words[existingIndex] : null
    const savedWord: PracticeWord = {
      ...safeInput,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
      practiceCount: existing?.practiceCount ?? 0,
      mastery: existing?.mastery ?? 0,
      lastRating: existing?.lastRating,
      lastPracticedAt: existing?.lastPracticedAt,
      lastSelectedAt: existing?.lastSelectedAt,
    }

    const nextWords = [...context.words]
    if (existingIndex >= 0) nextWords[existingIndex] = savedWord
    else {
      if (nextWords.length >= MAX_SAVED_WORDS) throw new Error(`You can save up to ${MAX_SAVED_WORDS} practice words.`)
      nextWords.push(savedWord)
    }

    await persistWords(context.userId, context.metadata, nextWords)
    return savedWord
  })
}

export async function removePracticeWord(wordId: string): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error("AUTH_REQUIRED")
  const limited = rateLimit(`practice:${userId}`, 30, 60 * 1000)
  if (!limited.ok) throw new Error("Too many saves. Please try again shortly.")

  const safeId = cleanString(wordId, 250)
  await serializeForUser(userId, async () => {
    const context = await readPracticeContext(userId)
    await persistWords(
      context.userId,
      context.metadata,
      context.words.filter((word) => word.id !== safeId)
    )
  })
}

export async function markPracticeWordsSelected(wordIds: string[]): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error("AUTH_REQUIRED")
  const limited = rateLimit(`practice:${userId}`, 30, 60 * 1000)
  if (!limited.ok) throw new Error("Too many saves. Please try again shortly.")

  const ids = new Set(wordIds.map((id) => cleanString(id, 250)).filter(Boolean).slice(0, 50))
  if (ids.size === 0) return
  const selectedAt = new Date().toISOString()
  await serializeForUser(userId, async () => {
    const context = await readPracticeContext(userId)
    const nextWords = context.words.map((word) => ids.has(word.id) ? { ...word, lastSelectedAt: selectedAt } : word)
    await persistWords(context.userId, context.metadata, nextWords)
  })
}

export async function ratePracticeWord(wordId: string, rating: PracticeRating): Promise<void> {
  if (!['very_easy', 'easy', 'medium', 'hard'].includes(rating)) throw new Error("Invalid rating")
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error("AUTH_REQUIRED")
  const limited = rateLimit(`practice:${userId}`, 30, 60 * 1000)
  if (!limited.ok) throw new Error("Too many saves. Please try again shortly.")

  const safeId = cleanString(wordId, 250)
  const masteryChange: Record<PracticeRating, number> = {
    very_easy: 3,
    easy: 2,
    medium: 1,
    hard: -1,
  }
  const practisedAt = new Date().toISOString()
  await serializeForUser(userId, async () => {
    const context = await readPracticeContext(userId)
    const nextWords = context.words.map((word) => word.id === safeId
      ? {
          ...word,
          practiceCount: word.practiceCount + 1,
          mastery: Math.max(0, Math.min(10, word.mastery + masteryChange[rating])),
          lastRating: rating,
          lastPracticedAt: practisedAt,
        }
      : word)

    await persistWords(context.userId, context.metadata, nextWords)
  })
}
