// app/lib/slug.ts — slug helpers for admin workflows.

import { type EpisodeRow } from "@/app/actions/admin"

export function suggestNextEpisodeSlug(showSlug: string, episodes: EpisodeRow[]): string {
  let maxNum = 0
  let prefix = showSlug
  let foundNumeric = false
  for (const ep of episodes) {
    const match = ep.slug.match(/^(.+)-(\d+)$/)
    if (match) {
      const num = Number(match[2])
      if (num >= maxNum) {
        maxNum = num
        prefix = match[1]
        foundNumeric = true
      }
    }
  }
  if (foundNumeric) {
    return `${prefix}-${maxNum + 1}`
  }
  return `${showSlug}-1`
}
