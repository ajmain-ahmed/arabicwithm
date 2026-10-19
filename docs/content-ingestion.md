# Arabic Content Ingestion

Use this workflow whenever Arabic/English source material is converted into a
cartoon transcript or a book chapter.

## Canonical block format

Cartoon transcripts are JSON arrays of timed blocks:

```json
[
  {
    "tokens": [
      {
        "pos": "noun",
        "cefr": "A1",
        "arabic": "أَبِي",
        "english": "my father",
        "headword": "ابو",
        "entry_type": "word",
        "transliteration": "abī"
      }
    ],
    "timestamp": "0:01",
    "translation": "Father..."
  }
]
```

Book chapters use the same `tokens` and `translation` fields but do not need a
timestamp. A book block may also contain a separate `punctuation` field so
punctuation renders without becoming part of a hoverable dictionary token.

## Token rules

- `arabic`: the fully vocalised surface form exactly as it appears in the text.
- `english`: a short contextual gloss for the surface form, not the full Hans
  Wehr entry.
- `transliteration`: transliteration of the displayed surface form.
- `pos`: a lowercase part-of-speech label. Established values include `noun`,
  `proper_noun`, `verb`, `adjective`, `adverb`, `pronoun`, `preposition`,
  `conjunction`, `particle`, `numeral`, and `phrase`.
- `cefr`: one of `A1`, `A2`, `B1`, `B2`, `C1`, or `C2`. Existing readers treat
  the value case-insensitively.
- `entry_type`: either `word` or `phrase`.
- For a word, `headword` is the unvocalised Hans Wehr lookup form. It may be
  `null` only when no defensible dictionary mapping exists, commonly for a
  proper name.
- For a phrase, `headword` is the phrase ID represented as a string. Phrase IDs
  belong to the Supabase `phrases` table, not `hanswehr_dictionary`.
- A multiword expression stored as one phrase token must remain one token.

### Optional book grammar labels

Book tokens may additionally include `syntactic_role` and `grammatical_case`.
Each accepts `null` or an object with string `arabic` and `english` properties,
for example `"grammatical_case": { "arabic": "مَنْصُوبٌ", "english": "Accusative" }`.
Both are optional; the reader treats missing labels as `null`. Do not infer or
backfill grammar for older chapters. The Admin JSON editor validates these labels
before saving, and all chapter write actions validate them again after Admin
authorization. Invalid labels identify the sentence, token and field.

The labels stay inside existing `chapters.content` JSONB token objects. There
are no extra columns or migration requirements. Admin retrieval/JSON copying
preserves the original token and sentence keys, including paragraph numbering,
boundary flags and empty compatibility timestamps. Public reader tokens expose
both labels without adding a grammar display or changing paragraph grouping.

## Hans Wehr reference

The reference export `hanswehr_dictionary_rows.csv` has 24,799 rows and these
columns:

`id`, `word`, `definition`, `is_root`, `parent_id`, `quran_occurrence`,
`search_vector`.

- Match transcript `headword` to dictionary `word` using exact Arabic first.
- A spelling can have several dictionary rows. Use the sentence context,
  contextual English gloss, root/parent relationship, and definition to select
  the right sense. Never select the first row merely because it matches.
- `definition` is the full dictionary material. Do not replace it with a short
  transcript gloss unless the user explicitly asks to edit the dictionary.
- `search_vector` is an index/search aid, not display content.
- Preserve `id`, `is_root`, `parent_id`, and `quran_occurrence`; they describe
  dictionary structure and must not be regenerated during transcript import.

## Supplied reference transcript audit

The reference transcript supplied on 2026-08-13 contains:

- 14 timed blocks and 136 tokens.
- 132 word tokens and 4 phrase tokens.
- All seven canonical token fields on every token.
- 80 distinct non-null word headwords: 79 exact CSV matches and one unmatched
  headword (`نبأ`).
- 49 matched spellings with more than one Hans Wehr row; these require semantic
  disambiguation.
- Phrase IDs `3`, `4`, `5`, and `6`.

## Import workflow

1. Confirm the target: cartoon episode or book/chapter, including its slug or ID.
2. Preserve source order and meaning. For cartoons, create monotonic timestamps
   in `M:SS`, `H:MM:SS`, or the supported frame format.
3. Segment into natural translation blocks, then tokenise the Arabic. Do not
   manufacture or omit Arabic words to make the translation align.
4. Add the seven canonical token fields. Use concise contextual English and
   accurate vocalisation/transliteration.
5. Match word headwords against Hans Wehr and phrase IDs against `phrases`.
   Resolve duplicate dictionary spellings from context and flag genuinely
   uncertain matches instead of guessing.
6. Validate before writing:
   - valid JSON and UTF-8 Arabic (no mojibake);
   - required block and token fields present;
   - valid CEFR/POS/entry types;
   - timestamps valid and ordered for cartoons;
   - phrase IDs exist;
   - headword match report includes unmatched and ambiguous rows;
   - translations and punctuation are complete.
7. Show or report the validation summary. Only write to Supabase when the user
   explicitly asks to add/update the specified cartoon episode or book chapter.
8. Cartoons are written to `episodes.transcript`; books are written to
   `chapters.content`. Use the existing guarded server/admin workflow and refresh
   the relevant public cache tag.

The reference files are external working inputs and should not be committed to
the repository unless the user explicitly requests that.
