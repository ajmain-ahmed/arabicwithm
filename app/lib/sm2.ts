import type { Answer } from '@/app/actions/revision'

export type ProgressState = {
  repetitions: number
  interval_days: number
  ease_factor: number
  learning_step: number
  lapses: number
}

export type AnswerResult = {
  repetitions: number
  interval_days: number
  ease_factor: number
  learning_step: number
  graduated: boolean
  nextReview: Date | null
}

export function computeAnswerResult(
  current: ProgressState,
  answer: Answer
): AnswerResult {
  const now = new Date()
  let newReps = current.repetitions
  let newInterval = current.interval_days
  let newEase = current.ease_factor
  let newStep = current.learning_step
  let graduated = false
  let nextReview: Date | null = null

  if (current.interval_days > 0) {
    // ── Review phase ──
    // Card is already graduated and in the spaced-repetition schedule.
    if (answer === 'again') {
      // Lapse: send back to learning queue
      newStep = 0
      newInterval = 0
      newEase = Math.max(1.3, current.ease_factor - 0.20)
      newReps = Math.max(0, current.repetitions - 1)
    } else {
      graduated = true
      newStep = 0
      if (answer === 'hard') {
        newEase = Math.max(1.3, current.ease_factor - 0.15)
        newInterval = Math.max(1, Math.round(current.interval_days * 1.2))
      } else if (answer === 'good') {
        newInterval = Math.round(current.interval_days * current.ease_factor)
      } else if (answer === 'easy') {
        newEase = current.ease_factor + 0.15
        newInterval = Math.round(current.interval_days * current.ease_factor * 1.3)
      }
      // Due at midnight UTC, newInterval days from now
      const dueDate = new Date(now)
      dueDate.setUTCHours(0, 0, 0, 0)
      dueDate.setUTCDate(dueDate.getUTCDate() + newInterval)
      nextReview = dueDate
      newReps = current.repetitions + 1
    }
  } else {
    // ── Learning phase (interval_days === 0) ──
    // New cards (never seen) and lapsed/hard cards both live here.
    //
    // Rules:
    //   Again → reset to step 0, stays in learning
    //   Hard  → stays in learning (step advances so it won't reset streak, but interval stays 0)
    //   Good  → graduates immediately, due tomorrow (interval = 1)
    //   Easy  → graduates immediately, due tomorrow (interval = 1), ease bonus

    if (answer === 'again') {
      newStep = 0
      newInterval = 0
      newEase = Math.max(1.3, current.ease_factor - 0.20)
      newReps = Math.max(0, current.repetitions - 1)
    } else if (answer === 'hard') {
      // Stays in learning — advance step but keep interval at 0
      newStep = current.learning_step + 1
      newEase = Math.max(1.3, current.ease_factor - 0.15)
      newInterval = 0
      newReps = current.repetitions + 1
    } else {
      // good or easy → graduate, due tomorrow
      graduated = true
      newStep = 0
      newInterval = 1 // always 1 day: appears in tomorrow's review queue
      newEase = answer === 'easy'
        ? current.ease_factor + 0.15
        : current.ease_factor

      const dueDate = new Date(now)
      dueDate.setUTCHours(0, 0, 0, 0)
      dueDate.setUTCDate(dueDate.getUTCDate() + 1)
      nextReview = dueDate
      newReps = current.repetitions + 1
    }
  }

  return {
    repetitions: newReps,
    interval_days: newInterval,
    ease_factor: newEase,
    learning_step: newStep,
    graduated,
    nextReview,
  }
}