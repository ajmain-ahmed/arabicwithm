# Phrase quality overhaul — audit checkpoint

Request: 27 November 2026. Preserve all presentation and original educational content.

The verified production project is `whbxgwucsoguqzpnpzjd`. Initial inventory:
130 canonical phrase records and 130 linked examples. Full original phrase rows,
linked example rows and daily schedules were saved before any write in the
ignored local `artifacts/phrase-quality/before.json` snapshot.

Confirmed defects:

- `extractPhrases` trusts authored `entry_type=phrase` / `pos=phrase` labels and
  assigns 0.99 confidence without independent semantic validation.
- The lexical discovery script considers multiword dictionary entries as
  candidates. These require semantic review, not automatic canonical approval.
- `private.home_eligible_phrases` checks Arabic/English text presence and basic
  placeholders only; it has no semantic approval or rejection gate.
- The 27 November schedule selected ID 81, basketball. The schedule alone was
  corrected to existing ID 2, “How dare you”, with a conditional update matching
  the original invalid selection. No phrase or source content was changed.
- Existing Arabic mode relies on saved preferences. The current sitemap has
  English URLs only; independently addressable Arabic URLs, reciprocal language
  alternatives and page-specific Arabic metadata still need implementation.

Work remains: contextually review all 130 records; introduce durable review and
recoverable retirement; update every phrase consumer and ingestion path; rerun
corpus discovery and review new candidates; implement Arabic URL/metadata/sitemap
support; test appearance, semantic gates and indexing; deploy and verify.

Do not describe this checkpoint as a completed audit or report invented retained,
rejected, duplicate or newly discovered counts. The production eligibility view
and extraction logic have not yet been changed. The original canonical phrase
records and source references remain intact. Home phrase caching can retain the
previous selection for up to the existing five-minute cache interval.
