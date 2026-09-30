# Audiobook setup

Audiobook metadata and playback progress are introduced by the `chapter_audiobooks` Supabase migration. Apply pending migrations through the normal deployment workflow:

```bash
npx supabase db push
```

Create or reconcile the private Storage bucket once per Supabase project:

```bash
npm run setup:audiobooks
```

The setup command reads `.env.local`, requires the service-role key, and configures `audiobooks` as a private bucket limited to MP3/M4A files of at most 100 MB. Do not make this bucket public. Admin uploads and listener signed URLs are created by server actions with the service role; `anon` and `authenticated` have no direct table grants.

In Admin → Books, edit a chapter and open the Audiobook tab. Choose an uploaded audio file or YouTube ID, add optional narrator/duration metadata, and publish it. Uploaded audio remains unavailable until both the record is published and the listener has current AWM+ access.
