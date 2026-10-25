export interface WordSearchCompletionStats {
  wordCount: number
  wordsFound: number
  mistakes: number
  hintsUsed: number
  revealsUsed: number
  durationSeconds: number
}

export function calculateWordSearchAccuracy(wordsFound: number, mistakes: number): number {
  const correct = Math.max(0, Math.floor(wordsFound))
  const incorrect = Math.max(0, Math.floor(mistakes))
  if (correct === 0) return 0
  return Math.round((correct / (correct + incorrect)) * 100)
}

export function formatWordSearchDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes === 0) return `${remainder} sec`
  return `${minutes} min ${remainder} sec`
}

export function shouldCompleteWordSearch(foundCount: number, targetCount: number, alreadySubmitted: boolean): boolean {
  return !alreadySubmitted && targetCount > 0 && foundCount === targetCount
}
