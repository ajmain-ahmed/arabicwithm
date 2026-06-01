import type { Answer } from '@/app/actions/revision'

export type ProgressState = {
  repetitions: number
  interval_days: number
  ease_factor: number
  lapses: number
  learning_step: number
}

export type AnswerResult = {
  repetitions: number
  interval_days: number
  ease_factor: number
  learning_step: number
  graduated: boolean
  nextReview: Date | null
}

/**
 * Anki-style SM-2 with learning steps.
 *
 * Learning phase (interval_days === 0):
 *   again → reset to step 1, review in 5 min
 *   hard  → stay at current step, review in 5 min
 *   good  → advance step; graduate at step 3 (interval=1 day)
 *   easy  → bypass steps, graduate immediately (interval=4 days)
 *
 * Review phase (interval_days > 0):
 *   again → lapse: drop to learning (step 1), interval=0, lapses++, ease-0.20
 *   hard  → interval = max(1, round(old × 1.2)), ease-0.15
 *   good  → interval = round(old × ease)
 *   easy  → interval = round(old × ease × 1.3), ease+0.15
 */
export function computeAnswerResult(
  current: ProgressState,
  answer: Answer
): AnswerResult {
  const now = new Date()
  let newReps = current.repetitions
  let newInterval = current.interval_days
  let newEase = current.ease_factor
  let newLearningStep = current.learning_step
  let graduated = false
  let nextReview: Date | null = null

  const addMinutes = (m: number) => {
    const d = new Date(now)
    d.setMinutes(d.getMinutes() + m)
    return d
  }

  const addDays = (d: number) => {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() + d)
    return date
  }

  if (current.interval_days > 0) {
    // ── Review phase ──
    if (answer === 'again') {
      // Lapse: drop back into learning loop
      newInterval = 0
      newReps = 0
      newLearningStep = 1
      newEase = Math.max(1.3, current.ease_factor - 0.20)
      nextReview = addMinutes(5)
    } else {
      graduated = true
      newReps = current.repetitions + 1
      newLearningStep = 0

      if (answer === 'hard') {
        newEase = Math.max(1.3, current.ease_factor - 0.15)
        newInterval = Math.max(1, Math.round(current.interval_days * 1.2))
      } else if (answer === 'good') {
        newInterval = Math.max(1, Math.round(current.interval_days * current.ease_factor))
      } else if (answer === 'easy') {
        newEase = current.ease_factor + 0.15
        newInterval = Math.max(1, Math.round(current.interval_days * current.ease_factor * 1.3))
      }
      nextReview = addDays(newInterval)
    }
  } else {
    // ── Learning phase ──
    if (answer === 'again') {
      newLearningStep = 1
      newReps = Math.max(0, current.repetitions - 1)
      newEase = Math.max(1.3, current.ease_factor - 0.20)
      nextReview = addMinutes(5)
    } else if (answer === 'hard') {
      // Stay in current learning step, retry in 5 min
      newReps = current.repetitions + 1
      newEase = Math.max(1.3, current.ease_factor - 0.15)
      nextReview = addMinutes(5)
    } else if (answer === 'good') {
      const nextStep = current.learning_step + 1
      if (nextStep >= 3) {
        // Graduate after step 3
        graduated = true
        newInterval = 1
        newReps = 1
        newLearningStep = 0
        nextReview = addDays(1)
      } else {
        newLearningStep = nextStep
        newReps = current.repetitions + 1
        nextReview = addMinutes(5)
      }
    } else if (answer === 'easy') {
      // Bypass learning steps entirely
      graduated = true
      newInterval = 4
      newReps = 1
      newLearningStep = 0
      newEase = current.ease_factor + 0.15
      nextReview = addDays(4)
    }
  }

  return {
    repetitions: newReps,
    interval_days: newInterval,
    ease_factor: newEase,
    learning_step: newLearningStep,
    graduated,
    nextReview,
  }
}
