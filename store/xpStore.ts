// store/xpStore.ts

import { create } from 'zustand'
import { fetchUserStats, awardWordComplete, awardThemeBonus, type UserStats } from '@/app/actions/xp'
import { getLevelFromXp, getRankTitle } from '@/app/lib/xp'

type XpStore = {
  stats: UserStats | null
  loading: boolean
  initialized: boolean

  // Animated display values (smoothly interpolated)
  displayTotalXp: number
  displayLevel: number
  displayProgress: number

  leveledUp: boolean

  init: () => Promise<void>
  refresh: () => Promise<void>
  addXp: (amount: number) => void
  animateTo: (targetStats: UserStats) => void
  dismissLevelUp: () => void

  // Server-side awarding
  awardWord: (vocabId: number) => Promise<void>
  awardTheme: (themeId: number) => Promise<void>
}

let animationFrame: number | null = null

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export const useXpStore = create<XpStore>((set, get) => ({
  stats: null,
  loading: false,
  initialized: false,
  displayTotalXp: 0,
  displayLevel: 1,
  displayProgress: 0,
  leveledUp: false,

  init: async () => {
    if (get().initialized) return
    set({ loading: true })
    try {
      const stats = await fetchUserStats()
      if (stats) {
        set({
          stats,
          displayTotalXp: stats.totalXp,
          displayLevel: stats.currentLevel,
          displayProgress: stats.levelProgress,
          initialized: true,
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  refresh: async () => {
    const stats = await fetchUserStats()
    if (stats) {
      set({ stats })
      get().animateTo(stats)
    }
  },

  addXp: (amount: number) => {
    const { stats, displayTotalXp, displayLevel } = get()
    if (!stats) return

    const newTotal = stats.totalXp + amount
    const newLevel = getLevelFromXp(newTotal)
    const currentLevelBase = getXpForLevel(newLevel)
    const nextLevelBase = getXpForLevel(newLevel + 1)
    const denom = nextLevelBase - currentLevelBase
    const newProgress = denom <= 0 ? 1 : Math.min(1, Math.max(0, (newTotal - currentLevelBase) / denom))

    const didLevelUp = newLevel > stats.currentLevel

    set({
      stats: {
        ...stats,
        totalXp: newTotal,
        currentLevel: newLevel,
        rankTitle: getRankTitle(newLevel),
        levelProgress: newProgress,
      },
      leveledUp: didLevelUp || get().leveledUp,
    })

    // Animate display values
    const startXp = displayTotalXp
    const startLevel = displayLevel
    const startTime = performance.now()
    const duration = 900

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)

      const currentDisplayXp = Math.round(lerp(startXp, newTotal, eased))
      const currentDisplayLevel = getLevelFromXp(currentDisplayXp)
      const currentProgress = getLevelProgress(currentDisplayXp)

      set({
        displayTotalXp: currentDisplayXp,
        displayLevel: currentDisplayLevel,
        displayProgress: currentProgress,
      })

      if (t < 1) {
        animationFrame = requestAnimationFrame(tick)
      }
    }

    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = requestAnimationFrame(tick)
  },

  animateTo: (targetStats: UserStats) => {
    const { displayTotalXp } = get()
    const startXp = displayTotalXp
    const startTime = performance.now()
    const duration = 700

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)

      const currentDisplayXp = Math.round(lerp(startXp, targetStats.totalXp, eased))
      const currentDisplayLevel = getLevelFromXp(currentDisplayXp)
      const currentProgress = getLevelProgress(currentDisplayXp)

      set({
        displayTotalXp: currentDisplayXp,
        displayLevel: currentDisplayLevel,
        displayProgress: currentProgress,
      })

      if (t < 1) {
        animationFrame = requestAnimationFrame(tick)
      }
    }

    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = requestAnimationFrame(tick)
  },

  dismissLevelUp: () => set({ leveledUp: false }),

  awardWord: async (vocabId: number) => {
    const prevStats = get().stats
    get().addXp(10)
    const newStats = await awardWordComplete(vocabId)
    if (newStats && prevStats) {
      if (newStats.totalXp !== prevStats.totalXp + 10) {
        set({ stats: newStats })
        get().animateTo(newStats)
      }
    }
  },

  awardTheme: async (themeId: number) => {
    const prevStats = get().stats
    get().addXp(50)
    const newStats = await awardThemeBonus(themeId)
    if (!newStats) {
      // Theme bonus already awarded — revert optimistic update
      set({ stats: prevStats })
      get().animateTo(prevStats!)
      return
    }
    if (prevStats && newStats.totalXp !== prevStats.totalXp + 50) {
      set({ stats: newStats })
      get().animateTo(newStats)
    }
  },
}))

function getXpForLevel(level: number): number {
  return 50 * (level - 1) * (level - 1)
}

function getLevelProgress(totalXp: number): number {
  const level = getLevelFromXp(totalXp)
  const currentLevelBase = getXpForLevel(level)
  const nextLevelBase = getXpForLevel(level + 1)
  const denom = nextLevelBase - currentLevelBase
  if (denom <= 0) return 1
  return Math.min(1, Math.max(0, (totalXp - currentLevelBase) / denom))
}