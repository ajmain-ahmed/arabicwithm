# Admin manual transcript import fix

1. **Segment 98 root cause:** a missing final end reached the generic positive-interval/12-hour error. Next-start inference was limited to `timestamp` blocks, so `start_ms`-only blocks also failed. The old branch preferred `duration` over explicit `end_ms`.
2. **Units:** no seconds-to-milliseconds inversion was found in the existing numeric video-duration conversion. Missing values and unsupported clock strings reached the same error. All timing now passes through one milliseconds helper. Legacy numeric `offset`/`duration` and `*_ms` fields remain milliseconds; `*_seconds` and numeric `timestamp` are seconds. Clock strings are converted explicitly.
3. **Inference:** explicit end, explicit duration, next block's start, then final endpoint from transcript duration, usable saved video metadata, or manual duration. Unordered starts and endpoints before the final start have specific errors. The 12-hour guard remains.
4. **Duration requirement:** blank is valid for completely timed transcripts and transcripts with a root duration. If the final endpoint cannot be resolved, preflight shows a friendly message, marks Video duration required, and disables Import. No endpoint is invented. Preflight is read-only, debounced, ignores stale responses, and returns only a summary; the server repeats validation before writing.
5. **Human time:** `10:57` becomes 657,000 ms; `1:10:57` becomes 4,257,000 ms. The form accepts MM:SS / HH:MM:SS, with useful malformed/range errors. JSON supports clock strings in duration fields, root `duration`, and timing fields, alongside existing numeric formats. Token metadata and paragraph grouping remain intact.
6. **YouTube input:** raw eleven-character IDs, watch URLs, youtu.be, shorts and embed URLs are accepted through the existing extractor. The database RPC still constructs the canonical watch URL. Invalid input says Enter a YouTube URL or video ID. Generation functionality is unchanged. The existing oEmbed acquisition supplies title/thumbnail, not duration; automatic reuse reads the existing `youtube_transcripts.duration_seconds`. A live read-only query verified that this column has usable existing values. New videos without known duration still need manual time when the last block lacks an end.
7. **Files:**

   - `app/lib/transcriptTiming.ts` and its new test.
   - `app/lib/manualTranscriptJson.ts` and its test.
   - `app/actions/transcripts.ts` and its test.
   - `app/(admin)/admin/transcripts/AdminTranscripts.tsx` and its test.
   - `e2e/manual-transcript-import.pw.ts` and transcript-only additions to `e2e/fixture-server.mjs`.

8. **Verification:** 114 scoped Vitest tests pass. Four Chrome scenarios pass: 98 start-only blocks with MM:SS, the same with HH:MM:SS, complete timing with blank duration plus early input errors, and human duration inside JSON. Browser checks inspect saved canonical milliseconds/token metadata and reload the imported record. Production build, TypeScript, lint and whitespace checks pass. Logs: `docs/validation/website/manual-import-{tests,browser,build,lint}.log`.

No database schema change, content mutation on the live project, or website publication was performed. Browser imports use isolated synthetic records. Changes are confined to manual import and its verification.
