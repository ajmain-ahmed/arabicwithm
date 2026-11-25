# Preparation inputs

Keep these working JSON files in a temporary/private directory, not in Git. The manifest is import bookkeeping; the source chapter JSON is never altered.

```json
{
  "destination": {
    "id": "verified-existing-book-uuid",
    "slug": "verified-book-slug",
    "title": "Verified existing Book title",
    "isCompleted": false,
    "hasChapterPublication": false
  },
  "source": {"url": "verified source URL", "commit": "immutable source revision"},
  "chapters": [
    {
      "number": 2,
      "englishTitle": "Exact source title",
      "arabicTitle": "Exact vocalised Arabic source title",
      "file": "02.json",
      "status": "completed",
      "completionEvidence": "verified plan/progress path or conversation message",
      "sourceUrl": "immutable chapter source URL",
      "blobSha": "observed GitHub blob SHA"
    }
  ]
}
```

`file` is relative to the manifest's directory (absolute paths also work). `slug` is optional per chapter and must be an actual authored chapter slug if supplied. The helper generates `<book-slug>-<original-number>` otherwise. `destination` is a verified snapshot, not an authorization token; it cannot authorize writes. Refresh it and the existing list when executing.

`existing.json` is a complete array of `{id, book_id, slug, title, chapter_number, content}` from the selected Book, including full JSON content. If the Book has no chapters, explicitly provide `[]`. Never pass a partial or publicly filtered chapter list. The helper refuses mixed-Book rows. It emits metadata, content hashes and decisions, not write requests; original payloads stay in their files.
