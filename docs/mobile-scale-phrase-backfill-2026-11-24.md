# Mobile scale and Phrase corpus report — 24 November 2026

Production Phrase data was populated additively: **6 → 130 rows**, including **124 new expressions**. The Homepage alignment and Admin pagination/search changes are implemented and tested locally; they have **not been deployed**. Future automatic Phrase-only enrichment still needs the database approval described below. This is a conservative corpus pass, not a claim that every useful expression has been discovered.

## Mobile scale

Compared the working application with **0286f84**, the immediate parent of the 21 November startup/auth repair **7a86d1c**. An isolated archive of that commit used the same deterministic fixture data and dependencies. Reviewed root layout, viewport, global CSS, typography, Home/Featured, Quick Actions, navbar, buttons, spacing, safe-area and viewport-height rules. The startup repair moved reading font CSS into a layout import and added recovery/auth handling; it did not change the measured Homepage proportions.

**No enlargement relative to that baseline was reproduced. No speculative sizing change was made.** The measured Featured, navbar, Quick Actions, button, font, padding and gap properties were identical before/after in all 32 browser/width combinations.

At 390px, both versions have a 16px root, 16px horizontal Featured padding, a 504px Featured frame, 50px Featured buttons, a 44px mobile-navbar content grid within the existing 57px navbar clearance, 76px Quick Action tiles and 12px grid gaps. At 1024px and 1440px, the Featured frame remains 405px and 580.5px respectively with the same desktop padding and buttons. There is no desktop shrinking.

Both versions emit `width=device-width, initial-scale=1, viewport-fit=cover`. The Tailwind preflight `-webkit-text-size-adjust:100%` rule is unchanged. Chrome reports 100%; the Windows WebKit build does not expose a computed value for that property, so it cannot prove actual iOS text-autosizing behaviour. No root font reduction, zoom, scale transform, restrictive viewport, new breakpoint or PWA-specific shrinking was introduced.

Tested **320, 375, 390, 414, 430, 768, 1024 and 1440px** in WebKit, installed Chrome, Firefox and installed Edge. Mobile WebKit used touch emulation and DPR 3. This is Safari-engine mobile emulation, not a physical iPhone/Safari test. Screenshots at 375/390/414/430px and 1440px are in `artifacts/phrase-restore/mobile/`; structured comparisons are in `results.json` there. Top-of-page and Phrase screenshots were visually inspected. Fixture artwork is synthetic, so screenshots establish layout proportions rather than production artwork appearance.

The new Featured system and Safari reliability fixes remain intact. **It would be inaccurate to claim that an identified oversized layout was restored: the requested pre-Safari baseline already has the same proportions.** Other routes were inspected through their unchanged shared layout/styles; a new eight-width browser matrix for every individual route was not run.

## Phrase crawl and production population

| Measure | Actual result |
|---|---:|
| Initial canonical Phrases | 6 |
| Transcript records inspected | 182 |
| Eligible ready transcripts processed | 178 |
| Excluded transcript records | 4 |
| Episodes processed | 128 |
| Book chapters processed | 134 |
| Books inspected | 21 |
| Shows inspected | 24 |
| Episode-linked Transcript mirrors merged | 106 |
| Unique canonical documents, including two empty Episodes | 334 |
| Nonempty canonical documents | 332 |
| Arabic units in the final discovery check | 30,947 |
| Distinct corpus candidate expressions | 155 |
| Reviewed accepted expressions | 130 |
| Reviewed rejected corpus matches | 25 |
| Borderline lexical reference entries held back | 101 |
| Repeated candidate occurrences collapsed in the final check | 990 |
| Existing canonical Phrases reused unchanged | 6 |
| New rows inserted | 124 |
| Final canonical Phrase count | **130** |
| Phrase provenance examples | 130 |
| Canonical rows with reliable word glosses | 118 |

Three personal user imports and one unfinished transcript were excluded. Parent Books and Shows have metadata rather than standalone learner-passage fields; learner text was read through their chapters, Episodes and associated transcripts. Legacy arrays, structured chapters, raw authored transcript tokens, canonical projections, segments and English-source Arabic translations were inspected. Shared source documents and normalized sentence mirrors were merged before extraction.

The older dry-run script proposed 2,037 new entries, chiefly because it promoted multi-word vocabulary entries without establishing their use in the requested passage corpus. That result was **not** bulk imported. The revised discovery uses the 23,655-row vocabulary table as a matching reference and admits its expressions only when attested in learner content. It does not enumerate arbitrary adjacent n-grams.

The quality gate reviewed a distributed sample of **50 accepted**, **25 borderline** and **25 rejected** candidates, plus the complete 155-entry corpus selection. The full sample and reasons are in `artifacts/phrase-restore/corpus/quality-review.md`; explicit decisions and source evidence are in `reviewed.json`. The final additional English-source pass added 36 Arabic units and changed no candidate keys.

CEFR was assigned to the expressions themselves rather than copied from source difficulty. Final distribution: **A1 17, A2 37, B1 49, B2 27**; no C1/C2 quota was imposed. Existing transliteration was retained, natural whole-expression meanings were checked against context, and source-token glosses were reused only when they aligned. The six curated rows, including their timestamps and missing gloss values, were left untouched. Their complete-row digest remained `1aa3e7cbe4417d03b81b342c66206ae0` before and after both executions.

The backfill reused `public.website_write_phrase(null, fields)`, which locks and deduplicates by normalized Arabic and returns an existing row unchanged. Provenance was inserted into the existing `content_enrichment_examples` table using `ON CONFLICT DO NOTHING`. This execution created no schema objects, queued no work, changed no source text and made no model/provider calls. The whole batch is transactional; replay after an interruption is safe. Replaying it after success left **130 Phrases and 130 examples**, proving no duplicate inserts.

Each accepted expression has a checked source occurrence: 67 chapter, 19 Episode and 44 Transcript examples. Existing parent IDs/titles, routes and genuine timestamps were retained where available. No timestamps were invented. This records one checked occurrence per expression; it is not an exhaustive occurrence concordance.

The result is **130**, not approximately 2,000. A complete eligible-source scan is not proof of exhaustive semantic discovery: expressions absent from the authored/reference inventory can still be missed. Further semantic discovery and review remain necessary before claiming that every useful phrase has been extracted.

## Phrase quality examples

| Type | Arabic | Meaning |
|---|---|---|
| Fixed expression | فِي الْوَاقِعِ | in fact |
| Idiom | فِي غَمْضَةِ عَيْنٍ | in the blink of an eye |
| Conversational expression | هَوِّنْ عَلَيْكَ | take it easy; calm down |
| Collocation | إِضَاعَةُ الْوَقْتِ | wasting time |
| Formulaic language | صَبَاحُ الْخَيْرِ | good morning |
| Reusable pattern | مَا إِنْ … حَتَّى … | no sooner … than … |

Rejected examples include `على أن` inside `القادر على أن` (not the claimed provided-that meaning), `يسقط على` in a passage about falling onto stairs (not projects onto), `في جيبه` (ordinary location plus pronoun), `مقنع جدًا` (arbitrary adjective/intensifier), and `من شأنه` in `يعلي من شأنه` (his standing, not is likely to). These illustrate why lexical matching alone is insufficient.

## Admin → Phrases

Implemented a guarded server action returning **50 rows per page plus the exact filtered count**, rather than loading every row into the browser. Added debounced server search across Arabic, English, transliteration and CEFR, including unvocalised Arabic matching vocalised display text. Search values and regex metacharacters are escaped. Arabic display text is not normalized destructively. The query uses PostgREST's documented [pattern matching and quoted filter values](https://docs.postgrest.org/en/stable/references/api/tables_views.html#operators).

Mobile cards show CEFR/transliteration; details expose word glosses on mobile and desktop. Existing edit actions remain Admin-guarded. Editing a phrase out of an active search result now updates the open details dialog rather than leaving stale text. Superseded asynchronous reads cannot replace newer results.

Eight browser scenarios passed with **2,501 synthetic records**, covering first/next page bounds, search across the full collection, Arabic search, CEFR, transliteration, gloss display, editing and reload persistence. A separate opt-in **read-only production data-path test** passed: pages contain 50/50/30 rows, all 130 IDs are unique, 118 rows have glosses, and Arabic/English search finds the original first Phrase.

An authenticated browser visit to the deployed Admin page was **not verified**: the connected browser host reported unavailable. Synthetic browser tests and production service-role reads do not certify a signed-in production UI session. Local Admin changes still require deployment.

## Homepage Phrase of the Day

`PhraseOfTheDay.tsx` now sets card-wide `textAlign:'center'` and `justifyContent:'center'` on the wrapping RTL word/gloss collection. The heading, Arabic phrase, English meaning, each gloss group and wrapped rows are centred. Arabic ordering and English `dir="ltr"` semantics are preserved. No transliteration is currently rendered, so none was added. The existing mobile-only visibility remains intact.

The source remains the same canonical `public.phrases` library through `website_phrase_of_day`; no duplicate list was added to the Homepage. Europe/London day selection and the existing persistent date-to-ID mapping were unchanged. The live 24 November mapping points to existing Phrase **3**. Newly inserted rows participate in future daily selections without replacing today's mapping.

## Browser and code verification

| Browser | Homepage baseline/width comparisons | Admin 2,501-row scenarios |
|---|---:|---:|
| WebKit | 8/8 passed | 2/2 passed |
| Chrome | 8/8 passed | 2/2 passed |
| Firefox | 8/8 passed | 2/2 passed |
| Edge | 8/8 passed | 2/2 passed |

Also passed: **31 focused unit tests**, **3 isolated Phrase-only SQL proposal tests**, **1 live read-only query test**, targeted ESLint, TypeScript, `git diff --check`, and `npm run build:vinext`. The vinext build overwrote generated Next route declarations; `next typegen` regenerated them before the final TypeScript check. No source-code workaround was needed. Test servers and the temporary baseline archive were removed/stopped after verification.

## Required approval for future content

Production source-save triggers already catch enrichment-queue failures, preserving the original content save. However, the current `website_queue_enrichment` still queues **both `phrases` and `grammar`**, and `website_claim_enrichment` can claim both. No historical scan/worker was started through these functions, and Grammar Notes was not re-enabled by this work.

Application-only changes cannot prevent those database triggers from queueing Grammar. Under the request's **NO UNNECESSARY MIGRATION** rule, the following production change is held for explicit approval:

- **Exact forward SQL:** [phrase-only-enrichment.sql](proposals/phrase-only-enrichment.sql).
- **Reason:** queue and claim only Phrase jobs for new chapters, Episodes and eligible transcripts while preserving original source saves and existing Grammar history.
- **Affected objects:** existing `public.website_queue_enrichment(text,text,boolean,smallint)` and `public.website_claim_enrichment()` function bodies only. No tables, columns, grants, source records or Phrase records are replaced.
- **Rollback:** [phrase-only-enrichment-rollback.sql](proposals/phrase-only-enrichment-rollback.sql) restores the exact two production function definitions captured on 24 November. Historical jobs and content remain stored; no content rollback is needed. Restoring these definitions also restores the previous mixed Phrase/Grammar queue behaviour.
- **Validation:** three isolated database tests passed; forward SQL and rollback SQL have **not** been applied.

After approval, the queue correction and the production worker connection must be verified before claiming automatic new-content extraction works end to end. That final acceptance criterion is still open.

## Data safety

**DELETE: NO**  
**TRUNCATE: NO**  
**DROP: NO**  
**Books deleted: NO**  
**Chapters deleted: NO**  
**Shows deleted: NO**  
**Episodes deleted: NO**  
**Transcripts deleted: NO**  
**Existing Phrases deleted: NO**  
**Existing production content replaced: NO**

No existing ArabicWithM production content was deleted or replaced. Local cleanup removed only the temporary baseline checkout and redundant generated screenshots.

## Final acceptance status

The eligible corpus was scanned and the canonical library now contains 130 reviewed expressions. The implemented Phrase card is fully centre-aligned and still reads that library. Existing curated rows and source content were preserved. The pre-Safari Homepage proportions were reproduced unchanged; there is no evidence for a sizing rollback at the requested comparison point. Deployment, authenticated production UI verification, broader semantic discovery and the approved Phrase-only future-content queue remain outstanding; the task is not reported as fully complete.
