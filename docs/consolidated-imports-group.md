# Single Imports group

The original Imports task preserved the legacy Imported group. On 2 November 2026 the user requested one automatic folder, so migration `20261102105026_consolidate_imports_group` retires the verified empty legacy Imported group and keeps Imports (`app_imports`).

Gemini registration now resolves Imports directly. The unchanged system-group protection is restored within the same locked migration transaction. No transcript content, canonical ID, personal library reference, publication flag, RLS policy or access grant changes.

The existing rollback SQL suite was updated to reject a duplicate legacy group. It passed before and after application, including synthetic registration, completion, pagination, manual exclusion and permissions. A full canonical-row fingerprint matched during rehearsal. The live service-role REST query returned just one automatic group, Imports, with both existing records. Canonical count remains 171; both app records remain private.

This database fix is live and needs no frontend deployment. No commit or push was made. The earlier report describes the original implementation before this user-requested consolidation.
