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
    if (answer === 'again') {
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
      const d = new Date(now)
      d.setDate(d.getDate() + newInterval)
      nextReview = d
      newReps = current.repetitions + 1
    }
  } else {
    // ── Learning phase ──
    if (answer === 'again') {
      newStep = 0
      newInterval = 0
      newEase = Math.max(1.3, current.ease_factor - 0.20)
      newReps = Math.max(0, current.repetitions - 1)
    } else {
      newStep = current.learning_step + 1
      if (answer === 'hard') {
        newEase = Math.max(1.3, current.ease_factor - 0.15)
      } else if (answer === 'easy') {
        newEase = current.ease_factor + 0.15
      }
      if (newStep >= 3) {
        graduated = true
        newStep = 0
        newInterval = answer === 'easy' ? 3 : 1
        const d = new Date(now)
        d.setDate(d.getDate() + newInterval)
        nextReview = d
        newReps = current.repetitions + 1
      } else {
        newInterval = 0
        newReps = current.repetitions + 1
      }
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
