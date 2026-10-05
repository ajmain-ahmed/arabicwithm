Audiobook admin changes — 5 October 2026

The existing Books → chapter editor → Audiobook tab now offers independent Arabic and English path/URL fields and file pickers. Narrator and manual duration inputs are removed. Existing publication controls and YouTube sources remain available. Either language, both, or neither can be attached.

Storage and source resolution

- Inspected the live schema, bucket configuration, objects, storage policies, book/chapter editors, web player, and audiobook Edge Function before editing.
- The existing `audiobooks` bucket is private, with a 50 MiB direct-upload limit. Admin uploads continue using scoped signed upload tokens issued after same-origin and administrator checks; audio bytes go directly to Supabase.
- Upload paths retain the existing `<chapter UUID>/<ar|en>/<upload UUID>.<extension>` convention. Manually uploaded nested paths, including book/language folders and unusual filenames, are supported without moving or duplicating files.
- `supabase/functions/_shared/audiobookSource.ts` is the shared implementation used by web server actions and the audiobook Edge Function. `app/lib/audiobookSource.ts` re-exports it for the application.
- Paths can include the `audiobooks/` bucket prefix or be relative to that bucket. Own-project public, authenticated, and signed Storage URLs become bucket/path references; their temporary tokens are discarded. Other buckets can be linked using their own-project Storage URLs. External HTTPS audio URLs remain external URLs. Expiring signed links from another Supabase project are rejected with guidance to use a stable public URL.
- Public buckets produce public playback URLs; private buckets produce fresh 15-minute signed URLs after the existing playback entitlement checks. No privileged keys are exposed to the browser.
- The same existing HTML audio player consumes resolved URLs regardless of how the source was attached. Media CSP permits HTTPS audio and local blob metadata loading; other CSP directives are unchanged.
- Server-side object verification checks actual stored audio headers, rather than relying on filenames. Direct uploads support MP3, M4A, AAC, WAV, and OGG. Existing linked objects are not rejected solely for exceeding the direct-upload size limit.
- Replace/remove updates only the language-specific database reference and preserves underlying storage files. Cleanup remains available for new, unreferenced staged uploads created by the dialog. Failed saves retain successful uploads for retry.

Duration and compatibility

- `app/lib/audioMetadata.ts` loads browser audio metadata for selected files and resolved links, rounds finite positive durations to seconds, and releases local object URLs/network resources.
- Metadata failures or a ten-second timeout produce unknown/null duration and allow saving. The form reports linking, metadata loading, upload/save activity, failures, and linked/ready state.
- Legacy storage paths without a bucket default to `audiobooks`. Old Storage URL values are normalized on playback and subsequent saves. Existing YouTube sources and historical narrator values remain supported; new records do not receive a fake narrator.
- Language-specific upserts retain the existing unique `(chapter_id, language)` key. Save/upload/remove handlers prevent repeated concurrent submissions, and partial failures retain the created chapter ID.

Database and deployment

- Applied `supabase/migrations/20261005090847_audiobook_sources.sql` to the connected project. Its filename matches the recorded remote migration version.
- Added nullable `storage_bucket` and `external_url` to `book_chapter_audio`; extended the existing source-type/source-consistency constraints for external audio. Existing narrator, duration, timestamp, language, chapter association, grants, and RLS structures are retained. No bulk content migration was performed.
- Expanded only the existing bucket's allowed audio MIME types. The bucket remains private, with its original size limit and policies.
- Updated and deployed `audiobook-library` using the shared resolver, retaining JWT verification and its existing authentication/entitlement checks.
- Website code is updated locally; this work did not deploy the Next.js website to Vercel.

Files changed

- Admin form: `app/(admin)/admin/components/ChapterAudioFields.tsx`, `ChapterEditDialog.tsx`, and `ChapterEditDialog.test.tsx`.
- Server/storage: `app/actions/audiobooks.ts`, `audiobooks.test.ts`, `audiobookSources.live.test.ts`, `storage.ts`, and `app/api/admin/audio-upload/route.ts`.
- Player: `app/books/[book]/[chapter]/ChapterAudioPlayer.tsx`.
- Utilities/schema types: `app/lib/audiobookSource.ts`, `audiobookSource.test.ts`, `audioMetadata.ts`, `audioMetadata.test.ts`, `audioUpload.ts`, `uploadChapterAudio.ts`, `verifyAudioObject.ts`, `verifyAudioObject.test.ts`, `audiobookMigration.test.ts`, and `app/lib/supabase/database.types.ts`.
- Configuration/backend: `next.config.ts`, `scripts/setup-audiobook-storage.mjs`, `supabase/functions/_shared/audiobookSource.ts`, `supabase/functions/audiobook-library/index.ts`, and the migration above.
- This verification report.

Verification

- Production Next.js build passed; TypeScript and ESLint checks on changed application files passed.
- Broad regression suite: 86 test files passed, one opt-in live-test file skipped; 495 tests passed and two opt-in tests skipped.
- Final focused audiobook suite: 8 test files, 55 tests passed. Covers no audio, pasted Arabic/English paths, both languages, both direct-upload authorizations, metadata extraction/failure, retries, replacement, removal (including unsaved drafts), legacy paths, own-project URL normalization, public/private resolution, external URLs, invalid input, and authorization boundaries.
- Live integration test passed using generated, browser-playable one-second WAV bytes: both language uploads through anonymous-client signed upload tokens, stable path persistence, signed playback downloads, anonymous unsigned access denial, nested unusual filenames, signed-URL normalization, nullable duration, replacement uniqueness, legacy null-bucket playback, invalid source rejection, and language-specific removal while retaining the object.
- Live tests use only temporary chapters/objects and clean them in teardown. Follow-up SQL confirmed zero temporary test chapters/objects and the bucket still private. No historical audiobook records or uploaded files were changed.
- Browser metadata behavior is covered by automated audio-element tests; an authenticated visual browser walkthrough and listening session were not performed.

Existing issues discovered

- The live database had no linked audiobook records at inspection time, despite existing manually uploaded audio objects. Those objects were preserved.
- Unrelated Supabase security advisor warnings remain: mutable function search path, an extension in `public`, broadly executable SECURITY DEFINER functions, and disabled leaked-password protection. They were not altered as part of this audiobook change. See [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [extension schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [public function execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
