# Manual JSON import and shared audiobook report

The old website manual dialog accepted Arabic SRT/VTT plus separate optional
English subtitles. It now uses one large Transcript JSON field, based on the
existing AdminTextField/Show JSON-entry UI pattern. The Show editor, schema,
parser, storage, generation and timing are unchanged.

Canonical manual input:

```json
{
  "content": [
    { "text": "حياكم الله", "offset": 0, "duration": 5270, "english": "Welcome" }
  ]
}
```

Offsets/durations are integer milliseconds. End is offset + duration. English
remains optional, matching the existing backend. Validation reports syntax and
segment errors, enforces size/text/timing bounds, sorts chronologically and calls
the existing admin_import_youtube_transcript RPC. No conversion step or separate
language file is required. Publication defaults ON for each new form and honours
an explicit opt-out. Expected errors return as data to survive production Server
Action error redaction. Shared SRT/VTT parsing and its legacy server entry remain.
The admin list/editor tolerate the older schema without website_generation;
the unrelated automatic-generation migration/worker were not deployed here.

## MP3 failure and persistence

The upload succeeds independently of the metadata save. The website saves a
language and uses conflict key (chapter_id, language), but the live table lacked
language and retained UNIQUE(chapter_id). The live API reproduced HTTP 400 / 42703:
`column book_chapter_audio.language does not exist`.

The existing tested 20261004092444_chapter_audio_languages.sql migration was applied
to whbxgwucsoguqzpnpzjd. The same read then returned HTTP 200. Existing references
and paths remain intact; old rows default Arabic. Audio/progress are now isolated
by language. Save errors also explain schema drift where encountered.

The permanent reference is book_chapter_audio.storage_path, with chapter_id and
language. The book relationship is chapters.book_id. New paths are
{chapterId}/{ar|en}/{uploadUuid}.{mp3|m4a}; legacy paths are supported. No permanent
signed URL or separate website/mobile audio record is created. Existing validation
checks real MP3/M4A headers, non-empty size up to 50 MB and stored bytes. Replacement
commits the new association before deleting the previous owned file. Removal clears
the association before deleting the owned file. Partial failures retain paths for
retry in the open dialog. Unrelated assets are untouched.

## Playback and security

Website: the existing ChapterAudioPlayer now supplies a compact Audio action next
to the reader view/settings controls. It appears only for attached published
audio, selects the reader language with a labelled fallback, and opens the existing
native audio controls for play/pause/progress/seek. Page opening never starts audio.
A click requests secure access and initiates playback when browser policy permits;
otherwise the native Play control remains available. Error refresh preserves position;
closing pauses playback. Chapter/language keys prevent reusing another chapter's player.

Native app location:
C:\Users\Muttaqi Ahmed\Desktop\arabic-with-m-app-main\arabic-with-m-app-main.
The reader now has a compact Audio/Pause icon beside Settings. Availability and
playback use the shared chapter ID, language and backend source. There was no MP3
player; just_audio 0.10.5 was added and pinned after inspection. Existing YouTube
playback is reused for YouTube sources. Play/pause, URL refresh, progress saving,
loading and actionable errors are handled without changing reading modes or cache
schemas. See [just_audio documentation](https://pub.dev/packages/just_audio/versions/0.10.5).

The new audiobook-library Edge Function is deployed, version 1, with gateway JWT
verification enabled. It additionally verifies tokens using Auth getUser. Published
availability reveals no private path/link. Playback/progress require the canonical
admin role or an active unexpired subscription, matching website AWM+ policy.
Signing uses server-only credentials and 15-minute URLs; progress uses the verified
user ID. The audiobooks bucket remains private. RLS, grants and storage policies
were not relaxed. No new SQL migration or Show data migration was needed.

## Word Search and files

Desktop navigation was already correct. Remaining responsive website hamburger
and bottom-navigation entries were removed. Home Quick Actions still opens the
existing /word-search feature for guests and signed-in users. Native navigation
was not changed.

Website files changed:

- AdminTranscripts.tsx and its new component test; new TranscriptJsonField.tsx.
- manualTranscriptJson.ts and its tests; actions/transcripts.ts and boundary tests.
- actions/audiobooks.ts.
- books/[book]/[chapter]/page.tsx, ChapterReader.tsx, ChapterAudioPlayer.tsx and tests.
- MobileBottomNav.tsx, navbar/MobileDrawer.tsx and NavigationAccess.test.tsx.
- supabase/functions/audiobook-library: index.ts, handler.ts, handler_test.ts,
  deno.json and deno.lock.

Native files changed for audio only:

- lib/data/repositories/audiobook_repository.dart.
- lib/providers/audiobook_provider.dart.
- lib/features/books/audiobook_controller.dart, book_audio_action.dart,
  book_reader_screen.dart.
- test/audiobook_test.dart, pubspec.yaml and pubspec.lock.

Unrelated pre-existing native working-tree changes were preserved.

## Verification and remaining work

- Website suite: 434 tests across 83 files passed. TypeScript, ESLint, production
  build and whitespace checks passed.
- Native focused audio/reader/settings/repository tests: 15 passed; analysis clean;
  new Dart files formatted.
- Audiobook Edge: 5 tests passed; Deno type check/lint passed.
- Migration tests cover legacy references, language isolation, uniqueness,
  persistence and blocked direct authenticated reads.
- Live Arabic MP3/English M4A signed-upload checks passed for 6 MB files, stored
  size, private range reads and anonymous denial. Temporary objects were removed.
- Anonymous Edge playback and direct private metadata reads returned 401.
- No connected browser or mobile device was available for visual/real media QA.
  Native control tests used a fake engine; storage access was tested live.

The security advisor still reports pre-existing unrelated findings, including
[mutable search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[existing exposed definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Unrelated security configuration was left intact.

Backend schema and mobile endpoint are live. Deploy the website and rebuild/release
the native app to expose the new controls, then verify a real MP3 in an authenticated
browser and Android/iOS, including pause/resume and expired-link retry. No existing
user book/chapter/audio records were modified during testing. No commit or push.
