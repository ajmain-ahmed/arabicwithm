# Mobile Homepage Phrase of the Day

## Placement

`HomeDashboard` renders `PhraseOfTheDay` immediately beneath Quick Actions and before the existing AWM+ section. The card uses the existing MUI `sm` breakpoint and is visible below 600px. It is hidden at 768, 1024, and 1440px. The existing Quick Actions and AWM+ layout rules are preserved.

The card uses existing colour variables, Arabic typography, spacing, and a 10px card radius. Empty or unavailable results produce no card shell.

## Phrase source

The source is the canonical `public.phrases` table managed through Admin Phrases. The server calls the service-only `website_phrase_of_day` RPC and returns one small public record to the Homepage. It includes Arabic, natural English meaning, and validated optional word glosses.

Eligibility requires Arabic letters and a usable English meaning. Empty data, punctuation-only Arabic, English URL values, and obvious English placeholders such as test, placeholder, TODO, TBD, and coming soon are excluded. The existing schema has no inactive/deleted flag. Deleted rows leave the eligible pool through normal deletion.

The database performs selection from canonically ordered bigint IDs. The entire library stays out of the browser. Admin write operations remain server-authorized, and the new RPC denies direct execution to ordinary users.

## Daily selection

The server reuses `platformDate`, the same Europe/London calendar convention used by Homepage rotation. The date is supplied from the same request time as the other Homepage selections.

The database chooses an ID using the London day ordinal modulo the ordered eligible pool. It avoids the previous day's stored ID whenever another eligible record exists. If yesterday has no stored selection and the pool is unchanged, the cyclic ordering also avoids consecutive repetition.

`private.home_daily_phrase` stores only the date and Phrase ID. A transaction advisory lock serializes concurrent first requests for the same day. Refreshes, another browser, or a viewport change reuse the same selection. Adding a Phrase leaves today's chosen ID intact. Correcting the selected canonical row updates its content. Deleting or invalidating that row allows a valid replacement, and an empty eligible library hides the card.

The date-to-ID table contains no duplicate Phrase content. This small persistent identity mapping is necessary to keep today's selection stable when the library changes.

Homepage request-time date handling and existing catalogue caches remain in place. The new read cache has a five-minute lifetime, a date-specific key, and the `phrases` tag. Admin Phrase edits expire that tag with `updateTag`. The next London date uses a different cache key and selection. This matches the existing Homepage rotation convention on a fresh request or refresh. A page left open across midnight retains its existing server-rendered content until navigation or refresh.

## Display and gloss data

Arabic retains its stored diacritics and appears prominently in RTL order. When reliable glosses exist, each Arabic word sits above its contextual English gloss. Word/gloss groups wrap together. The natural full English meaning follows underneath.

Older rows without reliable glosses display Arabic and their complete English meaning. There are no empty token placeholders, invented word glosses, or model calls during Homepage rendering.

The audited Phrase schema and enrichment occurrence records had no stored per-word gloss representation. The proposed migration adds one nullable `phrases.word_glosses` JSONB array. Existing Phrase rows receive no generated or copied content. The renderer accepts the array only when every word has a concise English gloss and the ordered Arabic words match the phrase after harmless Unicode/diacritic/punctuation/spacing normalization.

The existing enrichment service now reuses contiguous individual authored source tokens to supply these glosses when they match a discovered phrase. It does not split a phrase-level English gloss into invented meanings. Newly created canonical Phrase rows can store the resulting optional array through the existing writer and enrichment commit RPC. Existing curated Phrase content keeps precedence. Grouped phrase tokens with no separate word glosses continue using the fallback.

## QA

Browser tests passed at 320, 390, and 430px with the long expression `إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ`. They verify placement below Quick Actions, word/gloss vertical pairing, full English, no horizontal page overflow, stability after refresh, and stability after resizing. The 320px screenshot was visually inspected. The following AWM+ section remains present below the card.

At 768, 1024, and 1440px the card is hidden. All six browser cases passed against the production Next build with isolated canonical Phrase fixtures.

Component tests cover the short, conversational, and long requested expressions plus the empty-library fallback. SQL tests use the actual migration with PGlite and simulated dates to cover daily stability, consecutive rotation, additions, edits, deletions, an empty/malformed library, a single eligible record, access controls, canonical gloss storage, and enrichment commit integration. Utility tests cover paired-token alignment and London midnight in summer and winter.

The full unit suite passed with **1,530 tests**, with five skipped. The final focused suite passed **18 tests**. TypeScript, targeted ESLint, and the Cloudflare Worker build passed. All six viewport browser tests passed against a production Next build.

## Engineering

Migration required **YES**. Proposed file `supabase/migrations/20261114203000_home_daily_phrase.sql` adds the optional gloss column, the private date-to-ID mapping, the service-only selection function and private eligibility view. It updates the existing Phrase writer and enrichment commit function to accept optional glosses. Existing Phrase write permissions remain in place, and the new table has RLS enabled with service-only access.

Production database migration applied **YES**, following explicit approval for this exact file. Its assigned production version is `20261114221743`. Website deployment remains pending. The verification results below record the completed database activation.

Files changed for this feature follow.

- `app/components/home/PhraseOfTheDay.tsx` and `PhraseOfTheDay.test.tsx`
- Phrase placement and prop in existing `app/components/home/HomeDashboard.tsx`
- Homepage loading in existing `app/page.tsx` and mock in `app/page.test.tsx`
- `app/lib/dailyPhrase.ts`, `dailyPhrase.server.ts`, and `dailyPhrase.test.ts`
- Authored gloss extraction in existing `app/lib/contentEnrichment/service.ts`
- Phrase cache invalidation in existing `app/actions/admin.ts`
- `supabase/migrations/20261114203000_home_daily_phrase.sql`
- `supabase/tests/dailyPhrase.test.ts`
- `e2e/daily-phrase.pw.ts`, `playwright.daily-phrase.config.ts`, and the daily Phrase fixture RPC/data in existing `e2e/fixture-server.mjs`
- This report

## Explicit confirmations

The following describe the implemented workflow, with the production migration applied and website deployment still pending.

- Phrase of the Day is mobile-only and appears directly beneath Quick Actions.
- The same canonical Phrase is displayed for the entire London calendar day and changes on the next day when another eligible phrase exists. Removal or invalidation of today's record permits a valid replacement.
- The card displays Arabic, contextual English beneath individual words where available, and the natural full English meaning underneath.
- Phrase data comes from the existing Phrase Library rather than a hard-coded Homepage list.
- Homepage rendering does not invoke an AI analysis provider.


## Production migration verification

Applied only `supabase/migrations/20261114203000_home_daily_phrase.sql` to project `whbxgwucsoguqzpnpzjd`. The Supabase tool returned success and assigned ledger version **20261114221743**, name `home_daily_phrase`. The previous latest version was `20261114194433`, `content_enrichment`. The production timestamp differs from the local filename and should be reconciled using this mapping in future migration-history work.

### Objects and permissions

- Added nullable JSONB `public.phrases.word_glosses` and its array constraint.
- Created `private.home_daily_phrase`, storing only date and canonical Phrase ID, with RLS enabled.
- Created `private.home_eligible_phrases` eligibility view.
- Created `public.website_phrase_of_day(date)`.
- Updated `public.website_write_phrase(bigint,jsonb)` and `public.website_commit_enrichment(uuid,uuid,integer,boolean,jsonb,text)` to accept authored gloss arrays.

The private table and view have zero grants to `PUBLIC`, `anon`, or `authenticated`. The new selection RPC and both updated writer functions deny ordinary-role execution and allow service-role execution. Existing Phrase table grants match the pre-migration grants. No existing source, Grammar Note, auth, or RLS policies were changed by this migration.

### Phrase integrity

The canonical table contains **6 rows** before and after migration and smoke testing. All six new gloss fields remain SQL NULL. The full-row digest excluding only the newly added field remains `17c2562227d739af7ecdd84ec80684d3`, matching the pre-migration digest.

### Production smoke results

All smoke tests ran inside explicit transactions ending in `ROLLBACK`.

- Canonical Phrase creation and existing writer editing passed.
- A vocalized and unvocalized Arabic variant resolved to one Phrase identity.
- An authored word-gloss array persisted exactly and survived a normal meaning edit.
- Repeated selection for simulated date `2088-01-01` returned the same record.
- Selection for `2088-01-02` returned a different eligible record.
- With the eligible pool made empty inside the test transaction, selection returned null safely.
- A temporary chapter queued work, the worker claimed its Phrase job, and the production enrichment commit persisted its authored word glosses through the canonical writer.

Temporary rows, edits, jobs, and daily mappings were rolled back. PostgreSQL identity sequences can advance during rolled-back inserts, so smoke tests can leave ordinary sequence gaps. Final checks found zero daily mappings and zero enrichment jobs, with all six original Phrase rows intact.

Historical backfill was **NOT started**. Production changes beyond this approved migration were limited to the rolled-back verification transactions described above. Additional schema, policy, content, or deployment changes **NO**. No model provider was called or configured. Website deployment remains pending.
