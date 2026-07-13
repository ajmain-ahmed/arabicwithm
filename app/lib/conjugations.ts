// app/lib/conjugations.ts — pure helpers for conjugation workflows.

export type VerbCandidate = {
  lemma: string
  lemma_diacritic: string
  root: string | null
}

export type GeneratedConjugation = {
  lemma: string
  root: string | null
  form_number: string | null
  type: "past" | "present" | "imperative" | "verbal_noun" | "active_participle" | "passive_participle"
  conjugation_ar: string
  conjugation_diacritic: string
  transliteration: string | null
  english_translation: string | null
  source?: string | null
}

export const validConjugationTypes = new Set([
  "past",
  "present",
  "imperative",
  "verbal_noun",
  "active_participle",
  "passive_participle",
])

export type ValidateConjugationsResult =
  | { ok: true; rows: GeneratedConjugation[] }
  | { ok: false; error: string }

export function validateConjugationRows(parsed: unknown): ValidateConjugationsResult {
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Conjugation output must be a JSON array." }
  }

  const rows: GeneratedConjugation[] = []
  const errors: string[] = []

  for (let i = 0; i < parsed.length; i++) {
    const raw = parsed[i]
    if (typeof raw !== "object" || raw === null) {
      errors.push(`Row ${i + 1} is not an object.`)
      continue
    }
    const row = raw as Record<string, unknown>

    const lemma = typeof row.lemma === "string" ? row.lemma.trim() : ""
    const type = typeof row.type === "string" ? row.type.trim() : ""
    const conjugation_ar = typeof row.conjugation_ar === "string" ? row.conjugation_ar.trim() : ""
    const conjugation_diacritic =
      typeof row.conjugation_diacritic === "string" ? row.conjugation_diacritic.trim() : ""

    if (!lemma) errors.push(`Row ${i + 1}: "lemma" is required.`)
    if (!validConjugationTypes.has(type)) errors.push(`Row ${i + 1}: "type" must be one of ${Array.from(validConjugationTypes).join(", ")}.`)
    if (!conjugation_ar) errors.push(`Row ${i + 1}: "conjugation_ar" is required.`)
    if (!conjugation_diacritic) errors.push(`Row ${i + 1}: "conjugation_diacritic" is required.`)

    if (errors.length > 0 && (!lemma || !validConjugationTypes.has(type) || !conjugation_ar || !conjugation_diacritic)) {
      continue
    }

    rows.push({
      lemma,
      root: typeof row.root === "string" && row.root.trim() ? row.root.trim() : null,
      form_number: typeof row.form_number === "string" && row.form_number.trim() ? row.form_number.trim() : null,
      type: type as GeneratedConjugation["type"],
      conjugation_ar,
      conjugation_diacritic,
      transliteration:
        typeof row.transliteration === "string" && row.transliteration.trim()
          ? row.transliteration.trim()
          : null,
      english_translation:
        typeof row.english_translation === "string" && row.english_translation.trim()
          ? row.english_translation.trim()
          : null,
      source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : null,
    })
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join("\n") }
  }

  return { ok: true, rows }
}

export type ConjugationsPromptResult =
  | { ok: true; prompt: string; candidates: VerbCandidate[] }
  | { ok: false; error: string }

export function buildConjugationsPrompt(
  candidates: VerbCandidate[],
  source?: string
): ConjugationsPromptResult {
  if (candidates.length === 0) {
    return { ok: false, error: "No verb candidates provided." }
  }

  const candidatesJson = JSON.stringify(
    candidates.map((c) => ({
      lemma: c.lemma,
      lemma_diacritic: c.lemma_diacritic,
      root: c.root,
    })),
    null,
    2
  )

  const exampleJson = JSON.stringify(
    [
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
    ],
    null,
    2
  )

  const prompt = `You are an expert Arabic morphologist and lexicographer.

We are building a conjugation table for Arabic verb lemmas. For every verb candidate below, generate ALL six morphological forms:
- past
- present
- imperative
- verbal_noun (المصدر)
- active_participle (اسم الفاعل)
- passive_participle (اسم المفعول)

### Database schema for \`public.verb_conjugations\`:
- \`lemma\` (text, NOT NULL): The verb lemma with diacritics, e.g. "كَتَبَ".
- \`root\` (text, NULL): The 3 or 4-letter root separated by hyphens, e.g. "ك-ت-ب". NULL if unknown.
- \`form_number\` (text, NULL): The verb form (e.g. "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"). NULL if uncertain.
- \`type\` (text, NOT NULL): Must be exactly one of: past, present, imperative, verbal_noun, active_participle, passive_participle.
- \`conjugation_ar\` (text, NOT NULL): The plain Arabic form without diacritics.
- \`conjugation_diacritic\` (text, NOT NULL): The fully diacritized Arabic form.
- \`transliteration\` (text, NULL): Latin transliteration.
- \`english_translation\` (text, NULL): Short English gloss for this form, e.g. "he wrote".
- \`source\` (text, NULL): Use exactly "${source ?? ""}".

### Example output rows:
${exampleJson}

### Verb candidates:
${candidatesJson}

### OUTPUT FORMAT:
Return ONLY a valid, minified JSON array containing the generated objects. Do not include markdown code block formatting (\`\`\`json), introductory sentences, or conversational prose. Start your response directly with [ and end with ].`

  return { ok: true, prompt, candidates }
}
