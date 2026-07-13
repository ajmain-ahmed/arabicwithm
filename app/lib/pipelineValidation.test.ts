import { describe, it, expect } from "vitest"
import { validateTranscriptEntries } from "./pipelineValidation"

const sampleTranscript = [
  {
    tokens: [
      {
        cefr: "A1",
        pos: "adjective",
        root: "س-ر-ع",
        lemma: "سَرِيع",
        arabic: "سَرِيع",
        english: "Speed",
        entry_type: "word",
        transliteration: "sarīʿ",
      },
      {
        CEFR: "A1",
        pos: "verb",
        root: "ل-ي-س",
        lemma: "لَيْسَ",
        arabic: "لَسْتُ",
        english: "I am not",
        entry_type: "word",
        transliteration: "lastu",
      },
      {
        cefr: "B1",
        pos: "verb",
        root: "م-ز-ح",
        lemma: "مَزَحَ",
        arabic: "أَمْزَحُ",
        english: "joking",
        entry_type: "word",
        transliteration: "amzaḥu",
      },
    ],
    timestamp: "0:00",
    arabicPlain: "سريع لست أمزح",
    translation: "Speed, I’m not joking.",
    arabicDiacritic: "سَرِيع، لَسْتُ أَمْزَحُ",
  },
  {
    tokens: [
      {
        cefr: "B1",
        pos: "verb",
        root: "ظ-ه-ر",
        lemma: "أَظْهَرَ",
        arabic: "أَظْهِرْ",
        english: "show",
        entry_type: "word",
        transliteration: "aẓhir",
      },
      {
        cefr: "A2",
        pos: "noun",
        root: "ن-ف-س",
        lemma: "نَفْس",
        arabic: "نَفْسَكَ",
        english: "yourself",
        entry_type: "word",
        transliteration: "nafsaka",
      },
      {
        cefr: "B1",
        pos: "phrase",
        root: null,
        lemma: "عَلَى الْفَوْرِ",
        arabic: "عَلَى الْفَوْرِ",
        english: "immediately",
        entry_type: "phrase",
        transliteration: "ʿalā l-fawr",
      },
    ],
    timestamp: "0:01",
    arabicPlain: "أظهر نفسك على ظاہر الفور",
    translation: "Show yourself immediately.",
    arabicDiacritic: "أَظْهِرْ نَفْسَكَ عَلَى الْفَوْرِ",
  },
  {
    tokens: [
      {
        cefr: "A1",
        pos: "verb",
        root: "أ-خ-ذ",
        lemma: "أَخَذَ",
        arabic: "سَآخُذُ",
        english: "I'm taking",
        entry_type: "word",
        transliteration: "sa-ʾākhuḏu",
      },
      {
        cefr: "A1",
        pos: "noun",
        root: "ك-ر-و",
        lemma: "كُرَة",
        arabic: "الْكُرَةَ",
        english: "the ball",
        entry_type: "word",
        transliteration: "al-kurata",
      },
    ],
    timestamp: "0:07",
    arabicPlain: "سآخذ الكرة",
    translation: "I’m taking the ball.",
    arabicDiacritic: "سَآخُذُ الْكُرَةَ",
  },
  {
    tokens: [
      {
        cefr: "A1",
        pos: "adjective",
        root: "س-ر-ع",
        lemma: "سَرِيع",
        arabic: "سَرِيع",
        english: "Speed",
        entry_type: "word",
        transliteration: "sarīʿ",
      },
      {
        cefr: "B2",
        pos: "phrase",
        root: null,
        lemma: "كَيْفَ تَجْرُؤُ",
        arabic: "كَيْفَ تَجْرُؤُ",
        english: "how dare you",
        entry_type: "phrase",
        transliteration: "kayfa tajruʾu",
      },
    ],
    timestamp: "0:10",
    arabicPlain: "سريع كيف تجرؤ",
    translation: "Speed, how dare you?!",
    arabicDiacritic: "سَرِيعُ، كَيْفَ تَجْرُؤُ؟",
  },
  {
    tokens: [
      {
        cefr: "A1",
        pos: "verb",
        root: "أ-خ-ذ",
        lemma: "اِتَّخَذَ",
        arabic: "تَتَّخِذَ",
        english: "make/take",
        entry_type: "word",
        transliteration: "tattakhiḏa",
      },
      {
        cefr: "B1",
        pos: "noun",
        root: "ق-ر-ر",
        lemma: "قَرَار",
        arabic: "قَرَارًا",
        english: "a decision",
        entry_type: "word",
        transliteration: "qarāran",
      },
    ],
    timestamp: "0:12",
    arabicPlain: "عليك أن تتخذ قرارا",
    translation: "You have to make a decision",
    arabicDiacritic: "عَلَيْكَ أَنْ تَتَّخِذَ قَرَارًا",
  },
  {
    tokens: [
      {
        cefr: "A1",
        pos: "noun",
        root: "ك-ر-و",
        lemma: "كُرَة",
        arabic: "الْكُرَةُ",
        english: "the ball",
        entry_type: "word",
        transliteration: "al-kuratu",
      },
    ],
    timestamp: "0:14",
    arabicPlain: "إما أنا أو الكرة",
    translation: "either me or the ball.",
    arabicDiacritic: "إِمَّا أَنَا أَوْ الْكُرَةُ",
  },
]

describe("validateTranscriptEntries", () => {
  it("flattens transcript entries into unique pipeline items keyed by lemma", () => {
    const result = validateTranscriptEntries(sampleTranscript)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Duplicate lemmas (سَرِيع, كُرَة) are deduplicated; different lemmas sharing a root (أَخَذَ vs اِتَّخَذَ) are kept separate.
    const items = result.items
    expect(items.length).toBe(11)

    const byArabic = new Map(items.map((i) => [i.arabic, i]))

    // Lemma becomes the canonical arabic field; surface form is preserved as contextualArabic.
    expect(byArabic.get("سَرِيع")?.contextualArabic).toBe("سَرِيع")
    expect(byArabic.get("لَيْسَ")?.contextualArabic).toBe("لَسْتُ")
    expect(byArabic.get("مَزَحَ")?.contextualArabic).toBe("أَمْزَحُ")
    expect(byArabic.get("كُرَة")?.contextualArabic).toBe("الْكُرَةَ")
    expect(byArabic.get("أَخَذَ")?.contextualArabic).toBe("سَآخُذُ")
    expect(byArabic.get("اِتَّخَذَ")?.contextualArabic).toBe("تَتَّخِذَ")

    // POS is required and carried through.
    expect(byArabic.get("سَرِيع")?.pos).toBe("adjective")
    expect(byArabic.get("عَلَى الْفَوْرِ")?.pos).toBe("phrase")

    // Phrase with null root is accepted.
    const phrase = byArabic.get("عَلَى الْفَوْرِ")
    expect(phrase).toBeDefined()
    expect(phrase?.entry_type).toBe("phrase")
    expect(phrase?.root).toBeNull()

    // English gloss is carried through.
    expect(byArabic.get("قَرَار")?.english).toBe("a decision")

    // CEFR is normalised to lowercase.
    expect(byArabic.get("لَيْسَ")?.cefr).toBe("a1")
  })

  it("rejects an entry that is not an object", () => {
    const result = validateTranscriptEntries(["not-an-object"] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("not an object")
  })

  it("rejects missing tokens", () => {
    const result = validateTranscriptEntries([{ timestamp: "0:00" }] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('"tokens" must be an array')
  })

  it("rejects token with invalid CEFR", () => {
    const result = validateTranscriptEntries([
      {
        timestamp: "0:00",
        tokens: [
          {
            cefr: "Z9",
            pos: "noun",
            root: null,
            lemma: "test",
            arabic: "test",
            english: "test",
            entry_type: "word",
            transliteration: "test",
          },
        ],
      },
    ] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.toLowerCase()).toContain("cefr")
  })

  it("accepts token without CEFR", () => {
    const result = validateTranscriptEntries([
      {
        timestamp: "0:00",
        tokens: [
          {
            pos: "adjective",
            root: "س-ر-ع",
            lemma: "سَرِيع",
            arabic: "سَرِيع",
            english: "fast",
            entry_type: "word",
            transliteration: "sarīʿ",
          },
        ],
      },
    ] as unknown[])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.items[0].cefr).toBeUndefined()
  })

  it("rejects token without POS", () => {
    const result = validateTranscriptEntries([
      {
        timestamp: "0:00",
        tokens: [
          {
            cefr: "A1",
            root: "س-ر-ع",
            lemma: "سَرِيع",
            arabic: "سَرِيع",
            english: "fast",
            entry_type: "word",
            transliteration: "sarīʿ",
          },
        ],
      },
    ] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.toLowerCase()).toContain("pos")
  })

  it("rejects token with invalid POS value", () => {
    const result = validateTranscriptEntries([
      {
        timestamp: "0:00",
        tokens: [
          {
            cefr: "A1",
            pos: "unknown",
            root: "س-ر-ع",
            lemma: "سَرِيع",
            arabic: "سَرِيع",
            english: "fast",
            entry_type: "word",
            transliteration: "sarīʿ",
          },
        ],
      },
    ] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.toLowerCase()).toContain("pos")
  })

  it("rejects lemma without diacritics", () => {
    const result = validateTranscriptEntries([
      {
        timestamp: "0:00",
        tokens: [
          {
            cefr: "A1",
            pos: "verb",
            root: "ر-أ-ي",
            lemma: "رأى",
            arabic: "رَأَى",
            english: "see",
            entry_type: "word",
            transliteration: "raʾā",
          },
        ],
      },
    ] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.toLowerCase()).toContain("lemma")
    expect(result.error.toLowerCase()).toContain("diacritics")
  })

  it("rejects arabic without diacritics", () => {
    const result = validateTranscriptEntries([
      {
        timestamp: "0:00",
        tokens: [
          {
            cefr: "A1",
            pos: "verb",
            root: "ر-أ-ي",
            lemma: "رَأَى",
            arabic: "رأى",
            english: "see",
            entry_type: "word",
            transliteration: "raʾā",
          },
        ],
      },
    ] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.toLowerCase()).toContain("arabic")
    expect(result.error.toLowerCase()).toContain("diacritics")
  })

  it("rejects english containing Arabic script", () => {
    const result = validateTranscriptEntries([
      {
        timestamp: "0:00",
        tokens: [
          {
            cefr: "A1",
            pos: "verb",
            root: "ر-أ-ي",
            lemma: "رَأَى",
            arabic: "رَأَيْتُكُمَا",
            english: "I saw رأى you both",
            entry_type: "word",
            transliteration: "raʾaytukumā",
          },
        ],
      },
    ] as unknown[])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.toLowerCase()).toContain("english")
    expect(result.error.toLowerCase()).toContain("arabic")
  })
})
