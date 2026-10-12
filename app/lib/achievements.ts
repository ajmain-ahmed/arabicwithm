import type { LearningActivity } from '@/app/lib/activity'
import { summarizeLearningDashboard } from '@/app/lib/learningDashboard'

export type AchievementCategory = 'levels' | 'xp' | 'time' | 'words' | 'memory' | 'reading' | 'watching' | 'streaks' | 'puzzles' | 'breadth'
export interface AchievementFamily { id: AchievementCategory; name: string; metric: string; unit: string; thresholds: number[]; step?: number }
export const ACHIEVEMENT_FAMILIES: AchievementFamily[] = [
  { id: 'levels', name: 'Level Milestones', metric: 'level', unit: 'levels', thresholds: [], step: 10 },
  { id: 'xp', name: 'XP Collector', metric: 'xp', unit: 'total XP', thresholds: [100, 500, 1000, 2500, 5000, 10000] },
  { id: 'time', name: 'Dedicated Learner', metric: 'time', unit: 'hours learning', thresholds: [5, 10, 25, 50, 100, 250] },
  { id: 'words', name: 'Word Explorer', metric: 'words', unit: 'word inspections', thresholds: [50, 100, 250, 500, 1000, 2500] },
  { id: 'memory', name: 'Memory Practice', metric: 'memory', unit: 'cards reviewed', thresholds: [1, 50, 100, 250, 500, 1000] },
  { id: 'reading', name: 'Reading Journey', metric: 'reading', unit: 'hours reading', thresholds: [1, 5, 10, 25, 50, 100] },
  { id: 'watching', name: 'Watch & Learn', metric: 'watching', unit: 'hours watching', thresholds: [1, 5, 10, 25, 50, 100] },
  { id: 'streaks', name: 'Steady Learner', metric: 'streak', unit: 'consecutive active days', thresholds: [3, 7, 14, 30, 60, 100, 365] },
  { id: 'puzzles', name: 'Word Search Solver', metric: 'puzzles', unit: 'puzzles completed', thresholds: [1, 10, 25, 50, 100, 250] },
  { id: 'breadth', name: 'Curious Learner', metric: 'breadth', unit: 'learning areas explored', thresholds: [2, 3, 4] },
]
export type AchievementMetrics = Record<string, number>
export interface Achievement { id: string; name: string; category: AchievementCategory; threshold: number; progress: number; earned: boolean; requirement: string; tier: number }
export function achievementMetrics(activity: LearningActivity, now = new Date()): AchievementMetrics {
  const summary = summarizeLearningDashboard(activity, now)
  const reading = activity.lifetime?.readingSeconds ?? 0, watching = activity.lifetime?.videoSeconds ?? 0
  const memory = activity.memory?.total ?? 0, puzzles = activity.wordSearch?.total ?? 0
  return { level: summary.level.level, xp: summary.xp, time: activity.totalSeconds / 3600, words: activity.lifetime?.wordLookups ?? 0,
    memory, reading: reading / 3600, watching: watching / 3600, streak: summary.longestStreak, puzzles,
    breadth: [reading >= 60, watching >= 60, memory >= 1, puzzles >= 1].filter(Boolean).length }
}
export function achievementThreshold(family: AchievementFamily, tier: number): number {
  if (family.step) return (tier + 1) * family.step
  if (tier < family.thresholds.length) return family.thresholds[tier]
  if (family.id === 'breadth') return Infinity
  return family.thresholds.at(-1)! * 2 ** (tier - family.thresholds.length + 1)
}
export function earnedAchievementCount(family: AchievementFamily, metrics: AchievementMetrics): number {
  const value = metrics[family.metric] ?? 0
  if (family.step) return Math.floor(value / family.step)
  let count = 0
  while (achievementThreshold(family, count) <= value && Number.isFinite(achievementThreshold(family, count))) count++
  return count
}
export function achievementPage(metrics: AchievementMetrics, category?: AchievementCategory, page = 0, size = 8) {
  const families = category ? ACHIEVEMENT_FAMILIES.filter(f => f.id === category) : ACHIEVEMENT_FAMILIES
  const earnedTotal = ACHIEVEMENT_FAMILIES.reduce((sum, f) => sum + earnedAchievementCount(f, metrics), 0)
  const items: Achievement[] = []
  for (const family of families) {
    const earned = earnedAchievementCount(family, metrics)
    const start = category ? page * size : Math.max(0, earned - 1)
    const end = category ? Math.min(start + size, earned + 2) : earned + 1
    for (let tier = start; tier < end; tier++) {
      const threshold = achievementThreshold(family, tier)
      if (!Number.isFinite(threshold)) break
      const value = metrics[family.metric] ?? 0
      items.push({ id: `${family.id}-${threshold}`, name: family.id === 'levels' ? `Level ${threshold}` : `${family.name} ${tier + 1}`,
        category: family.id, threshold, progress: Math.min(value, threshold), earned: value >= threshold,
        requirement: `Reach ${threshold.toLocaleString('en-GB')} ${family.unit}.`, tier: tier + 1 })
    }
  }
  const family = families[0]
  const available = category ? Math.min(earnedAchievementCount(family, metrics) + 2, family.id === 'breadth' ? family.thresholds.length : Infinity) : items.length
  return { items, earnedTotal, hasNext: Boolean(category && (page + 1) * size < available) }
}

/** Saved display preferences cannot manufacture an earned trophy. */
export function achievementPreview(metrics: AchievementMetrics, preferred?: string[]): Achievement[] {
  const chosen: Achievement[] = []
  for (const id of [...new Set(preferred ?? [])].slice(0, 4)) {
    const family = ACHIEVEMENT_FAMILIES.find(f => id.startsWith(`${f.id}-`))
    if (!family) continue
    const threshold = Number(id.slice(family.id.length + 1))
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > (metrics[family.metric] ?? 0)) continue
    let tier = family.step ? threshold / family.step - 1 : 0
    if (!family.step) while (achievementThreshold(family, tier) < threshold) tier++
    if (!Number.isInteger(tier) || achievementThreshold(family, tier) !== threshold) continue
    const item = achievementPage(metrics, family.id, Math.floor(tier / 8)).items.find(item => item.id === id && item.earned)
    if (item) chosen.push(item)
  }
  if (preferred !== undefined) return chosen
  const highlights = achievementPage(metrics).items
  const earned = highlights.filter(item => item.earned).sort((a, b) => b.tier - a.tier)
  return (earned.length ? earned : highlights.filter(item => !item.earned)).slice(0, 4)
}
