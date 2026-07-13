import { describe, it, expect } from "vitest"
import { validateConjugationRows, buildConjugationsPrompt, type VerbCandidate } from "./conjugations"

describe("validateConjugationRows", () => {
  it("accepts a valid conjugation array", () => {
    const rows = [
      {
        lemma: "كَتَبَ",
        root: "ك-ت-ب",
        form_number: "I",
        type: "past",
        conjugation_ar: "كتب",
        conjugation_diacritic: "كَتَبَ",
        transliteration: "kataba",
        english_translation: "he wrote",
      },
      {
        lemma: "كَتَبَ",
        root: "ك-ت-ب",
        form_number: "I",
        type: "present",
        conjugation_ar: "يكتب",
        conjugation_diacritic: "يَكْتُبُ",
        transliteration: "yaktubu",
        english_translation: "he writes",
      },
    ]

    const result = validateConjugationRows(rows)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].type).toBe("past")
    expect(result.rows[1].conjugation_diacritic).toBe("يَكْتُبُ")
  })

  it("normalizes optional fields to null when blank", () => {
    const rows = [
      {
        lemma: "كَتَبَ",
        root: null,
        form_number: "",
        type: "verbal_noun",
        conjugation_ar: "كتابة",
        conjugation_diacritic: "كِتَابَة",
        transliteration: "kitāba",
        english_translation: "writing",
      },
    ]

    const result = validateConjugationRows(rows)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0].root).toBeNull()
    expect(result.rows[0].form_number).toBeNull()
  })

  it("rejects non-array input", () => {
    const result = validateConjugationRows({ rows: [] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("array")
  })

  it("rejects rows with missing required fields", () => {
    const rows = [
      {
        lemma: "",
        root: "ك-ت-ب",
        type: "past",
        conjugation_ar: "كتب",
        conjugation_diacritic: "كَتَبَ",
      },
      {
        lemma: "كَتَبَ",
        root: "ك-ت-ب",
        type: "unknown",
        conjugation_ar: "كتب",
        conjugation_diacritic: "كَتَبَ",
      },
    ]

    const result = validateConjugationRows(rows)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("lemma")
    expect(result.error.toLowerCase()).toContain("type")
  })
})

describe("buildConjugationsPrompt", () => {
  it("includes all candidates and the source in the prompt", () => {
    const candidates: VerbCandidate[] = [
      { lemma: "كَتَبَ", lemma_diacritic: "كَتَبَ", root: "ك-ت-ب" },
      { lemma: "ذَهَبَ", lemma_diacritic: "ذَهَبَ", root: "ذ-ه-ب" },
    ]

    const result = buildConjugationsPrompt(candidates, "sb-1")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.prompt).toContain("كَتَبَ")
    expect(result.prompt).toContain("ذَهَبَ")
    expect(result.prompt).toContain("sb-1")
    expect(result.prompt).toContain("past")
    expect(result.prompt).toContain("present")
    expect(result.prompt).toContain("imperative")
    expect(result.prompt).toContain("verbal_noun")
    expect(result.prompt).toContain("active_participle")
    expect(result.prompt).toContain("passive_participle")
  })

  it("returns an error for empty candidates", () => {
    const result = buildConjugationsPrompt([])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("No verb candidates")
  })
})
