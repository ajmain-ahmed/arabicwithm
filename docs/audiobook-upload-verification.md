# Website audiobook upload and persistence verification

## Root causes

- The upload authorization route compared the browser Origin with Next's internal request URL. The browser regression reproduced a 403 for a valid same-origin upload when the internal hostname differed. It now compares against the request Host and forwarded protocol; administrator authentication and cross-origin rejection remain enforced.
- Linking a path only changed a draft. Uploading required the chapter-wide Save. Both languages shared one busy flag, and link preparation waited for media metadata (up to ten seconds), repeated storage verification during Save, and rewrote chapter content even for audio-only edits.
- Empty Arabic drafts defaulted to unpublished, and legacy null/missing flags had no fallback.

## Changed files

- `app/(admin)/admin/components/ChapterEditDialog.tsx`: independent language operations, immediate upload/save for existing chapters, dirty-field saving, retries, cancellation, and retained uploaded keys after database failures.
- `app/(admin)/admin/components/ChapterAudioFields.tsx`: explicit language Save, progress/status/errors, retry/cancel/preview, publication defaults.
- `app/lib/uploadChapterAudio.ts`: signed multipart PUT with XMLHttpRequest byte progress, cancellation, timeout, canonical MIME, and confirmed storage response key.
- `app/api/admin/audio-upload/route.ts`: proxy-aware origin validation and scoped signed upload URL response.
- `app/actions/audiobooks.ts`: nullish publication fallback, one authorization check per save, existing database readback, development timing diagnostics without source URLs/tokens.
- `app/actions/storage.ts`: the existing legacy Arabic uploader uses the same publication fallback while preserving explicit false.
- `app/lib/verifyAudioObject.ts`: bounded media-header request timeout.
- `supabase/functions/_shared/audiobookSource.ts`: useful malformed-encoding error in the existing shared canonical resolver.
- Corresponding unit/live tests; `e2e/audiobook-admin.pw.ts`; persistent HTTP fixtures in `e2e/fixture-server.mjs`.

## Schema and storage configuration

No migrations or bucket changes. Live inspection confirmed `audiobooks` is private, its limit is 52,428,800 bytes, and its MIME allowlist supports MP3, M4A, AAC, WAV and OGG. Existing sources/files remain intact during replacement failures.

## Stored values

Supabase sources store `storage_bucket = 'audiobooks'` and a relative `storage_path`, for example `<chapter UUID>/ar/<upload UUID>.mp3`. Full public/authenticated/signed object URLs from this project normalize into bucket/key references. Signed tokens are discarded. External HTTPS sources retain the existing separate `external_url` representation. Arabic and English upserts use `(chapter_id, language)`.

## Progress and automatic saving

Existing chapters upload directly to a scoped signed Storage URL. Percentages come from XMLHttpRequest upload byte events, not timers. The UI distinguishes authorization, transfer, database saving, confirmed saved, and failure. The storage response must confirm the expected object key, and the database must confirm every persisted audio field before showing success. Arabic and English have separate synchronous guards and operation state; the other language remains editable. Failed metadata saves reuse the completed upload on retry.

## Publication defaults

New Arabic and missing/null Arabic publication values default to true. Explicit false survives loading, saving and reopening. English retains its prior default of false. The existing database column default is unchanged because the save action supplies the resolved Boolean explicitly.

## Performance

Pasted-path saves normalize locally and perform one server validation/write/readback flow. They do not upload, await media metadata, rewrite unchanged chapter content, or reload the books catalogue. Unchanged audio languages are not resaved by the chapter Save. Preview signing/media requests occur when Preview is requested.

## Verification

- Browser checks use real website handlers/actions and administrator authorization against an isolated HTTPS Supabase contract fixture. Both languages accept relative/full object URLs, normalize and persist, survive closing/reopening plus page reload, and play real decodable media. Tested at 390 px mobile and desktop sizes.
- Both direct uploads save automatically, fill their own paths, display byte progress and 100% completion, survive reopening/reload, and play. Simulated storage and database failures show errors, preserve the other source and entered values, and recover through retry.
- Unit checks cover intermediate percentages, actual upload cancellation without completion, independent editing during upload, duplicate-submit suppression, reuse of completed uploads on save retry, private signing, MIME normalization, URL decoding, publication defaults and explicit false.
- An opt-in live Supabase test created an isolated temporary chapter, uploaded Arabic/English WAVs through signed upload tokens, saved and independently reloaded real database rows, downloaded identical playable bytes, checked private anonymous access denial, and tested a spaced/parenthesized object name, URL normalization and publication flags. Cleanup removes the temporary chapter and uploads; no existing chapter audio was changed.
- Full suite: 87 files passed, two skipped; 521 tests passed, three skipped. A final targeted run passed 31 tests, including two newly added legacy-publication cases. The audiobook-specific suite passed 60 tests before those two additions. Browser workflows: two passed. The opt-in live Supabase workflow passed. Production build, TypeScript and targeted ESLint passed.

## Limits

New chapters need a persisted chapter ID before uploading, so initial files attach during their first chapter Save. Browser tests use synthetic accounts and fixture storage; the separate live test verifies real Storage/database persistence with the authorization boundary mocked. No real administrator browser session, physical iOS Safari test, or deployment was performed. Upload duration still depends on connection speed and Supabase response time. A cancelled transfer may leave an unreferenced object if Storage accepted it just before cancellation; saved references and previous files remain protected.
