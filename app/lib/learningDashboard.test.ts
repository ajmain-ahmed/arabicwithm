import { describe, expect, it } from 'vitest'
import { emptyLearningActivity, minutesRequiredForLevel } from './activity'
import { longestLearningStreak, summarizeLearningDashboard } from './learningDashboard'
import { ACHIEVEMENT_FAMILIES, achievementMetrics, achievementPage, earnedAchievementCount } from './achievements'
import { learningChartDays } from './learningChart'
import { hideReadingListEntry } from './readingList'
const now = new Date('2026-10-02T12:00:00Z')
describe('consistent learning summaries and achievements', () => {
  it('keeps lifetime XP out of weekly Memory and puzzle headlines', () => {
    const activity = { ...emptyLearningActivity(), xp: { totalXp: 18, weekXp: 0 }, memory: { total: 4, totalXp: 18, weekCards: 0, weekXp: 0 }, wordSearch: { total: 2, totalXp: 40, weekCompleted: 0, weekXp: 0 } }
    const summary = summarizeLearningDashboard(activity, now)
    expect(summary.xp).toBe(18); expect(summary.weekXp).toBe(0)
    expect(summary.memory.value).toBe('0 XP'); expect(summary.memory.description).toContain('0 Memory cards this week')
    expect(summary.memory.totalDescription).toContain('18 total Memory XP')
    expect(summary.wordSearch.value).toBe('0 XP')
  })
  it('gives a new account real empty charts and no earned trophies', () => {
    const activity = emptyLearningActivity()
    expect(achievementPage(achievementMetrics(activity, now)).earnedTotal).toBe(0)
    expect(summarizeLearningDashboard(activity, now)).toMatchObject({ streak: 0, longestStreak: 0, xp: 0 })
    expect(learningChartDays(activity, 7, now)).toHaveLength(7)
    expect(learningChartDays(activity, 7, now).every(d => d.seconds === 0 && d.xp === 0)).toBe(true)
  })
  it('unlocks every ten levels and continues beyond a fixed catalogue', () => {
    for (const level of [10, 20, 30, 1000]) {
      const activity = { ...emptyLearningActivity(), totalSeconds: minutesRequiredForLevel(level) * 60 }
      const metrics = achievementMetrics(activity, now)
      const family = ACHIEVEMENT_FAMILIES.find(f => f.id === 'levels')!
      expect(earnedAchievementCount(family, metrics)).toBe(level / 10)
      const highlights = achievementPage(metrics).items.filter(a => a.category === 'levels')
      expect(highlights[0]).toMatchObject({ name: `Level ${level}`, earned: true })
      expect(highlights[1]).toMatchObject({ name: `Level ${level + 10}`, earned: false })
    }
    expect(earnedAchievementCount(ACHIEVEMENT_FAMILIES[0], { level: 9 })).toBe(0)
  })
  it('uses exact threshold boundaries for every achievement family', () => {
    for (const family of ACHIEVEMENT_FAMILIES) {
      const threshold = family.step ?? family.thresholds[0]
      expect(earnedAchievementCount(family, { [family.metric]: threshold - 0.001 })).toBe(0)
      expect(earnedAchievementCount(family, { [family.metric]: threshold })).toBe(1)
    }
  })
  it('preserves earned streak achievements after the current streak ends', () => {
    const activity = { ...emptyLearningActivity(), activeDates: ['2026-09-20','2026-09-21','2026-09-22'] }
    const summary = summarizeLearningDashboard(activity, now)
    expect(summary.streak).toBe(0); expect(summary.longestStreak).toBe(3)
    expect(achievementPage(achievementMetrics(activity, now), 'streaks').items[0].earned).toBe(true)
    expect(longestLearningStreak(['2026-09-20','2026-09-20','2026-09-21'])).toBe(2)
  })
  it('requires measured activity for exploration and never infers completed books', () => {
    const activity = { ...emptyLearningActivity(), lifetime: { readingSeconds: 60, videoSeconds: 60, wordLookups: 100 }, memory: { total: 1, totalXp: 1, weekCards: 1, weekXp: 1 }, wordSearch: { total: 1, totalXp: 30, weekCompleted: 1, weekXp: 30 } }
    expect(achievementMetrics(activity, now).breadth).toBe(4)
    expect(ACHIEVEMENT_FAMILIES.some(f => /completed books|mastered/i.test(f.unit))).toBe(false)
  })
  it('charts London dates and preserves dated XP separately from lifetime XP', () => {
    const activity = { ...emptyLearningActivity(), xp: { totalXp: 18, weekXp: 4 }, daily: [{ date: '2026-10-02', activeSeconds: 120, readingSeconds: 120, videoSeconds: 0, wordLookups: 1, xp: 4 }] }
    const chart = learningChartDays(activity, 7, new Date('2026-10-01T23:30:00Z'))
    expect(chart.at(-1)).toEqual({ date: '2026-10-02', seconds: 120, xp: 4 })
  })
  it('hides a book without deleting its position, history or other books', () => {
    const progress = { first: { chapterSlug: 'chapter-2', updatedAt: '2026-10-01', extraHistory: [1] }, second: { chapterSlug: 'chapter-1' } }
    expect(hideReadingListEntry(progress, 'first')).toEqual({ ...progress, first: { ...progress.first, hiddenFromList: true } })
    expect(progress.first).not.toHaveProperty('hiddenFromList')
  })
})
