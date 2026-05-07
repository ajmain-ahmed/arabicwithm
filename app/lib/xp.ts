// app/lib/xp.ts

/* ── Pure XP / Level math (shared between server & client) ─────────── */

export function getLevelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 50)) + 1
}

export function getXpForLevel(level: number): number {
  // XP needed to reach this level (level 1 = 0)
  return 50 * (level - 1) * (level - 1)
}

export function getLevelProgress(totalXp: number): number {
  const level = getLevelFromXp(totalXp)
  const currentLevelBase = getXpForLevel(level)
  const nextLevelBase = getXpForLevel(level + 1)
  const denom = nextLevelBase - currentLevelBase
  if (denom <= 0) return 1
  return Math.min(1, Math.max(0, (totalXp - currentLevelBase) / denom))
}

export function getRankTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Novice',
    2: 'Apprentice',
    3: 'Scholar',
    4: 'Adept',
    5: 'Expert',
    6: 'Master',
    7: 'Sage',
    8: 'Legend',
    9: 'Mythic',
  }
  return titles[level] ?? 'Immortal'
}
