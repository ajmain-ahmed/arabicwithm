"use server"

import { getAuthenticatedUserId } from "@/app/actions/auth"
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

async function getPracticeContext() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null

  const { data, error } = await serviceClient.auth.admin.getUserById(userId)
  if (error || !data.user) throw new Error(error?.message ?? "Unable to load profile")

  return {
    userId,
    metadata: data.user.user_metadata as Record<string, unknown>,
    words: parsePracticeWords(data.user.user_metadata as Record<string, unknown>),
  }
}

async function persistWords(userId: string, metadata: Record<string, unknown>, words: PracticeWord[]) {
  const { error } = await serviceClient.auth.admin.updateUserById(userId, {
    user_metadata: { ...metadata, [PRACTICE_WORDS_METADATA_KEY]: words },
  })
  if (error) throw new Error(error.message)
}

export async function fetchPracticeLibrary(): Promise<PracticeLibraryResult> {
  const context = await getPracticeContext()
  return context
    ? { authenticated: true, words: context.words }
    : { authenticated: false, words: [] }
}

export async function savePracticeWord(input: PracticeWordInput): Promise<PracticeWord> {
  const context = await getPracticeContext()
  if (!context) throw new Error("AUTH_REQUIRED")

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
}

export async function removePracticeWord(wordId: string): Promise<void> {
  const context = await getPracticeContext()
  if (!context) throw new Error("AUTH_REQUIRED")

  const safeId = cleanString(wordId, 250)
  await persistWords(
    context.userId,
    context.metadata,
    context.words.filter((word) => word.id !== safeId)
  )
}

export async function markPracticeWordsSelected(wordIds: string[]): Promise<void> {
  const context = await getPracticeContext()
  if (!context) throw new Error("AUTH_REQUIRED")

  const ids = new Set(wordIds.map((id) => cleanString(id, 250)).filter(Boolean).slice(0, 50))
  if (ids.size === 0) return
  const selectedAt = new Date().toISOString()
  const nextWords = context.words.map((word) => ids.has(word.id) ? { ...word, lastSelectedAt: selectedAt } : word)
  await persistWords(context.userId, context.metadata, nextWords)
}

export async function ratePracticeWord(wordId: string, rating: PracticeRating): Promise<void> {
  if (!['very_easy', 'easy', 'medium', 'hard'].includes(rating)) throw new Error("Invalid rating")
  const context = await getPracticeContext()
  if (!context) throw new Error("AUTH_REQUIRED")

  const safeId = cleanString(wordId, 250)
  const masteryChange: Record<PracticeRating, number> = {
    very_easy: 3,
    easy: 2,
    medium: 1,
    hard: -1,
  }
  const practisedAt = new Date().toISOString()
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
}
