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

Uploaded audio remains unavailable until both the record is published and the listener has current AWM+ access. The migration does not change RLS, grants, bucket visibility, or authentication. No Edge Function is involved.

To check signed storage uploads with temporary 6 MB test objects (cleaned up afterward), run:

```bash
node --env-file=.env.local scripts/check-audio-upload.mjs
```
