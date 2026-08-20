import { describe, it, expect } from "vitest"
import { suggestNextEpisodeSlug } from "./slug"
import { type EpisodeRow } from "@/app/actions/admin"

function makeEpisode(slug: string): EpisodeRow {
  return {
    id: "1",
    show_id: "show-1",
    slug,
    title: "Episode",
    level: "A2",
    tags: [],
    description: null,
    youtube_id: null,
    instagram_id: null,
    tiktok_id: null,
    facebook_id: null,
    cover: null,
    created_at: null,
  }
}

describe("suggestNextEpisodeSlug", () => {
  it("suggests the first slug when no episodes exist", () => {
    expect(suggestNextEpisodeSlug("sb", [])).toBe("sb-1")
  })

  it("increments the highest numeric suffix", () => {
    const episodes = [makeEpisode("sb-1"), makeEpisode("sb-2"), makeEpisode("sb-3")]
    expect(suggestNextEpisodeSlug("sb", episodes)).toBe("sb-4")
  })

  it("ignores non-numeric suffixes and falls back to show slug", () => {
    const episodes = [makeEpisode("sb-pilot"), makeEpisode("sb-intro")]
    expect(suggestNextEpisodeSlug("sb", episodes)).toBe("sb-1")
  })

  it("uses the common prefix from existing numeric slugs", () => {
    const episodes = [makeEpisode("spongebob-5")]
    expect(suggestNextEpisodeSlug("spongebob", episodes)).toBe("spongebob-6")
  })

  it("handles gaps in numbering by taking the maximum", () => {
    const episodes = [makeEpisode("tmnt-1"), makeEpisode("tmnt-10"), makeEpisode("tmnt-3")]
    expect(suggestNextEpisodeSlug("tmnt", episodes)).toBe("tmnt-11")
  })
})
