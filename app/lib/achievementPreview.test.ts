import { expect, it } from 'vitest'
import { achievementPreview } from './achievements'
it('shows up to four measured highlights without invented earned dates', () => {
  const items = achievementPreview({ level: 20, xp: 1000, time: 10, words: 100, memory: 50 })
  expect(items).toHaveLength(4); expect(items.every(item => item.earned)).toBe(true)
})
it('restores an older selected level milestone even for advanced learners', () => {
  expect(achievementPreview({ level: 1000 }, ['levels-10']).map(item => item.id)).toEqual(['levels-10'])
})
it('ignores forged, duplicate and unearned selections', () => {
  expect(achievementPreview({ level: 20 }, ['levels-15', 'levels-100', 'bad-1', 'levels-10', 'levels-10']).map(item => item.id)).toEqual(['levels-10'])
})
it('gives new learners four honest upcoming milestones', () => {
  const items = achievementPreview({ level: 1 })
  expect(items).toHaveLength(4); expect(items.some(item => item.earned)).toBe(false)
})

it('preserves an intentionally empty cabinet instead of restoring automatic highlights',()=>{expect(achievementPreview({level:100,xp:10000},[])).toEqual([])})
