# Manual Import English-group language

Selecting the canonical English group (`5b98c563-5c35-4696-98e1-06aa000eb622`) or any descendant immediately sets Original Audio Language to English. The administrator no longer needs to select English twice.

`AdminTranscripts.tsx` retains the language control and locks it while an authoritative English group is selected. Other groups and Ungrouped retain manual selection. A newly auto-filled value remembers the preceding language: leaving English restores that value. A prior manually selected English value stays English. Opening an existing edit form or saved draft does not rewrite its stored content or infer a new value merely from opening the dialog.

Group identity and descendant traversal live in `app/lib/transcriptGroupTree.ts`; For You reuses the same implementation through `forYouGroups.ts`. Display names, renamed groups and arbitrary names such as English Practice do not determine classification. New groups created beneath English use the updated returned tree immediately.

The authenticated save paths normalize stale client language to English for English-group imports, draft saves and JSON saves. Metadata-only group moves set the existing audio metadata before the version-checked move. Moving away from English occurs before an explicit Arabic metadata correction, using the returned version. Audio-only saves reject Arabic while the record still belongs to English. Existing authorization, processing-lease and concurrency checks remain in force. A conflicting move may require reopening the form; it never rewrites canonical content to compensate.

No new `source_language` column or competing classification system was added. The existing language metadata is reused. No transcript sentence/token JSON fields are modified or swapped by group selection or metadata-only saves; original JSON storage and token content are verified unchanged.

Validation:

- 117 focused tests initially passed, followed by the final full regression suite of 1,312 passed / 4 skipped.
- Four production-build Chrome/Firefox import/edit scenarios passed: canonical root and subgroup each automatically select English, import as English, reload correctly, and move back to Ungrouped before saving an Arabic correction.
- Backend reads verify the saved existing language metadata and unchanged token content and `original_json`.
- Identity, nested groups, English-looking unrelated names, change-away restoration, manual preference preservation, existing edit initialization, guarded move and conflicting server input are covered by unit tests.
- Screenshots: `docs/validation/admin-english-group/`.

Task files: `AdminTranscripts.tsx` and its test; `app/actions/transcripts.ts` and its test; `app/lib/transcriptGroupTree.ts` and its test; `app/lib/forYouGroups.ts`; `e2e/admin-english-group.pw.ts`; browser configuration and these verification artifacts. Some shared files also contain the subsequent reliability improvements documented separately.

Selecting the English group automatically sets Original Audio Language to English. The administrator no longer needs to select English twice. No transcript JSON content fields are modified by this behavior. This Admin change requires no migration and has not been deployed by this session.
