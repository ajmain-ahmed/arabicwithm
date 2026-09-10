import { describe, it, expect } from "vitest"
import {
  EXPLORE_PAGE_SIZE,
  buildExploreFeedItems,
  definitionCacheKey,
  getExploreSeed,
  nextExploreIndex,
  parseExploreSoundPreference,
  seededShuffled,
  sliceExploreFeedBatch,
  type ExploreFeedItem,
} from "./explore"
import type { ExploreEpisode } from "./cartoons"
import type { ExploreBookPage } from "@/app/actions/books"

describe("Explore behavior helpers", () => {
  it("defaults sound on and preserves an explicit mute", () => {
    expect(parseExploreSoundPreference(null)).toBe(true)
    expect(parseExploreSoundPreference("sound")).toBe(true)
    expect(parseExploreSoundPreference("muted")).toBe(false)
  })

  it("advances to the next item and wraps once", () => {
    expect(nextExploreIndex(0, 3)).toBe(1)
    expect(nextExploreIndex(2, 3)).toBe(0)
    expect(nextExploreIndex(0, 1)).toBeNull()
  })

  it("keeps definition cache entries separate by context and entry type", () => {
    const word = { arabic: "عَلَم", headword: "علم", entry_type: "word" as const }
    expect(definitionCacheKey("episode:a:line:1", word)).toBe("episode:a:line:1|word|علم")
    expect(definitionCacheKey("episode:b:line:1", word)).not.toBe(definitionCacheKey("episode:a:line:1", word))
    expect(definitionCacheKey("episode:a:line:1", { ...word, entry_type: "phrase" })).not.toBe(definitionCacheKey("episode:a:line:1", word))
  })
})

function makeEpisode(id: string): ExploreEpisode {
  return {
    id,
    slug: id,
    title: `Episode ${id}`,
    level: "A2",
    tags: [],
    showSlug: "show",
    showTitle: "Show",
    transcriptLines: [],
  }
}

function makeBookPage(id: string): ExploreBookPage {
  return { id } as unknown as ExploreBookPage
}

function videoIds(items: ExploreFeedItem[]): string[] {
  return items.flatMap((item) => (item.kind === "video" ? [item.episode.id] : []))
}

describe("seededShuffled", () => {
  it("is deterministic for a given seed", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g", "h"]
    expect(seededShuffled(input, "2026-09-10")).toEqual(seededShuffled(input, "2026-09-10"))
  })

  it("does not mutate the input", () => {
    const input = ["a", "b", "c"]
    seededShuffled(input, "seed")
    expect(input).toEqual(["a", "b", "c"])
  })

  it("preserves all items", () => {
    const input = ["a", "b", "c", "d", "e"]
    expect([...seededShuffled(input, "seed")].sort()).toEqual(input)
  })
})

describe("buildExploreFeedItems", () => {
  const episodes = ["e1", "e2", "e3", "e4", "e5", "e6"].map(makeEpisode)
  const bookPages = ["b1", "b2"].map(makeBookPage)

  it("is deterministic for a given seed", () => {
    expect(buildExploreFeedItems(episodes, bookPages, "2026-09-10"))
      .toEqual(buildExploreFeedItems(episodes, bookPages, "2026-09-10"))
  })

  it("interleaves a book page after every third video", () => {
    const items = buildExploreFeedItems(episodes, bookPages, "seed")
    const kinds = items.map((item) => item.kind)
    expect(kinds.filter((kind) => kind === "book")).toHaveLength(2)
    expect(kinds[3]).toBe("book")
    expect(kinds[7]).toBe("book")
  })

  it("includes every episode exactly once", () => {
    const items = buildExploreFeedItems(episodes, bookPages, "seed")
    expect([...videoIds(items)].sort()).toEqual(["e1", "e2", "e3", "e4", "e5", "e6"])
  })

  it("falls back to book pages only when there are no videos", () => {
    const items = buildExploreFeedItems([], bookPages, "seed")
    expect(items.every((item) => item.kind === "book")).toBe(true)
    expect(items).toHaveLength(2)
  })

  it("omits book pages when there are none", () => {
    const items = buildExploreFeedItems(episodes, [], "seed")
    expect(items.every((item) => item.kind === "video")).toBe(true)
  })
})

describe("sliceExploreFeedBatch", () => {
  const episodes = Array.from({ length: EXPLORE_PAGE_SIZE * 2 + 3 }, (_, index) =>
    makeEpisode(`e${index}`),
  )

  it("serves the requested page", () => {
    const all = buildExploreFeedItems(episodes, [], "seed")
    const first = sliceExploreFeedBatch(all, 0)
    const second = sliceExploreFeedBatch(all, 1)
    expect(first.items).toHaveLength(EXPLORE_PAGE_SIZE)
    expect(second.items).toHaveLength(EXPLORE_PAGE_SIZE)
    expect(first.items[0]).toEqual(all[0])
    expect(second.items[0]).toEqual(all[EXPLORE_PAGE_SIZE])
  })

  it("reports hasMore until the catalogue is exhausted", () => {
    const all = buildExploreFeedItems(episodes, [], "seed")
    expect(sliceExploreFeedBatch(all, 0).hasMore).toBe(true)
    expect(sliceExploreFeedBatch(all, 1).hasMore).toBe(true)
    const last = sliceExploreFeedBatch(all, 2)
    expect(last.items).toHaveLength(3)
    expect(last.hasMore).toBe(false)
  })

  it("clamps invalid pages to zero", () => {
    const all = buildExploreFeedItems(episodes, [], "seed")
    expect(sliceExploreFeedBatch(all, -1).items[0]).toEqual(all[0])
  })
})

describe("getExploreSeed", () => {
  it("returns a date string", () => {
    expect(getExploreSeed(new Date("2026-09-10T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
