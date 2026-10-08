# Manual transcript groups and search

Admin → Transcripts now lists only manual JSON imports. Shows, episode transcripts and provider-generated/imported transcripts retain their existing canonical records and public/shared-library behaviour.

## Search

The previous listing used a literal `ILIKE` title substring. Arabic diacritics, presentation forms, alif/ya/kaf variants, punctuation and repeated whitespace could therefore prevent matching visually equivalent titles. The query also had no manual-origin boundary. Its 60-second browser cache could retain an old search snapshot.

`admin_list_manual_transcripts` now searches normalised title, group and parent-group names on the server, before pagination. It normalises NFKC forms, Arabic diacritics/tatweel, common alif/ya/kaf variants, case, punctuation and spacing. Display titles and JSON are untouched. Search text uses literal substring matching rather than interpolated SQL or wildcard patterns. Punctuation-only queries behave like an empty search.

Each list request returns at most 30 rows plus matching totals and database-wide group counts. It selects only lightweight metadata, never transcript JSON. Changing search returns to page one and clears the active group filter, so a global title match remains visible even when its group is collapsed. Selecting a group after searching combines both constraints. Main-group filters include direct assignments and immediate subgroups. Browser requests always refresh the data; an old response cannot overwrite a newer search. Saves and group changes refresh the listing without reloading the page.

## Database model and safety

Apply `supabase/migrations/20261008161532_transcript_groups_manual_library.sql` after the existing transcript migrations, including `20261008133217_admin_transcript_json_edit.sql`. The website change requires the new migration; it fails with an explicit configuration error instead of falling back to the mixed shared listing.

- `transcript_groups` stores main groups and subgroups. A serialised hierarchy trigger enforces a maximum of two levels. Sibling names are unique case-insensitively.
- `admin_manual_transcripts` stores one optional group assignment per transcript. No group fields are added to transcript JSON.
- Backfill requires **both** `provider='manual'` and `source_origin='website_admin_transcript'`, with no episode relationship or matching episode YouTube ID. All eligible existing imports start Ungrouped. Ambiguous records stay unchanged.
- Listing rechecks this boundary, so a transcript subsequently attached to an episode cannot appear in manual management.
- Both new tables have RLS enabled and client-role privileges revoked. Server actions authenticate Admin access; service-role-only RPCs independently check the actor's database admin role. No new public access policies are introduced.
- Foreign keys restrict deleting any group with assignments or subgroups. The UI enables deletion only for empty groups. Deleting a group cannot delete transcripts.
- Import and Edit wrap the existing JSON validation/indexing RPCs in one transaction. An invalid assignment, video conflict, invalid duration or indexing failure rolls back the whole operation. Duplicate imports direct the operator to Edit.
- Existing channel metadata is preserved while Group replaces its visible control. Edit can change the YouTube ID/URL, duration and assignment without changing transcript identity or existing library relationships. A target video belonging to an episode is rejected.

The live read-only inspection found 21 proven manual imports, 106 curated episode transcripts and one Supadata import. No live records or schema were changed while implementing this feature. This migration does not depend on the optional `website_generation` column.

## Interface and duration

Groups expand to show the selected group's paginated transcripts, with actual database counts. Import and Edit offer the same dropdown, including Ungrouped and `Parent / Subgroup` labels. A group can be created from the form without losing unsaved JSON.

Title, YouTube URL/ID, Group and Video Duration appear in a responsive metadata grid above the existing JSON editor. Saved duration is populated in clock format, retaining millisecond precision. `MM:SS` and `HH:MM:SS` remain supported alongside the previously requested explicit minutes mode. Fully timed JSON does not require duration; start-only timing uses the established actual-video/manual-fallback resolution. Explicit durations cannot end before the transcript. Clearing the field leaves existing duration metadata unchanged when the JSON is fully timed.

## Verification

Focused regression tests cover normalised Arabic/English search, pages beyond the first, group-name search, Show exclusion, exact counts, hierarchy constraints, create/rename/delete, Import assignment, moves to groups and Ungrouped, persistence, atomic rollback, client-role denial, real JSON indexing and enriched tokens, unsaved form preservation, duration formats and existing public transcript/Shows readers.

The production migration and application deployment must be completed before these controls are available on the live website. The migration does not deploy automatically through `next build`.
