# Audiobook setup

Audiobook metadata and playback progress are introduced by the `chapter_audiobooks` Supabase migration. Apply pending migrations through the normal deployment workflow:

```bash
npx supabase db push
```

Create or reconcile the private Storage bucket once per Supabase project:

```bash
npm run setup:audiobooks
```

The setup command reads `.env.local`, requires the service-role key, and configures `audiobooks` as a private bucket limited to MP3/M4A files of at most 50 MB. Do not make this bucket public. Only admins can obtain a signed upload token from `/api/admin/audio-upload`. The browser sends the file directly to Storage using that token; large files do not pass through a Next.js/Vercel request body. Listener signed URLs still require audiobook entitlement. `anon` and `authenticated` have no direct table grants.

In Admin → Books, create or edit a chapter and open the Audiobook tab. Arabic Audio and English Audio each have their own file/source, narrator, duration, and publication controls. Select either or both files before saving a new chapter. Save creates the chapter, uploads the selected files, verifies stored size and file headers, and saves the language-specific references. If a transfer or metadata write fails, the dialog stays open and Save retries using the same chapter ID. A chapter may already exist after a partial failure; retry in the open dialog.

Apply `20261004092444_chapter_audio_languages.sql` with the code release. It labels existing audio and playback progress as Arabic without changing storage paths, and allows one source/progress entry per language. New paths are `{chapterId}/{ar|en}/{uploadUuid}.{mp3|m4a}`. Existing `{chapterId}/audio.mp3` and `.m4a` paths remain supported. Language follows the chapter's book association; moving a chapter does not require moving its files. Existing records default to Arabic because their previous schema did not record a language; manually relabel any known English-only legacy recordings when deploying.

Library covers show a construction badge at the top left for unreleased books and a headphone badge whose accessible label lists the available narration languages from the same cached availability map used by the audio filter. The headphone badge moves to the top right when both badges are present. Unreleased books offer release reminders but no My List control. Returning listeners resume at their exact saved media position; timing data restores the corresponding text page. Page-based seeks happen only when the listener intentionally navigates or seeks. Timed readers show slider ticks at each page's first narrated segment, skipping un-narrated pages without changing exact resume. Desktop shows `P1`, `P2`, etc. without the panel's Page selector; mobile uses a compact Page selector and time above the track. Page/menu selections and completed slider drags save immediately, while continuous slider movement does not write on every pixel. Periodic, seek, pause and unmount writes are serialized within the player so an older action cannot finish last. The Zustand audiobook store keeps session position, timing maps and expiring signed playback URLs in memory; only user/chapter/language/position/completion entries persist in a localStorage outbox. Failed writes retry on mount/reconnect, and sign-out clears cached private URLs. Timestamp buttons seek directly, and Settings offers Restart chapter alongside the speed slider. Reader Settings provides a 0.5×–2× speed slider in 0.25 steps; the dedicated Listen page retains its speed menu.

Apply `20261121124438_audiobook_timing_data.sql` with the timing-aware reader release. It adds nullable per-language `book_chapter_audio.timing_data` without changing existing audio or progress rows. For a legacy chapter, preview its saved storage audio in Admin → Books → Audiobook, then use Sentence timestamps to capture or fine-tune each block's start/end and replay individual segments. Saving validates the ordered millisecond segments, stores the actual duration, and attaches a chapter-content hash. Playback ignores timings after the chapter text changes; replacing an audio source clears its old timings. Arabic and English recordings always have separate maps.

Timed line-view blocks display their start timestamps and share the episode transcript's active-block frame, with extra separation between vocalised Arabic and its translation. Timed playback highlights the active sentence, follows reader pagination, restores the text position corresponding to saved audio progress, and seeks loaded audio when Previous/Next Page selects another page. Chapters without valid timings retain the existing playback behavior. If the current text language has no recording, Audio remains visible and falls back to the other published narration without changing the text language. The two structured chapters require a separate stable block-ID mapping and are not eligible for the legacy timing editor.

Uploaded audio remains unavailable until both the record is published and the listener has current AWM+ access. The migration does not change RLS, grants, bucket visibility, or authentication. Timing-aware website playback uses Server Actions; no additional Edge Function deployment is required.

To check signed storage uploads with temporary 6 MB test objects (cleaned up afterward), run:

```bash
node --env-file=.env.local scripts/check-audio-upload.mjs
```
