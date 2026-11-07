# English-source transcripts

`source_language` is stored in the existing `youtube_transcripts.raw_transcript` metadata object, alongside `content`, never inside the canonical sentence/token array. Only an explicit `en` selects English mode; old/missing metadata defaults to Arabic. No migration or automatic backfill is required. AR/EN feed filters still select their existing group subtrees; membership does not determine rendering.

## Editing and persistence

Add/Edit Transcript and generated-review panels expose **Original Audio Language**. Manual imports, full JSON edits, drafts and preview preserve the selection. **Save audio language only** updates metadata and its version without replacing JSON or canonical arrays. The server requires an Admin, validates the enum, checks ready status and the exact version, and updates only while no processing lease is active. A concurrent write requires reopening Edit.

The older generated-review RPC retains existing metadata but ignores additional incoming metadata. A changed language is saved afterward using the guarded metadata update and the returned review version. If that second operation fails, the Admin receives an explicit message that JSON saved and must reopen to save language only. It does not silently claim complete success.

## Rendering

The shared English renderer is used by For You Short/Full, Homepage Spotlight, the public transcript route and Admin preview/view. English token/phrase text is LTR, the stored Arabic gloss is immediately below each token RTL, then the full Arabic sentence RTL. Stored diacritics are retained. Closing punctuation stays attached to the preceding token. Tokens open the existing definition popover with stored dictionary fields, including CEFR and phrase metadata. Existing Arabic render branches and player hooks are retained.

Missing or reversed fields produce a correction/regeneration warning; no script detection chooses display mode and no stored fields are swapped. New mode metadata is projected separately for selected feed clips (batched once per batch) and Spotlight (within its existing total deadline); full raw transcript content is not sent to clients for mode detection.

## Verification

All mutations tested against the synthetic local backend only. No production writes, migration, deployment, commit or push performed for this change. Production-build browser tests cover the supplied fire-safety sentence, exact phrase/gloss mappings, Arabic diacritics, metadata-only edits, reload persistence, public/Admin viewers, timestamps, existing iframe controls, dictionary popovers, no horizontal overflow, and Arabic regression. For You tests cover Short/Full and raw-translation fallback.

See `e2e/source-language.pw.ts`, `e2e/english-for-you.pw.ts`, the colocated action/viewer tests and `app/lib/transcriptSourceLanguage*.test.ts`.

### Results

- Production Next build using the synthetic backend: passed.
- Chrome: 11/11 browser cases; Firefox: 11/11 browser cases.
- Supplied sentence tested at 320, 375, 390, 430 and 1440px; For You additionally at 768 and 1024px.
- Full Vitest run: 176 files passed, 2 files skipped; 1,237 tests passed, 4 tests skipped.
- Separate SQL persistence suite after the additional metadata regression: 12/12 passed.
- TypeScript no-emit, changed-file ESLint and diff whitespace checks: passed.
- Browser player tests use the isolated YouTube fixture; external YouTube delivery was not newly verified by this task.
- The existing production Spotlight RPC blocker from the previous task is unchanged; no production migration was attempted.

### Files changed for this task

- `app/(admin)/admin/transcripts/AdminTranscripts.test.tsx`
- `app/(admin)/admin/transcripts/AdminTranscripts.tsx`
- `app/(admin)/admin/transcripts/TranscriptGeneration.test.tsx`
- `app/(admin)/admin/transcripts/TranscriptGeneration.tsx`
- `app/actions/forYou.test.ts`
- `app/actions/forYou.ts`
- `app/actions/transcripts.test.ts`
- `app/actions/transcripts.ts`
- `app/components/home/HomeForYouSpotlight.tsx`
- `app/components/home/HomeQuickActions.test.tsx`
- `app/explore/EnglishForYouSegment.tsx`
- `app/explore/ForYouFeed.tsx`
- `app/lib/forYou.ts`
- `app/lib/homeSpotlight.server.test.ts`
- `app/lib/homeSpotlight.server.ts`
- `app/lib/resumableManualImport.test.ts`
- `app/transcripts/[id]/TranscriptViewer.test.tsx`
- `app/transcripts/[id]/TranscriptViewer.tsx`
- `e2e/fixture-server.mjs`
- `app/(admin)/admin/transcripts/TranscriptSourceLanguageField.tsx`
- `app/lib/transcriptSourceLanguage.server.test.ts`
- `app/lib/transcriptSourceLanguage.server.ts`
- `app/lib/transcriptSourceLanguage.test.ts`
- `app/lib/transcriptSourceLanguage.ts`
- `docs/english-source-transcripts.md`
- `e2e/source-language-data.json`
- `e2e/source-language.pw.ts`
