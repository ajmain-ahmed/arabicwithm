# Transcript timing and import reliability

Import preflight, Import save and Edit save all use the existing server-side
`normaliseManualTranscriptJson` through `resolveManualJson`. Storage remains
the existing normalised `raw_transcript.content[]`, segments, canonical token
paragraphs and search index. This change needs no new database migration.
The earlier Edit JSON migration remains a prerequisite for its save RPC.

## Timing rules

- Timestamp strings keep the existing MM:SS / HH:MM:SS interpretation, including
  fractional seconds. Explicit millisecond and second fields retain their units.
- Decreasing starts are rejected with the original source segment number. The
  parser does not sort bad input into validity or invent replacement timestamps.
- Consecutive equal starts are grouped before inferred-end validation. Compatible
  groups concatenate Arabic, translations and tokens in original order. Every
  token property is retained. Identical or complementary metadata is retained;
  plain Arabic fields are combined. Conflicting paragraph/ID/speaker or other
  metadata, mixed mapped/unmapped captions, and inconsistent explicit ends cause
  a precise duplicate-timestamp warning, with the affected source numbers.
- For start-only groups, the next distinct supplied start is the end. Existing
  explicit ends/durations remain authoritative. The final unknown end uses the
  video duration. A duration is unnecessary when the final end is already known.
- Invalid middle timestamps and malformed metadata are reported before looking
  up duration. Missing duration is a separate final-segment condition.

## Actual YouTube duration

The server resolves a validated YouTube ID from the supplied URL/ID (or the stored
ID in Edit). It requests metadata only if the final endpoint is unknown.

If `YOUTUBE_DATA_API_KEY` is configured on the server, it calls the official
[videos.list API](https://developers.google.com/youtube/v3/docs/videos/list) for
`contentDetails.duration`. The key is never returned to the client or logged.
Without a key, or after an API failure, it tries the video's public YouTube watch
page, parsing the actual player JSON's `videoDetails.lengthSeconds` for the exact
video ID. Unplayable, live, mismatched, malformed and unavailable responses fail
closed. Requests have timeouts, response-size limits and fixed allowed hosts.
Lookup results are cached briefly and concurrent requests share the same lookup.

If lookup is unavailable, the existing duration control permits manual input:
**MM:SS / HH:MM:SS** retains the old behaviour; **MM / HH:MM** explicitly selects
minutes or hours:minutes. For example, `10:57` remains 10 minutes 57 seconds in
clock mode, while `1:03` means 1 hour 3 minutes in minutes mode. A valid previously
saved duration can still supply the final endpoint when no manual value is given.
A retrieved actual duration that precedes the last start is reported as an invalid
interval; it is not stretched or replaced to make validation pass.

Format JSON remains a syntax-only operation. Fully timed Import/Edit do not query
YouTube or require manual video duration. Server validation is repeated before
the existing import/update RPC persists anything.

## Representative regression JSON

`app/lib/fixtures/transcript-start-only.json` is a small, explicitly synthetic
test fixture. It is not a reconstruction of the unavailable 207-segment upload.
Its two consecutive 08:22 blocks merge without shifting that timestamp; the next
distinct start, 08:24.567, yields a 2,567 ms interval. Tests assert full token
equality, translations, grouping metadata and millisecond preservation. Additional
tests cover multiple transcript sizes without a count-specific implementation.

The targeted timing, Import/Edit, YouTube metadata and transaction suites pass
155 tests. TypeScript, targeted lint and the production build pass. Metadata HTTP
success/failure and the optional API-key path have mocked regression coverage;
A live read-only lookup also succeeded for the public test video Dgj9fQYbCZY, returning its YouTube metadata duration of 755 seconds. This check did not use or recreate the missing original upload.

No website deployment or live transcript mutation was performed.
