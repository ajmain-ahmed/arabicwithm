import { describe, expect, it } from 'vitest'
import { emptyLearningActivity } from './activity'
import { summarizeLearningDashboard } from './learningDashboard'
import { hideReadingListEntry } from './readingList'
const now = new Date('2026-10-02T12:00:00Z')
describe('consistent learning summaries', () => {
  it('reports weekly Memory and Word Search activity as counts', () => {
    const activity = { ...emptyLearningActivity(), memory: { total: 4, weekCards: 3 }, wordSearch: { total: 2, weekCompleted: 1 } }
    const summary = summarizeLearningDashboard(activity, now)
    expect(summary.memory.value).toBe('3 cards'); expect(summary.memory.description).toBe('3 Memory cards reviewed this week.')
    expect(summary.wordSearch.value).toBe('1 puzzle'); expect(summary.wordSearch.description).toBe('1 Word Search completed this week.')
  })
  it('gives a new account zeroed summaries', () => {
    const summary = summarizeLearningDashboard(emptyLearningActivity(), now)
    expect(summary).toMatchObject({ streak: 0, memory: { value: '0 cards' }, wordSearch: { value: '0 puzzles' } })
  })
  it('tracks the current streak from recorded active dates', () => {
    const today = summarizeLearningDashboard({ ...emptyLearningActivity(), activeDates: ['2026-10-01', '2026-10-02'] }, now)
    expect(today.streak).toBe(2)
    const lapsed = summarizeLearningDashboard({ ...emptyLearningActivity(), activeDates: ['2026-09-20', '2026-09-21', '2026-09-22'] }, now)
    expect(lapsed.streak).toBe(0)
  })
  it('hides a book without deleting its position, history or other books', () => {
    const progress = { first: { chapterSlug: 'chapter-2', updatedAt: '2026-10-01', extraHistory: [1] }, second: { chapterSlug: 'chapter-1' } }
    expect(hideReadingListEntry(progress, 'first')).toEqual({ ...progress, first: { ...progress.first, hiddenFromList: true } })
    expect(progress.first).not.toHaveProperty('hiddenFromList')
  })
})
